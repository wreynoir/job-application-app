/**
 * CLI commands for managing job sources
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { getAllSources } from '../db/client';
import { seedAllSources, addGreenhouseCompany, addLeverCompany, addRssFeed } from '../db/seed-sources';
import { showHeader, showSuccess } from '../utils/cli-helpers';

/**
 * Seed popular job sources into the database
 */
export async function seedSources(): Promise<void> {
  showHeader('Seeding Job Sources', '🌱');

  const spinner = ora('Adding popular job boards...').start();

  try {
    seedAllSources();
    spinner.succeed('Job sources seeded successfully!');

    // Show summary
    const sources = getAllSources(false);
    console.log(chalk.green(`\n✓ Total sources available: ${sources.length}`));
    console.log(chalk.gray('  Run "npm start -- jobs sync" to fetch jobs from all sources.\n'));
  } catch (error) {
    spinner.fail('Failed to seed job sources');
    throw error;
  }
}

/**
 * List all job sources
 */
export async function listSources(): Promise<void> {
  showHeader('Job Sources', '📡');

  const sources = getAllSources(false);

  if (sources.length === 0) {
    console.log(chalk.yellow('No job sources configured.'));
    console.log(chalk.gray('Run "npm start -- sources seed" to add popular sources.\n'));
    return;
  }

  const table = new Table({
    head: ['ID', 'Name', 'Type', 'Enabled', 'Last Sync'].map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const source of sources) {
    const enabledIcon = source.enabled ? chalk.green('✓') : chalk.red('✗');
    const lastSync = source.lastSyncAt
      ? new Date(source.lastSyncAt).toLocaleString()
      : chalk.gray('Never');

    table.push([
      source.id.toString(),
      source.name,
      source.type,
      enabledIcon,
      lastSync,
    ]);
  }

  console.log(table.toString());
  console.log(chalk.gray(`\nTotal: ${sources.length} sources\n`));
}

/**
 * Add a custom Greenhouse company
 */
export async function addGreenhouseSource(companyName: string, boardToken: string): Promise<void> {
  try {
    addGreenhouseCompany(companyName, boardToken);
    showSuccess(`Added Greenhouse board: ${companyName}`);
  } catch (error) {
    throw error;
  }
}

/**
 * Add a custom Lever company
 */
export async function addLeverSource(companyName: string, site: string): Promise<void> {
  try {
    addLeverCompany(companyName, site);
    showSuccess(`Added Lever board: ${companyName}`);
  } catch (error) {
    throw error;
  }
}

/**
 * Add a custom RSS feed
 */
export async function addRssSource(name: string, url: string): Promise<void> {
  try {
    addRssFeed(name, url);
    showSuccess(`Added RSS feed: ${name}`);
  } catch (error) {
    throw error;
  }
}
