/**
 * Rate limiting utility
 */

import { RateLimitError } from '../types';

interface RateLimitState {
  requests: number[];
  lastCleanup: number;
}

const limiters = new Map<string, RateLimitState>();

/**
 * Rate limiter
 */
export class RateLimiter {
  private key: string;
  private maxRequests: number;
  private windowMs: number;

  constructor(key: string, maxRequests: number, windowMs: number) {
    this.key = key;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    if (!limiters.has(key)) {
      limiters.set(key, {
        requests: [],
        lastCleanup: Date.now(),
      });
    }
  }

  /**
   * Check if request is allowed and record it
   */
  async checkLimit(): Promise<void> {
    const now = Date.now();
    const state = limiters.get(this.key)!;

    // Cleanup old requests
    if (now - state.lastCleanup > this.windowMs) {
      state.requests = state.requests.filter((timestamp) => now - timestamp < this.windowMs);
      state.lastCleanup = now;
    }

    // Check if limit exceeded
    if (state.requests.length >= this.maxRequests) {
      const oldestRequest = state.requests[0]!;
      const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);
      throw new RateLimitError(
        `Rate limit exceeded for ${this.key}. Retry after ${retryAfter} seconds.`,
        retryAfter
      );
    }

    // Record request
    state.requests.push(now);
  }

  /**
   * Wait if needed, then allow request
   */
  async waitAndProceed(): Promise<void> {
    const now = Date.now();
    const state = limiters.get(this.key)!;

    // Cleanup old requests
    state.requests = state.requests.filter((timestamp) => now - timestamp < this.windowMs);
    state.lastCleanup = now;

    // If at limit, wait for oldest to expire
    if (state.requests.length >= this.maxRequests) {
      const oldestRequest = state.requests[0]!;
      const waitTime = oldestRequest + this.windowMs - now;

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // Cleanup again after waiting
      const newNow = Date.now();
      state.requests = state.requests.filter((timestamp) => newNow - timestamp < this.windowMs);
    }

    // Record request
    state.requests.push(Date.now());
  }
}

/**
 * Create a rate limiter for RSS feeds (requests per minute)
 */
export function createRssLimiter(requestsPerMinute: number): RateLimiter {
  return new RateLimiter('rss', requestsPerMinute, 60 * 1000);
}

/**
 * Create a rate limiter for API calls (requests per hour)
 */
export function createApiLimiter(requestsPerHour: number): RateLimiter {
  return new RateLimiter('api', requestsPerHour, 60 * 60 * 1000);
}

/**
 * Create a rate limiter for web scraping (requests per minute)
 */
export function createWebLimiter(requestsPerMinute: number): RateLimiter {
  return new RateLimiter('web', requestsPerMinute, 60 * 1000);
}
