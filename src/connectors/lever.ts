/**
 * Lever ATS Connector
 * Fetches jobs from Lever career pages
 */

import axios from 'axios';
import { BaseConnector, RawJob } from './base';
import type { RateLimiter } from '../utils/rate-limit';
import { logger } from '../utils/logger';

interface LeverJobPosting {
  id: string;
  text: string; // Job title
  categories: {
    commitment?: string; // Full-time, Part-time, etc.
    department?: string;
    location?: string;
    team?: string;
  };
  description: string;
  lists?: Array<{
    text: string;
    content: string;
  }>;
  additional?: string;
  hostedUrl: string;
  applyUrl: string;
  createdAt: number;
  updatedAt?: number;
  workplaceType?: string; // remote, onsite, hybrid
}

interface LeverApiResponse {
  data?: LeverJobPosting[];
}

export class LeverConnector extends BaseConnector {
  private apiUrl: string;
  private companyName: string;
  private rateLimiter?: RateLimiter;

  constructor(
    sourceId: number,
    sourceName: string,
    apiUrl: string,
    companyName: string,
    rateLimiter?: RateLimiter
  ) {
    super(sourceId, sourceName);
    this.apiUrl = apiUrl;
    this.companyName = companyName;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Fetch jobs from Lever API
   */
  async fetchJobs(): Promise<RawJob[]> {
    try {
      if (this.rateLimiter) {
        await this.rateLimiter.waitAndProceed();
      }

      logger.info(`Fetching jobs from Lever: ${this.sourceName}`);
      logger.debug(`Lever API URL: ${this.apiUrl}`);

      const response = await axios.get<LeverJobPosting[]>(this.apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'JobApplicationCopilot/0.1.0',
          'Accept': 'application/json',
        },
      });

      // Lever API returns array directly or wrapped in { data: [...] }
      let postings: LeverJobPosting[];
      if (Array.isArray(response.data)) {
        postings = response.data;
      } else {
        const apiResponse = response.data as unknown as LeverApiResponse;
        postings = apiResponse.data || [];
      }

      logger.info(`Found ${postings.length} jobs from Lever: ${this.sourceName}`);

      if (postings.length === 0) {
        logger.warn(`No jobs returned from Lever API: ${this.apiUrl}`);
        return [];
      }

      logger.info(`Parsed ${postings.length} valid jobs from Lever: ${this.sourceName}`);

      return postings.map((posting) => this.convertToRawJob(posting));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logger.error(
            `Lever API error for ${this.sourceName}: ${error.response.status} ${error.response.statusText}`
          );
        } else if (error.request) {
          logger.error(`No response from Lever API for ${this.sourceName}`);
        } else {
          logger.error(`Error setting up Lever request for ${this.sourceName}: ${error.message}`);
        }
      } else {
        logger.error(`Unexpected error fetching from Lever ${this.sourceName}:`, error);
      }
      throw error;
    }
  }

  /**
   * Convert Lever posting to RawJob
   */
  private convertToRawJob(posting: LeverJobPosting): RawJob {
    const location = posting.categories?.location || 'Location not specified';

    // Determine remote type from workplaceType or location
    let remoteType: 'remote' | 'hybrid' | 'onsite' | 'unknown' = 'unknown';
    if (posting.workplaceType) {
      const workplace = posting.workplaceType.toLowerCase();
      if (workplace.includes('remote')) remoteType = 'remote';
      else if (workplace.includes('hybrid')) remoteType = 'hybrid';
      else if (workplace.includes('onsite') || workplace.includes('office')) remoteType = 'onsite';
    } else if (location) {
      const loc = location.toLowerCase();
      if (loc.includes('remote')) remoteType = 'remote';
      else if (loc.includes('hybrid')) remoteType = 'hybrid';
    }

    // Build description from Lever's structured content
    let description = posting.description || '';
    if (posting.lists && posting.lists.length > 0) {
      description += '\n\n' + posting.lists.map((list) => {
        return `${list.text}\n${list.content}`;
      }).join('\n\n');
    }
    if (posting.additional) {
      description += '\n\n' + posting.additional;
    }

    return {
      externalId: posting.id,
      url: posting.hostedUrl || posting.applyUrl,
      title: posting.text,
      company: this.companyName,
      location,
      remoteType,
      salary: undefined, // Lever doesn't typically include salary in API
      description: description.trim(),
      postedAt: new Date(posting.createdAt).toISOString(),
    };
  }
}

/**
 * Create a Lever connector from a Lever API URL
 */
export function createLeverConnectorFromUrl(
  sourceId: number,
  sourceName: string,
  apiUrl: string,
  companyName: string,
  rateLimiter?: RateLimiter
): LeverConnector {
  return new LeverConnector(sourceId, sourceName, apiUrl, companyName, rateLimiter);
}
