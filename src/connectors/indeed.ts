/**
 * Indeed Publisher API Connector
 * Fetches jobs from Indeed using their free Publisher API
 * Docs: https://opensource.indeedeng.io/api-documentation/
 */

import axios from 'axios';
import { BaseConnector, RawJob } from './base';
import type { RateLimiter } from '../utils/rate-limit';
import { logger } from '../utils/logger';

interface IndeedJob {
  jobtitle: string;
  company: string;
  city: string;
  state: string;
  country: string;
  formattedLocation: string;
  source: string;
  date: string;
  snippet: string;
  url: string;
  jobkey: string;
  sponsored?: boolean;
  expired?: boolean;
  formattedRelativeTime?: string;
  latitude?: number;
  longitude?: number;
}

interface IndeedApiResponse {
  version: number;
  query: string;
  location: string;
  dupefilter: boolean;
  highlight: boolean;
  totalResults: number;
  start: number;
  end: number;
  pageNumber: number;
  results: IndeedJob[];
}

export interface IndeedSearchParams {
  query: string; // Search keywords (e.g., "software engineer")
  location?: string; // Location (e.g., "San Francisco, CA" or "remote")
  sort?: 'relevance' | 'date';
  radius?: number; // Miles from location (default: 25)
  siteType?: 'jobsite' | 'employer';
  jobType?: 'fulltime' | 'parttime' | 'contract' | 'internship' | 'temporary';
  fromage?: number; // Days back (e.g., 7 for last 7 days)
  limit?: number; // Results per page (max 25)
  start?: number; // Start position for pagination
}

export class IndeedConnector extends BaseConnector {
  private publisherId: string;
  private searchParams: IndeedSearchParams;
  private rateLimiter?: RateLimiter;

  constructor(
    sourceId: number,
    sourceName: string,
    publisherId: string,
    searchParams: IndeedSearchParams,
    rateLimiter?: RateLimiter
  ) {
    super(sourceId, sourceName);
    this.publisherId = publisherId;
    this.searchParams = searchParams;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Fetch jobs from Indeed Publisher API
   */
  async fetchJobs(): Promise<RawJob[]> {
    try {
      if (this.rateLimiter) {
        await this.rateLimiter.waitAndProceed();
      }

      logger.info(`Fetching jobs from Indeed: ${this.sourceName}`);
      logger.debug(`Search params: ${JSON.stringify(this.searchParams)}`);

      // Build API URL
      const apiUrl = 'https://api.indeed.com/ads/apisearch';
      const params = {
        publisher: this.publisherId,
        v: '2',
        format: 'json',
        q: this.searchParams.query,
        l: this.searchParams.location || '',
        sort: this.searchParams.sort || 'relevance',
        radius: this.searchParams.radius?.toString() || '25',
        st: this.searchParams.siteType || 'jobsite',
        jt: this.searchParams.jobType || '',
        fromage: this.searchParams.fromage?.toString() || '',
        limit: this.searchParams.limit?.toString() || '25',
        start: this.searchParams.start?.toString() || '0',
        filter: '1', // Duplicate filter
        latlong: '0', // Don't use lat/long
        co: 'us', // Country
        chnl: 'JobApplicationCopilot',
        userip: '1.2.3.4', // Required by API
        useragent: 'JobApplicationCopilot/0.1.0',
      };

      const response = await axios.get<IndeedApiResponse>(apiUrl, {
        params,
        timeout: 30000,
        headers: {
          'User-Agent': 'JobApplicationCopilot/0.1.0',
        },
      });

      const jobs = response.data.results || [];
      logger.info(`Found ${jobs.length} jobs from Indeed (total: ${response.data.totalResults})`);

      if (jobs.length === 0) {
        logger.warn(`No jobs returned from Indeed API`);
        return [];
      }

      return jobs
        .filter((job) => !job.expired && !job.sponsored) // Filter out expired and sponsored
        .map((job) => this.convertToRawJob(job));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logger.error(`Indeed API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          logger.error(`No response from Indeed API`);
        } else {
          logger.error(`Error setting up Indeed request: ${error.message}`);
        }
      } else {
        logger.error(`Unexpected error fetching from Indeed:`, error);
      }
      throw error;
    }
  }

  /**
   * Convert Indeed job to RawJob
   */
  private convertToRawJob(job: IndeedJob): RawJob {
    // Determine remote type from location or job title
    let remoteType: 'remote' | 'hybrid' | 'onsite' | 'unknown' = 'unknown';
    const locationLower = job.formattedLocation.toLowerCase();
    const titleLower = job.jobtitle.toLowerCase();

    if (locationLower.includes('remote') || titleLower.includes('remote')) {
      remoteType = 'remote';
    } else if (locationLower.includes('hybrid') || titleLower.includes('hybrid')) {
      remoteType = 'hybrid';
    } else if (job.city || job.state) {
      remoteType = 'onsite';
    }

    return {
      externalId: job.jobkey,
      url: job.url,
      title: job.jobtitle,
      company: job.company,
      location: job.formattedLocation,
      remoteType,
      salary: undefined, // Indeed doesn't include salary in free API
      description: job.snippet, // Only snippet available, not full description
      postedAt: job.date,
    };
  }
}

/**
 * Create an Indeed connector with search parameters
 */
export function createIndeedConnector(
  sourceId: number,
  sourceName: string,
  publisherId: string,
  searchParams: IndeedSearchParams,
  rateLimiter?: RateLimiter
): IndeedConnector {
  return new IndeedConnector(sourceId, sourceName, publisherId, searchParams, rateLimiter);
}

/**
 * Helper to create Indeed source for tech jobs
 */
export function createIndeedTechJobsConnector(
  sourceId: number,
  publisherId: string,
  location: string = '',
  rateLimiter?: RateLimiter
): IndeedConnector {
  return new IndeedConnector(
    sourceId,
    `Indeed - ${location || 'All Locations'}`,
    publisherId,
    {
      query: 'software engineer OR developer OR programmer',
      location,
      sort: 'date',
      fromage: 14, // Last 14 days
      limit: 25,
    },
    rateLimiter
  );
}
