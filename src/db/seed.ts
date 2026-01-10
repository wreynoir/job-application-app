/**
 * Database seeding script - adds sample job sources for testing
 */

import { initializeDatabase, createSource } from './client';
import { logger } from '../utils/logger';

/**
 * Seed the database with sample job sources
 */
export function seedDatabase(): void {
  logger.info('Seeding database with sample job sources...');

  initializeDatabase();

  // Example RSS feeds (these are public job feeds)
  const sources = [
    {
      name: 'Stack Overflow Jobs (Remote)',
      type: 'rss' as const,
      url: 'https://stackoverflow.com/jobs/feed?r=true', // Remote jobs
      config: {},
    },
    {
      name: 'GitHub Jobs RSS',
      type: 'rss' as const,
      url: 'https://jobs.github.com/positions.rss',
      config: {},
    },
    // Example Greenhouse board (Anthropic careers)
    {
      name: 'Anthropic Careers',
      type: 'api' as const,
      url: 'https://boards.greenhouse.io/anthropic',
      config: { companyName: 'Anthropic' },
    },
    // Another example Greenhouse board
    {
      name: 'Vercel Careers',
      type: 'api' as const,
      url: 'https://boards.greenhouse.io/vercel',
      config: { companyName: 'Vercel' },
    },
  ];

  sources.forEach((source) => {
    try {
      createSource(source.name, source.type, source.url, source.config);
      logger.info(`  ✓ Added source: ${source.name}`);
    } catch (error) {
      logger.warn(`  ✗ Failed to add source ${source.name}:`, error);
    }
  });

  logger.info('Database seeding completed');
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
  console.log('\n✓ Database seeded successfully!\n');
  console.log('Run "npm run dev jobs:sync" to fetch jobs from the sources.\n');
}
