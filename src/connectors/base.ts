/**
 * Base connector interface for job sources
 */

import crypto from 'crypto';
import type { RemoteType, JobStatus } from '../types';

/**
 * Raw job data from a source (before normalization)
 */
export interface RawJob {
  externalId?: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  remoteType?: string;
  salary?: string;
  description?: string;
  postedAt?: Date | string;
}

/**
 * Normalized job ready for database
 */
export interface NormalizedJob {
  sourceId: number;
  externalId: string | null;
  url: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: RemoteType;
  salary: string | null;
  description: string | null;
  postedAt: Date | null;
  hash: string;
  status: JobStatus;
}

/**
 * Abstract base connector class
 */
export abstract class BaseConnector {
  protected sourceId: number;
  protected sourceName: string;

  constructor(sourceId: number, sourceName: string) {
    this.sourceId = sourceId;
    this.sourceName = sourceName;
  }

  /**
   * Fetch jobs from the source (implemented by subclasses)
   */
  abstract fetchJobs(): Promise<RawJob[]>;

  /**
   * Normalize a raw job into standard format
   */
  protected normalizeJob(raw: RawJob): NormalizedJob {
    return {
      sourceId: this.sourceId,
      externalId: raw.externalId || null,
      url: this.normalizeUrl(raw.url),
      title: this.normalizeTitle(raw.title),
      company: this.normalizeCompany(raw.company),
      location: this.normalizeLocation(raw.location),
      remoteType: this.detectRemoteType(raw.remoteType, raw.location, raw.title),
      salary: this.normalizeSalary(raw.salary),
      description: raw.description?.trim() || null,
      postedAt: this.normalizeDate(raw.postedAt),
      hash: this.generateHash(raw),
      status: 'new',
    };
  }

  /**
   * Normalize and fetch all jobs
   */
  async fetchAndNormalize(): Promise<NormalizedJob[]> {
    const rawJobs = await this.fetchJobs();
    return rawJobs.map((raw) => this.normalizeJob(raw));
  }

  // ==================== Normalization Helpers ====================

  protected normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove tracking parameters
      const cleanParams = new URLSearchParams();
      parsed.searchParams.forEach((value, key) => {
        if (!this.isTrackingParam(key)) {
          cleanParams.set(key, value);
        }
      });
      parsed.search = cleanParams.toString();
      return parsed.toString();
    } catch {
      return url.trim();
    }
  }

  protected isTrackingParam(param: string): boolean {
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source'];
    return trackingParams.includes(param.toLowerCase());
  }

  protected normalizeTitle(title: string): string {
    return title.trim().replace(/\s+/g, ' ');
  }

  protected normalizeCompany(company: string): string {
    return company.trim().replace(/\s+/g, ' ');
  }

  protected normalizeLocation(location?: string): string | null {
    if (!location) return null;
    return location.trim().replace(/\s+/g, ' ') || null;
  }

  protected detectRemoteType(
    remoteType?: string,
    location?: string,
    title?: string
  ): RemoteType {
    const text = `${remoteType} ${location} ${title}`.toLowerCase();

    if (text.includes('remote') && !text.includes('no remote')) {
      if (text.includes('hybrid')) {
        return 'hybrid';
      }
      return 'remote';
    }

    if (text.includes('hybrid')) {
      return 'hybrid';
    }

    if (text.includes('on-site') || text.includes('onsite') || text.includes('in-office')) {
      return 'onsite';
    }

    return 'unknown';
  }

  protected normalizeSalary(salary?: string): string | null {
    if (!salary) return null;
    return salary.trim().replace(/\s+/g, ' ') || null;
  }

  protected normalizeDate(date?: Date | string): Date | null {
    if (!date) return null;

    if (date instanceof Date) {
      return date;
    }

    try {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique hash for the job
   * Uses: url + title + company to create stable identifier
   */
  protected generateHash(raw: RawJob): string {
    const hashInput = `${raw.url}|${raw.title}|${raw.company}`.toLowerCase();
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }
}
