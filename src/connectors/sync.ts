/**
 * Job sync service - orchestrates fetching from all sources
 */

import {
  getAllSources,
  createJob,
  getJobByHash,
  updateSourceLastSync,
  initializeDatabase,
} from '../db/client';
import { RSSConnector } from './rss';
import { GreenhouseConnector, createGreenhouseConnectorFromUrl } from './greenhouse';
import { createRssLimiter, createApiLimiter } from '../utils/rate-limit';
import { logger } from '../utils/logger';
import { audit } from '../utils/audit';
import { getConfig } from '../utils/config';
import type { JobSource } from '../types';

/**
 * Sync result for a single source
 */
export interface SyncResult {
  sourceId: number;
  sourceName: string;
  success: boolean;
  jobsFound: number;
  jobsNew: number;
  jobsSkipped: number;
  error?: string;
}

/**
 * Overall sync results
 */
export interface SyncResults {
  sources: SyncResult[];
  totalFound: number;
  totalNew: number;
  totalSkipped: number;
  duration: number;
}

/**
 * Sync jobs from all enabled sources
 */
export async function syncAllJobs(): Promise<SyncResults> {
  const startTime = Date.now();

  logger.info('Starting job sync from all sources');

  // Initialize database if needed
  try {
    initializeDatabase();
  } catch (error) {
    logger.warn('Database already initialized or error during initialization:', error);
  }

  // Get all enabled sources
  const sources = getAllSources(true);

  if (sources.length === 0) {
    logger.warn('No enabled job sources found');
    return {
      sources: [],
      totalFound: 0,
      totalNew: 0,
      totalSkipped: 0,
      duration: Date.now() - startTime,
    };
  }

  logger.info(`Found ${sources.length} enabled sources`);

  // Sync each source
  const results: SyncResult[] = [];

  for (const source of sources) {
    const result = await syncSource(source);
    results.push(result);
  }

  // Calculate totals
  const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0);
  const totalNew = results.reduce((sum, r) => sum + r.jobsNew, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.jobsSkipped, 0);
  const duration = Date.now() - startTime;

  logger.info(`Job sync completed: ${totalNew} new jobs, ${totalSkipped} skipped, ${duration}ms`);

  // Audit log
  audit('job_sync', 'source', null, false, {
    sourcesProcessed: sources.length,
    totalFound,
    totalNew,
    totalSkipped,
    duration,
  });

  return {
    sources: results,
    totalFound,
    totalNew,
    totalSkipped,
    duration,
  };
}

/**
 * Sync jobs from a single source
 */
async function syncSource(source: JobSource): Promise<SyncResult> {
  const result: SyncResult = {
    sourceId: source.id,
    sourceName: source.name,
    success: false,
    jobsFound: 0,
    jobsNew: 0,
    jobsSkipped: 0,
  };

  try {
    logger.info(`Syncing source: ${source.name} (${source.type})`);

    // Create appropriate connector based on source type
    const connector = createConnector(source);

    if (!connector) {
      throw new Error(`Unable to create connector for source type: ${source.type}`);
    }

    // Fetch and normalize jobs
    const normalizedJobs = await connector.fetchAndNormalize();
    result.jobsFound = normalizedJobs.length;

    logger.info(`Fetched ${normalizedJobs.length} jobs from ${source.name}`);

    // Save jobs to database (de-duplicate by hash)
    for (const job of normalizedJobs) {
      try {
        const existing = getJobByHash(job.hash);

        if (existing) {
          // Job already exists, skip
          result.jobsSkipped++;
          logger.debug(`Skipping duplicate job: ${job.title} at ${job.company}`);
        } else {
          // New job, insert
          createJob(job);
          result.jobsNew++;
          logger.debug(`Added new job: ${job.title} at ${job.company}`);
        }
      } catch (error) {
        logger.error(`Error saving job from ${source.name}:`, {
          job: { title: job.title, company: job.company },
          error,
        });
      }
    }

    // Update last sync timestamp
    updateSourceLastSync(source.id);

    result.success = true;
    logger.info(
      `Completed sync for ${source.name}: ${result.jobsNew} new, ${result.jobsSkipped} skipped`
    );
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
    logger.error(`Error syncing source ${source.name}:`, error);
  }

  return result;
}

/**
 * Create appropriate connector for a source
 */
function createConnector(source: JobSource): RSSConnector | GreenhouseConnector | null {
  const config = getConfig();

  switch (source.type) {
    case 'rss': {
      const rateLimiter = createRssLimiter(config.rateLimits.rss);
      return new RSSConnector(source.id, source.name, source.url, rateLimiter);
    }

    case 'api': {
      const rateLimiter = createApiLimiter(config.rateLimits.api);

      // Determine which API based on URL or config
      if (source.url.includes('greenhouse.io')) {
        const companyName = (source.config['companyName'] as string) || source.name;
        return createGreenhouseConnectorFromUrl(
          source.id,
          source.name,
          source.url,
          companyName,
          rateLimiter
        );
      }

      // Add Lever and other API connectors here when implemented
      logger.warn(`Unsupported API type for source: ${source.name}`);
      return null;
    }

    case 'html':
      // HTML scraping connector not yet implemented
      logger.warn(`HTML scraping not yet implemented for source: ${source.name}`);
      return null;

    default:
      logger.error(`Unknown source type: ${source.type}`);
      return null;
  }
}

/**
 * Sync a specific source by ID
 */
export async function syncSourceById(sourceId: number): Promise<SyncResult> {
  const sources = getAllSources(false);
  const source = sources.find((s) => s.id === sourceId);

  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  if (!source.enabled) {
    logger.warn(`Source is disabled: ${source.name}`);
  }

  return syncSource(source);
}
