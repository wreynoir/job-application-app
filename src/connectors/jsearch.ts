/**
 * JSearch API Connector (RapidAPI)
 * Aggregates jobs from Google Jobs (which includes LinkedIn, Indeed, Glassdoor, etc.)
 * Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 * Free tier: 100 requests/month
 */

import axios from 'axios';
import { BaseConnector, RawJob } from './base';
import type { RateLimiter } from '../utils/rate-limit';
import { logger } from '../utils/logger';

interface JSearchJob {
  job_id: string;
  employer_name: string;
  employer_logo?: string;
  employer_website?: string;
  employer_company_type?: string;
  job_publisher: string;
  job_employment_type?: string; // FULLTIME, PARTTIME, CONTRACTOR, INTERN
  job_title: string;
  job_apply_link: string;
  job_apply_is_direct?: boolean;
  job_apply_quality_score?: number;
  job_description: string;
  job_is_remote: boolean;
  job_posted_at_timestamp?: number;
  job_posted_at_datetime_utc?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_latitude?: number;
  job_longitude?: number;
  job_benefits?: string[];
  job_google_link?: string;
  job_offer_expiration_datetime_utc?: string;
  job_offer_expiration_timestamp?: number;
  job_required_experience?: {
    no_experience_required?: boolean;
    required_experience_in_months?: number;
    experience_mentioned?: boolean;
    experience_preferred?: boolean;
  };
  job_required_skills?: string[];
  job_required_education?: {
    postgraduate_degree?: boolean;
    professional_certification?: boolean;
    high_school?: boolean;
    associates_degree?: boolean;
    bachelors_degree?: boolean;
    degree_mentioned?: boolean;
    degree_preferred?: boolean;
    professional_certification_mentioned?: boolean;
  };
  job_experience_in_place_of_education?: boolean;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  job_job_title?: string;
  job_posting_language?: string;
  job_onet_soc?: string;
  job_onet_job_zone?: string;
}

interface JSearchApiResponse {
  status: string;
  request_id: string;
  parameters: {
    query: string;
    page: number;
    num_pages: number;
  };
  data: JSearchJob[];
}

export interface JSearchParams {
  query: string; // Search query
  location?: string; // Location (city, state, country, or "remote")
  page?: number; // Page number (1-indexed)
  num_pages?: number; // Number of pages to return (1-20)
  date_posted?: 'all' | 'today' | '3days' | 'week' | 'month';
  remote_jobs_only?: boolean;
  employment_types?: ('FULLTIME' | 'CONTRACTOR' | 'PARTTIME' | 'INTERN')[];
  job_requirements?: ('under_3_years_experience' | 'more_than_3_years_experience' | 'no_experience' | 'no_degree')[];
  job_titles?: string[]; // Filter by job titles
  company_types?: string[]; // Filter by company types
  employer?: string; // Filter by specific employer
}

export class JSearchConnector extends BaseConnector {
  private apiKey: string;
  private searchParams: JSearchParams;
  private rateLimiter?: RateLimiter;

  constructor(
    sourceId: number,
    sourceName: string,
    apiKey: string,
    searchParams: JSearchParams,
    rateLimiter?: RateLimiter
  ) {
    super(sourceId, sourceName);
    this.apiKey = apiKey;
    this.searchParams = searchParams;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Fetch jobs from JSearch API
   */
  async fetchJobs(): Promise<RawJob[]> {
    try {
      if (this.rateLimiter) {
        await this.rateLimiter.waitAndProceed();
      }

      logger.info(`Fetching jobs from JSearch (Google Jobs): ${this.sourceName}`);
      logger.debug(`Search params: ${JSON.stringify(this.searchParams)}`);

      const apiUrl = 'https://jsearch.p.rapidapi.com/search';

      const params: Record<string, string> = {
        query: this.searchParams.query,
        page: (this.searchParams.page || 1).toString(),
        num_pages: (this.searchParams.num_pages || 1).toString(),
      };

      // Add optional params
      if (this.searchParams.location) params['location'] = this.searchParams.location;
      if (this.searchParams.date_posted) params['date_posted'] = this.searchParams.date_posted;
      if (this.searchParams.remote_jobs_only) params['remote_jobs_only'] = 'true';
      if (this.searchParams.employment_types) params['employment_types'] = this.searchParams.employment_types.join(',');
      if (this.searchParams.job_requirements) params['job_requirements'] = this.searchParams.job_requirements.join(',');
      if (this.searchParams.employer) params['employer'] = this.searchParams.employer;

      const response = await axios.get<JSearchApiResponse>(apiUrl, {
        params,
        timeout: 30000,
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'User-Agent': 'JobApplicationCopilot/0.1.0',
        },
      });

      const jobs = response.data.data || [];
      logger.info(`Found ${jobs.length} jobs from JSearch (Google Jobs)`);

      if (jobs.length === 0) {
        logger.warn(`No jobs returned from JSearch API`);
        return [];
      }

      return jobs.map((job) => this.convertToRawJob(job));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logger.error(`JSearch API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          logger.error(`No response from JSearch API`);
        } else {
          logger.error(`Error setting up JSearch request: ${error.message}`);
        }
      } else {
        logger.error(`Unexpected error fetching from JSearch:`, error);
      }
      throw error;
    }
  }

  /**
   * Convert JSearch job to RawJob
   */
  private convertToRawJob(job: JSearchJob): RawJob {
    // Determine remote type
    let remoteType: 'remote' | 'hybrid' | 'onsite' | 'unknown' = 'unknown';
    if (job.job_is_remote) {
      remoteType = 'remote';
    } else if (job.job_city || job.job_state) {
      remoteType = 'onsite';
    }

    // Format location
    let location = 'Location not specified';
    if (job.job_is_remote) {
      location = 'Remote';
    } else {
      const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
      if (parts.length > 0) {
        location = parts.join(', ');
      }
    }

    // Format salary
    let salary: string | undefined;
    if (job.job_min_salary && job.job_max_salary) {
      const currency = job.job_salary_currency || 'USD';
      const period = job.job_salary_period || 'YEAR';
      salary = `${currency} ${job.job_min_salary.toLocaleString()} - ${job.job_max_salary.toLocaleString()} / ${period.toLowerCase()}`;
    }

    // Use posted date if available
    let postedAt: string | undefined;
    if (job.job_posted_at_datetime_utc) {
      postedAt = job.job_posted_at_datetime_utc;
    } else if (job.job_posted_at_timestamp) {
      postedAt = new Date(job.job_posted_at_timestamp * 1000).toISOString();
    }

    return {
      externalId: job.job_id,
      url: job.job_apply_link,
      title: job.job_title,
      company: job.employer_name,
      location,
      remoteType,
      salary,
      description: job.job_description,
      postedAt,
    };
  }
}

/**
 * Create a JSearch connector with search parameters
 */
export function createJSearchConnector(
  sourceId: number,
  sourceName: string,
  apiKey: string,
  searchParams: JSearchParams,
  rateLimiter?: RateLimiter
): JSearchConnector {
  return new JSearchConnector(sourceId, sourceName, apiKey, searchParams, rateLimiter);
}

/**
 * Helper to create JSearch source for tech jobs
 */
export function createJSearchTechJobsConnector(
  sourceId: number,
  apiKey: string,
  location: string = '',
  remoteOnly: boolean = false,
  rateLimiter?: RateLimiter
): JSearchConnector {
  return new JSearchConnector(
    sourceId,
    `JSearch (Google Jobs) - ${location || 'All Locations'}`,
    apiKey,
    {
      query: 'software engineer OR developer OR programmer',
      location: location || undefined,
      date_posted: 'week',
      remote_jobs_only: remoteOnly,
      employment_types: ['FULLTIME'],
      num_pages: 1,
    },
    rateLimiter
  );
}
