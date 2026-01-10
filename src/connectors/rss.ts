/**
 * RSS Feed Connector
 */

import Parser from 'rss-parser';
import { BaseConnector, RawJob } from './base';
import { logger } from '../utils/logger';
import { RateLimiter } from '../utils/rate-limit';

/**
 * RSS Connector for job feeds
 */
export class RSSConnector extends BaseConnector {
  private feedUrl: string;
  private rateLimiter: RateLimiter;
  private parser: Parser;

  constructor(sourceId: number, sourceName: string, feedUrl: string, rateLimiter: RateLimiter) {
    super(sourceId, sourceName);
    this.feedUrl = feedUrl;
    this.rateLimiter = rateLimiter;
    this.parser = new Parser({
      customFields: {
        item: [
          ['job:title', 'jobTitle'],
          ['job:company', 'jobCompany'],
          ['job:location', 'jobLocation'],
          ['job:type', 'jobType'],
          ['job:salary', 'jobSalary'],
        ],
      },
    });
  }

  /**
   * Fetch jobs from RSS feed
   */
  async fetchJobs(): Promise<RawJob[]> {
    try {
      logger.info(`Fetching RSS feed: ${this.sourceName}`);

      // Apply rate limiting
      await this.rateLimiter.waitAndProceed();

      // Parse feed
      const feed = await this.parser.parseURL(this.feedUrl);

      logger.info(`Found ${feed.items.length} items in RSS feed: ${this.sourceName}`);

      // Convert feed items to raw jobs
      const rawJobs: RawJob[] = feed.items
        .map((item) => this.parseFeedItem(item))
        .filter((job): job is RawJob => job !== null);

      logger.info(`Parsed ${rawJobs.length} valid jobs from RSS feed: ${this.sourceName}`);

      return rawJobs;
    } catch (error) {
      logger.error(`Error fetching RSS feed ${this.sourceName}:`, error);
      throw error;
    }
  }

  /**
   * Parse a single feed item into a raw job
   */
  private parseFeedItem(item: any): RawJob | null {
    try {
      // Extract title
      const title = this.extractTitle(item);
      if (!title) {
        logger.debug(`Skipping RSS item: no title found`);
        return null;
      }

      // Extract company
      const company = this.extractCompany(item);
      if (!company) {
        logger.debug(`Skipping RSS item: no company found for "${title}"`);
        return null;
      }

      // Extract URL
      const url = item.link || item.guid;
      if (!url) {
        logger.debug(`Skipping RSS item: no URL found for "${title}"`);
        return null;
      }

      return {
        externalId: item.guid || undefined,
        url,
        title,
        company,
        location: this.extractLocation(item),
        remoteType: this.extractRemoteType(item),
        salary: this.extractSalary(item),
        description: this.extractDescription(item),
        postedAt: this.extractDate(item),
      };
    } catch (error) {
      logger.warn(`Error parsing RSS item:`, error);
      return null;
    }
  }

  // ==================== Extraction Helpers ====================

  private extractTitle(item: any): string | null {
    // Try custom job:title field
    if (item.jobTitle) return item.jobTitle.trim();

    // Try standard title
    if (item.title) return item.title.trim();

    return null;
  }

  private extractCompany(item: any): string | null {
    // Try custom job:company field
    if (item.jobCompany) return item.jobCompany.trim();

    // Try to extract from content or description
    // Some feeds include company in format "Job Title at Company Name"
    if (item.title && item.title.includes(' at ')) {
      const parts = item.title.split(' at ');
      if (parts.length === 2 && parts[1]) {
        return parts[1].trim();
      }
    }

    // Try author/creator field
    if (item.creator) return item.creator.trim();
    if (item.author) return item.author.trim();

    // Try to extract from content
    if (item.contentSnippet) {
      const companyMatch = item.contentSnippet.match(/Company:\s*(.+?)(?:\n|$)/i);
      if (companyMatch && companyMatch[1]) {
        return companyMatch[1].trim();
      }
    }

    return null;
  }

  private extractLocation(item: any): string | undefined {
    // Try custom job:location field
    if (item.jobLocation) return item.jobLocation.trim();

    // Try to extract from content
    if (item.contentSnippet) {
      const locationMatch = item.contentSnippet.match(/Location:\s*(.+?)(?:\n|$)/i);
      if (locationMatch && locationMatch[1]) {
        return locationMatch[1].trim();
      }
    }

    return undefined;
  }

  private extractRemoteType(item: any): string | undefined {
    // Try custom job:type field
    if (item.jobType) return item.jobType.trim();

    // Check categories
    if (item.categories) {
      const categories = Array.isArray(item.categories) ? item.categories : [item.categories];
      const remoteCategory = categories.find((cat: string) =>
        /remote|hybrid|on-site|onsite/i.test(cat)
      );
      if (remoteCategory) return remoteCategory;
    }

    return undefined;
  }

  private extractSalary(item: any): string | undefined {
    // Try custom job:salary field
    if (item.jobSalary) return item.jobSalary.trim();

    // Try to extract from content
    if (item.contentSnippet) {
      const salaryMatch = item.contentSnippet.match(/Salary:\s*(.+?)(?:\n|$)/i);
      if (salaryMatch && salaryMatch[1]) {
        return salaryMatch[1].trim();
      }
    }

    return undefined;
  }

  private extractDescription(item: any): string | undefined {
    // Try content:encoded or content first (usually more complete)
    if (item['content:encoded']) return item['content:encoded'];
    if (item.content) return item.content;

    // Fall back to description or summary
    if (item.description) return item.description;
    if (item.summary) return item.summary;
    if (item.contentSnippet) return item.contentSnippet;

    return undefined;
  }

  private extractDate(item: any): Date | undefined {
    // Try pubDate first
    if (item.pubDate) {
      const date = new Date(item.pubDate);
      if (!isNaN(date.getTime())) return date;
    }

    // Try isoDate
    if (item.isoDate) {
      const date = new Date(item.isoDate);
      if (!isNaN(date.getTime())) return date;
    }

    return undefined;
  }
}
