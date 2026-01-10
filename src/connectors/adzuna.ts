/**
 * Adzuna API Connector
 * Aggregates jobs from LinkedIn, Indeed, Monster, and other sources
 * Docs: https://developer.adzuna.com/
 * Free tier: 1,000 calls/month
 */

import axios from 'axios';
import { BaseConnector, RawJob } from './base';
import type { RateLimiter } from '../utils/rate-limit';
import { logger } from '../utils/logger';

interface AdzunaJob {
  id: string;
  created: string;
  title: string;
  location: {
    area: string[];
    display_name: string;
  };
  description: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  company: {
    display_name: string;
  };
  category: {
    label: string;
    tag: string;
  };
  redirect_url: string;
  contract_type?: string;
  contract_time?: string;
}

interface AdzunaApiResponse {
  results: AdzunaJob[];
  count: number;
  mean?: number;
  __CLASS__?: string;
}

export interface AdzunaSearchParams {
  query: string; // Search keywords
  location?: string; // Location name or coordinates
  country?: string; // Country code (us, uk, ca, au, etc.)
  category?: string; // Job category tag
  sort_by?: 'relevance' | 'date' | 'salary';
  results_per_page?: number; // Max 50
  page?: number;
  max_days_old?: number; // Filter by days old
  salary_min?: number;
  salary_max?: number;
  full_time?: '1' | '0';
  part_time?: '1' | '0';
  contract?: '1' | '0';
  permanent?: '1' | '0';
}

export class AdzunaConnector extends BaseConnector {
  private appId: string;
  private appKey: string;
  private searchParams: AdzunaSearchParams;
  private rateLimiter?: RateLimiter;

  constructor(
    sourceId: number,
    sourceName: string,
    appId: string,
    appKey: string,
    searchParams: AdzunaSearchParams,
    rateLimiter?: RateLimiter
  ) {
    super(sourceId, sourceName);
    this.appId = appId;
    this.appKey = appKey;
    this.searchParams = searchParams;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Fetch jobs from Adzuna API
   */
  async fetchJobs(): Promise<RawJob[]> {
    try {
      if (this.rateLimiter) {
        await this.rateLimiter.waitAndProceed();
      }

      logger.info(`Fetching jobs from Adzuna: ${this.sourceName}`);
      logger.debug(`Search params: ${JSON.stringify(this.searchParams)}`);

      const country = this.searchParams.country || 'us';
      const page = this.searchParams.page || 1;
      const apiUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`;

      const params: Record<string, string> = {
        app_id: this.appId,
        app_key: this.appKey,
        results_per_page: (this.searchParams.results_per_page || 50).toString(),
        what: this.searchParams.query,
      };

      // Add optional params
      if (this.searchParams.location) params['where'] = this.searchParams.location;
      if (this.searchParams.category) params['category'] = this.searchParams.category;
      if (this.searchParams.sort_by) params['sort_by'] = this.searchParams.sort_by;
      if (this.searchParams.max_days_old) params['max_days_old'] = this.searchParams.max_days_old.toString();
      if (this.searchParams.salary_min) params['salary_min'] = this.searchParams.salary_min.toString();
      if (this.searchParams.salary_max) params['salary_max'] = this.searchParams.salary_max.toString();
      if (this.searchParams.full_time) params['full_time'] = this.searchParams.full_time;
      if (this.searchParams.part_time) params['part_time'] = this.searchParams.part_time;
      if (this.searchParams.contract) params['contract'] = this.searchParams.contract;
      if (this.searchParams.permanent) params['permanent'] = this.searchParams.permanent;

      const response = await axios.get<AdzunaApiResponse>(apiUrl, {
        params,
        timeout: 30000,
        headers: {
          'User-Agent': 'JobApplicationCopilot/0.1.0',
        },
      });

      const jobs = response.data.results || [];
      logger.info(`Found ${jobs.length} jobs from Adzuna (total: ${response.data.count})`);

      if (jobs.length === 0) {
        logger.warn(`No jobs returned from Adzuna API`);
        return [];
      }

      return jobs.map((job) => this.convertToRawJob(job));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logger.error(`Adzuna API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          logger.error(`No response from Adzuna API`);
        } else {
          logger.error(`Error setting up Adzuna request: ${error.message}`);
        }
      } else {
        logger.error(`Unexpected error fetching from Adzuna:`, error);
      }
      throw error;
    }
  }

  /**
   * Convert Adzuna job to RawJob
   */
  private convertToRawJob(job: AdzunaJob): RawJob {
    // Determine remote type from location or description
    let remoteType: 'remote' | 'hybrid' | 'onsite' | 'unknown' = 'unknown';
    const locationLower = job.location.display_name.toLowerCase();
    const titleLower = job.title.toLowerCase();
    const descLower = job.description.toLowerCase();

    if (locationLower.includes('remote') || titleLower.includes('remote') || descLower.includes('remote work')) {
      remoteType = 'remote';
    } else if (locationLower.includes('hybrid') || descLower.includes('hybrid')) {
      remoteType = 'hybrid';
    } else {
      remoteType = 'onsite';
    }

    // Format salary if available
    let salary: string | undefined;
    if (job.salary_min && job.salary_max) {
      salary = `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`;
      if (job.salary_is_predicted === '1') {
        salary += ' (estimated)';
      }
    } else if (job.salary_min) {
      salary = `$${job.salary_min.toLocaleString()}+`;
    }

    return {
      externalId: job.id,
      url: job.redirect_url,
      title: job.title,
      company: job.company.display_name,
      location: job.location.display_name,
      remoteType,
      salary,
      description: job.description,
      postedAt: job.created,
    };
  }
}

/**
 * Create an Adzuna connector with search parameters
 */
export function createAdzunaConnector(
  sourceId: number,
  sourceName: string,
  appId: string,
  appKey: string,
  searchParams: AdzunaSearchParams,
  rateLimiter?: RateLimiter
): AdzunaConnector {
  return new AdzunaConnector(sourceId, sourceName, appId, appKey, searchParams, rateLimiter);
}

/**
 * Helper to create Adzuna source for tech jobs
 */
export function createAdzunaTechJobsConnector(
  sourceId: number,
  appId: string,
  appKey: string,
  location: string = '',
  country: string = 'us',
  rateLimiter?: RateLimiter
): AdzunaConnector {
  return new AdzunaConnector(
    sourceId,
    `Adzuna - ${location || 'All Locations'}`,
    appId,
    appKey,
    {
      query: 'software engineer developer programmer',
      location,
      country,
      category: 'it-jobs',
      sort_by: 'date',
      max_days_old: 14,
      results_per_page: 50,
    },
    rateLimiter
  );
}
