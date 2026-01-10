/**
 * Seed popular job sources into the database
 */

import { createSource, getAllSources } from './client';

/**
 * Popular companies using Greenhouse ATS
 */
const GREENHOUSE_COMPANIES = [
  { name: 'Anthropic', boardToken: 'anthropic' },
  { name: 'Vercel', boardToken: 'vercel' },
  { name: 'Notion', boardToken: 'notion' },
  { name: 'OpenAI', boardToken: 'openai' },
  { name: 'Stripe', boardToken: 'stripe' },
  { name: 'Figma', boardToken: 'figma' },
  { name: 'Discord', boardToken: 'discord' },
  { name: 'Rippling', boardToken: 'rippling' },
  { name: 'Ramp', boardToken: 'ramp' },
  { name: 'Plaid', boardToken: 'plaid' },
  { name: 'Databricks', boardToken: 'databricks' },
  { name: 'Coinbase', boardToken: 'coinbase' },
  { name: 'Faire', boardToken: 'faire' },
  { name: 'Scale AI', boardToken: 'scaleai' },
  { name: 'Anduril', boardToken: 'anduril' },
  { name: 'Airtable', boardToken: 'airtable' },
  { name: 'Instacart', boardToken: 'instacart' },
  { name: 'Grammarly', boardToken: 'grammarly' },
  { name: 'Benchling', boardToken: 'benchling' },
  { name: 'Gusto', boardToken: 'gusto' },
  { name: 'Brex', boardToken: 'brex' },
  { name: 'Retool', boardToken: 'retool' },
  { name: 'Replit', boardToken: 'replit' },
  { name: 'Linear', boardToken: 'linear' },
  { name: 'Lattice', boardToken: 'lattice' },
  { name: 'Samsara', boardToken: 'samsara' },
  { name: 'Weights & Biases', boardToken: 'wandb' },
  { name: 'Persona', boardToken: 'persona' },
  { name: 'Mercury', boardToken: 'mercury' },
  { name: 'Hex', boardToken: 'hex' },
];

/**
 * Popular companies using Lever ATS
 */
const LEVER_COMPANIES = [
  { name: 'Netflix', site: 'netflix' },
  { name: 'Shopify', site: 'shopify' },
  { name: 'Robinhood', site: 'robinhood' },
  { name: 'Carta', site: 'carta' },
  { name: 'Greylock Partners', site: 'greylock' },
  { name: 'Square (Block)', site: 'squareup' },
  { name: 'Webflow', site: 'webflow' },
  { name: 'Coda', site: 'coda' },
  { name: 'Nuro', site: 'nuro' },
  { name: 'Flexport', site: 'flexport' },
  { name: 'HashiCorp', site: 'hashicorp' },
  { name: 'Canva', site: 'canva' },
  { name: 'GitLab', site: 'gitlab' },
  { name: 'Lyft', site: 'lyft' },
  { name: 'DoorDash', site: 'doordash' },
  { name: 'Udemy', site: 'udemy' },
  { name: 'SeatGeek', site: 'seatgeek' },
  { name: 'Cloudflare', site: 'cloudflare' },
  { name: 'MongoDB', site: 'mongodb' },
  { name: 'Snowflake', site: 'snowflake' },
];

/**
 * Job aggregator RSS feeds
 */
const RSS_FEEDS = [
  {
    name: 'RemoteOK - Remote Jobs',
    url: 'https://remoteok.com/remote-jobs.rss',
  },
  {
    name: 'We Work Remotely - Programming',
    url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  },
  {
    name: 'AngelList - Startups',
    url: 'https://angel.co/jobs.rss',
  },
];

/**
 * Seed all job sources
 */
export function seedAllSources(): void {
  console.log('Seeding job sources...\n');

  const existingSources = getAllSources(false);
  const existingNames = new Set(existingSources.map((s) => s.name));

  let addedCount = 0;

  // Seed Greenhouse sources
  console.log('Adding Greenhouse boards...');
  for (const company of GREENHOUSE_COMPANIES) {
    const sourceName = `${company.name} Careers`;
    if (!existingNames.has(sourceName)) {
      createSource(
        sourceName,
        'api',
        `https://job-boards.greenhouse.io/${company.boardToken}`,
        { companyName: company.name }
      );
      console.log(`  ✓ ${sourceName}`);
      addedCount++;
    } else {
      console.log(`  - ${sourceName} (already exists)`);
    }
  }

  // Seed Lever sources
  console.log('\nAdding Lever boards...');
  for (const company of LEVER_COMPANIES) {
    const sourceName = `${company.name} Careers`;
    if (!existingNames.has(sourceName)) {
      createSource(
        sourceName,
        'api',
        `https://api.lever.co/v0/postings/${company.site}?mode=json`,
        { companyName: company.name, atsType: 'lever' }
      );
      console.log(`  ✓ ${sourceName}`);
      addedCount++;
    } else {
      console.log(`  - ${sourceName} (already exists)`);
    }
  }

  // Seed RSS feeds
  console.log('\nAdding RSS feeds...');
  for (const feed of RSS_FEEDS) {
    if (!existingNames.has(feed.name)) {
      createSource(feed.name, 'rss', feed.url);
      console.log(`  ✓ ${feed.name}`);
      addedCount++;
    } else {
      console.log(`  - ${feed.name} (already exists)`);
    }
  }

  console.log(`\n✓ Seeding complete! Added ${addedCount} new sources.`);
  console.log(`  Total sources: ${existingSources.length + addedCount}`);
}

/**
 * Add a single Greenhouse company
 */
export function addGreenhouseCompany(companyName: string, boardToken: string): void {
  const sourceName = `${companyName} Careers`;
  createSource(
    sourceName,
    'api',
    `https://job-boards.greenhouse.io/${boardToken}`,
    { companyName }
  );
  console.log(`✓ Added ${sourceName}`);
}

/**
 * Add a single Lever company
 */
export function addLeverCompany(companyName: string, site: string): void {
  const sourceName = `${companyName} Careers`;
  createSource(
    sourceName,
    'api',
    `https://api.lever.co/v0/postings/${site}?mode=json`,
    { companyName, atsType: 'lever' }
  );
  console.log(`✓ Added ${sourceName}`);
}

/**
 * Add a custom RSS feed
 */
export function addRssFeed(name: string, url: string): void {
  createSource(name, 'rss', url);
  console.log(`✓ Added ${name}`);
}

/**
 * Seed job aggregator API sources (requires API keys in .env)
 * These sources are disabled by default until user adds their API keys
 */
export function seedAggregatorAPIs(): void {
  console.log('Seeding job aggregator APIs...\n');

  const existingSources = getAllSources(false);
  const existingNames = new Set(existingSources.map((s) => s.name));

  let addedCount = 0;

  // Indeed
  if (!existingNames.has('Indeed - Tech Jobs')) {
    createSource(
      'Indeed - Tech Jobs',
      'api',
      'https://api.indeed.com/ads/apisearch',
      {
        apiType: 'indeed',
        query: 'software engineer OR developer',
        requiresApiKey: true,
      }
    );
    console.log('  ✓ Indeed - Tech Jobs (disabled until API key added)');
    addedCount++;
  }

  // Adzuna
  if (!existingNames.has('Adzuna - Tech Jobs')) {
    createSource(
      'Adzuna - Tech Jobs',
      'api',
      'https://api.adzuna.com/v1/api/jobs/us/search/1',
      {
        apiType: 'adzuna',
        query: 'software engineer developer',
        category: 'it-jobs',
        requiresApiKey: true,
      }
    );
    console.log('  ✓ Adzuna - Tech Jobs (disabled until API key added)');
    addedCount++;
  }

  // JSearch (Google Jobs)
  if (!existingNames.has('JSearch - Google Jobs')) {
    createSource(
      'JSearch - Google Jobs',
      'api',
      'https://jsearch.p.rapidapi.com/search',
      {
        apiType: 'jsearch',
        query: 'software engineer OR developer',
        requiresApiKey: true,
      }
    );
    console.log('  ✓ JSearch - Google Jobs (disabled until API key added)');
    addedCount++;
  }

  console.log(`\n✓ Added ${addedCount} job aggregator sources.`);
  console.log('  Note: These are disabled until you add API keys to your .env file.');
  console.log('  See .env.example for instructions on getting free API keys.');
}
