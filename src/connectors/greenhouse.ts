/**
 * Greenhouse ATS API Connector
 */

import axios, { AxiosInstance } from 'axios';
import { BaseConnector, RawJob } from './base';
import { logger } from '../utils/logger';
import { RateLimiter } from '../utils/rate-limit';

/**
 * Greenhouse job board API response types
 */
interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: {
    name: string;
  };
  updated_at: string;
  metadata?: {
    name?: string;
    value?: string;
  }[];
  departments?: {
    id: number;
    name: string;
  }[];
  offices?: {
    id: number;
    name: string;
    location?: string;
  }[];
  content?: string;
}

interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}

/**
 * Greenhouse Connector
 * Uses the public job board API (no authentication required)
 */
export class GreenhouseConnector extends BaseConnector {
  private companyName: string;
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor(
    sourceId: number,
    sourceName: string,
    boardToken: string,
    companyName: string,
    rateLimiter: RateLimiter
  ) {
    super(sourceId, sourceName);
    this.companyName = companyName;
    this.rateLimiter = rateLimiter;

    this.client = axios.create({
      baseURL: `https://boards-api.greenhouse.io/v1/boards/${boardToken}`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Fetch jobs from Greenhouse job board
   */
  async fetchJobs(): Promise<RawJob[]> {
    try {
      logger.info(`Fetching jobs from Greenhouse: ${this.sourceName}`);

      // Apply rate limiting
      await this.rateLimiter.waitAndProceed();

      // Fetch jobs from Greenhouse API
      const response = await this.client.get<GreenhouseJobsResponse>('/jobs', {
        params: {
          content: 'true', // Include job description content
        },
      });

      const greenhouseJobs = response.data.jobs;
      logger.info(`Found ${greenhouseJobs.length} jobs from Greenhouse: ${this.sourceName}`);

      // Convert to raw jobs
      const rawJobs: RawJob[] = greenhouseJobs
        .map((job) => this.parseGreenhouseJob(job))
        .filter((job): job is RawJob => job !== null);

      logger.info(`Parsed ${rawJobs.length} valid jobs from Greenhouse: ${this.sourceName}`);

      return rawJobs;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`Greenhouse API error for ${this.sourceName}:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
        });
      } else {
        logger.error(`Error fetching Greenhouse jobs for ${this.sourceName}:`, error);
      }
      throw error;
    }
  }

  /**
   * Parse a Greenhouse job into raw job format
   */
  private parseGreenhouseJob(job: GreenhouseJob): RawJob | null {
    try {
      // Extract location
      let location: string | undefined = job.location?.name;

      // If offices are provided, use the first office location
      if (!location && job.offices && job.offices.length > 0) {
        location = job.offices[0]?.location || job.offices[0]?.name || undefined;
      }

      // Detect remote type from location or metadata
      let remoteType: string | undefined;
      if (location) {
        if (/remote/i.test(location)) {
          remoteType = 'remote';
        } else if (/hybrid/i.test(location)) {
          remoteType = 'hybrid';
        }
      }

      // Extract salary from metadata if available
      let salary: string | undefined;
      if (job.metadata) {
        const salaryMeta = job.metadata.find(
          (m) => m.name && /salary|compensation|pay/i.test(m.name)
        );
        if (salaryMeta?.value) {
          salary = salaryMeta.value;
        }
      }

      return {
        externalId: job.id.toString(),
        url: job.absolute_url,
        title: job.title,
        company: this.companyName,
        location,
        remoteType,
        salary,
        description: job.content,
        postedAt: new Date(job.updated_at),
      };
    } catch (error) {
      logger.warn(`Error parsing Greenhouse job ${job.id}:`, error);
      return null;
    }
  }

  /**
   * Fetch a single job by ID
   */
  async fetchJobById(jobId: number): Promise<RawJob | null> {
    try {
      await this.rateLimiter.waitAndProceed();

      const response = await this.client.get<GreenhouseJob>(`/jobs/${jobId}`);
      return this.parseGreenhouseJob(response.data);
    } catch (error) {
      logger.error(`Error fetching Greenhouse job ${jobId}:`, error);
      return null;
    }
  }
}

/**
 * Create a Greenhouse connector from a board URL
 * Example: https://boards.greenhouse.io/companyname
 */
export function createGreenhouseConnectorFromUrl(
  sourceId: number,
  sourceName: string,
  boardUrl: string,
  companyName: string,
  rateLimiter: RateLimiter
): GreenhouseConnector | null {
  try {
    // Extract board token from URL
    const match = boardUrl.match(/greenhouse\.io\/([^\/]+)/);
    if (!match || !match[1]) {
      logger.error(`Invalid Greenhouse board URL: ${boardUrl}`);
      return null;
    }

    const boardToken = match[1];
    return new GreenhouseConnector(sourceId, sourceName, boardToken, companyName, rateLimiter);
  } catch (error) {
    logger.error(`Error creating Greenhouse connector from URL:`, error);
    return null;
  }
}
