/**
 * Jobs CLI commands implementation
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { syncAllJobs } from '../connectors/sync';
import {
  getAllJobs,
  getJobById,
  updateJobStatus,
  createApplication,
  initializeDatabase,
} from '../db/client';
import { logger } from '../utils/logger';
import { audit } from '../utils/audit';
import type { JobListOptions } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Sync jobs from all sources
 */
export async function syncJobs(): Promise<void> {
  console.log(chalk.blue('\n🔄 Syncing jobs from all sources...\n'));

  const spinner = ora('Initializing database...').start();

  try {
    // Initialize database
    initializeDatabase();
    spinner.succeed('Database initialized');

    // Start sync
    spinner.start('Fetching jobs from sources...');

    const results = await syncAllJobs();

    spinner.stop();

    // Display results
    console.log(chalk.green(`\n✓ Sync completed in ${(results.duration / 1000).toFixed(2)}s\n`));

    if (results.sources.length === 0) {
      console.log(chalk.yellow('⚠  No sources configured. Add sources to start syncing jobs.'));
      console.log(chalk.gray('\nTip: Sources can be added directly to the database or via API.'));
      return;
    }

    // Display per-source results
    const table = new Table({
      head: [
        chalk.cyan('Source'),
        chalk.cyan('Status'),
        chalk.cyan('Found'),
        chalk.cyan('New'),
        chalk.cyan('Skipped'),
      ],
      colWidths: [30, 12, 10, 10, 10],
    });

    results.sources.forEach((source) => {
      table.push([
        source.sourceName,
        source.success ? chalk.green('✓') : chalk.red('✗'),
        source.jobsFound.toString(),
        chalk.green(source.jobsNew.toString()),
        chalk.gray(source.jobsSkipped.toString()),
      ]);

      if (!source.success && source.error) {
        console.log(chalk.red(`  Error: ${source.error}`));
      }
    });

    console.log(table.toString());

    // Summary
    console.log(chalk.bold('\nSummary:'));
    console.log(chalk.gray('  Total jobs found:'), chalk.white(results.totalFound));
    console.log(chalk.gray('  New jobs added:'), chalk.green(results.totalNew));
    console.log(chalk.gray('  Duplicates skipped:'), chalk.gray(results.totalSkipped));

    if (results.totalNew > 0) {
      console.log(chalk.blue(`\n💡 Run ${chalk.bold('copilot jobs:list')} to see the new jobs\n`));
    }
  } catch (error) {
    spinner.fail('Sync failed');
    console.log(chalk.red('\n❌ Error during sync:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Job sync error:', error);
    process.exit(1);
  }
}

/**
 * List jobs with optional filtering
 */
export async function listJobs(options: JobListOptions): Promise<void> {
  try {
    initializeDatabase();

    const filters = {
      status: options.status,
      remote: options.remote,
      company: options.company,
      title: options.title,
      limit: options.limit ? parseInt(String(options.limit), 10) : 50,
    };

    const jobs = getAllJobs(filters);

    if (jobs.length === 0) {
      console.log(chalk.yellow('\n⚠  No jobs found matching your criteria.'));
      console.log(chalk.gray(`\nTip: Run ${chalk.bold('copilot jobs:sync')} to fetch jobs\n`));
      return;
    }

    console.log(chalk.blue(`\n📋 Found ${jobs.length} jobs\n`));

    // Create table
    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Title'),
        chalk.cyan('Company'),
        chalk.cyan('Location'),
        chalk.cyan('Remote'),
        chalk.cyan('Status'),
      ],
      colWidths: [6, 30, 20, 20, 10, 12],
      wordWrap: true,
    });

    jobs.forEach((job) => {
      const remoteIcon = getRemoteIcon(job.remoteType);
      const statusColor = getStatusColor(job.status);

      table.push([
        chalk.gray(job.id.toString()),
        job.title,
        job.company,
        job.location || chalk.gray('N/A'),
        remoteIcon,
        statusColor(job.status),
      ]);
    });

    console.log(table.toString());

    // Show command hints
    console.log(chalk.gray('\nCommands:'));
    console.log(chalk.gray(`  ${chalk.bold('copilot jobs:queue <id>')}  - Add job to queue`));
    console.log(chalk.gray(`  ${chalk.bold('copilot jobs:open <id>')}   - Open job in browser`));
    console.log();
  } catch (error) {
    console.log(chalk.red('\n❌ Error listing jobs:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Job list error:', error);
    process.exit(1);
  }
}

/**
 * Queue a job for application
 */
export async function queueJob(jobId: string): Promise<void> {
  try {
    initializeDatabase();

    const id = parseInt(jobId, 10);
    if (isNaN(id)) {
      console.log(chalk.red('\n❌ Invalid job ID'));
      return;
    }

    const job = getJobById(id);

    if (!job) {
      console.log(chalk.red(`\n❌ Job not found: ${jobId}`));
      return;
    }

    // Update job status
    updateJobStatus(id, 'queued');

    // Create application record
    createApplication(id);

    // Audit log
    audit('job_queue', 'job', id, true, {
      title: job.title,
      company: job.company,
    });

    console.log(chalk.green(`\n✓ Job queued successfully!\n`));
    console.log(chalk.gray('  Job:'), chalk.white(`${job.title} at ${job.company}`));
    console.log(chalk.gray('  URL:'), chalk.blue(job.url));

    console.log(chalk.gray(`\n💡 Next steps:`));
    console.log(chalk.gray(`  1. ${chalk.bold('copilot draft --job ' + id)} - Generate draft answers`));
    console.log(chalk.gray(`  2. ${chalk.bold('copilot apply --job ' + id)} - Start application\n`));
  } catch (error) {
    console.log(chalk.red('\n❌ Error queueing job:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Job queue error:', error);
    process.exit(1);
  }
}

/**
 * Open job in browser
 */
export async function openJob(jobId: string): Promise<void> {
  try {
    initializeDatabase();

    const id = parseInt(jobId, 10);
    if (isNaN(id)) {
      console.log(chalk.red('\n❌ Invalid job ID'));
      return;
    }

    const job = getJobById(id);

    if (!job) {
      console.log(chalk.red(`\n❌ Job not found: ${jobId}`));
      return;
    }

    console.log(chalk.blue(`\n🌐 Opening job in browser...\n`));
    console.log(chalk.gray('  Job:'), chalk.white(`${job.title} at ${job.company}`));
    console.log(chalk.gray('  URL:'), chalk.blue(job.url));

    // Open URL in default browser
    let command: string;
    switch (process.platform) {
      case 'darwin':
        command = `open "${job.url}"`;
        break;
      case 'win32':
        command = `start "${job.url}"`;
        break;
      default:
        command = `xdg-open "${job.url}"`;
    }

    await execAsync(command);

    console.log(chalk.green('\n✓ Opened in browser\n'));

    // Audit log
    audit('job_queue', 'job', id, true, {
      title: job.title,
      company: job.company,
      url: job.url,
    });
  } catch (error) {
    console.log(chalk.red('\n❌ Error opening job:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Job open error:', error);
    process.exit(1);
  }
}

// ==================== Helper Functions ====================

function getRemoteIcon(remoteType: string): string {
  switch (remoteType) {
    case 'remote':
      return chalk.green('🏠 Remote');
    case 'hybrid':
      return chalk.yellow('🔀 Hybrid');
    case 'onsite':
      return chalk.gray('🏢 Onsite');
    default:
      return chalk.gray('❓ Unknown');
  }
}

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'new':
      return chalk.blue;
    case 'reviewed':
      return chalk.cyan;
    case 'queued':
      return chalk.yellow;
    case 'applied':
      return chalk.green;
    case 'rejected':
      return chalk.red;
    case 'archived':
      return chalk.gray;
    default:
      return chalk.white;
  }
}
