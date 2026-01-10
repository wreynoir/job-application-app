#!/usr/bin/env node

/**
 * Job Application Copilot - Main CLI Entry Point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, validateConfig } from '../utils/config';

const program = new Command();

// CLI metadata
program
  .name('copilot')
  .description('Job Application Copilot - Automate your job search with AI assistance')
  .version('0.1.0');

// Global options
program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-d, --debug', 'Enable debug mode')
  .option('-q, --quiet', 'Suppress non-error output');

// Onboard command
program
  .command('onboard')
  .description('Start the interactive onboarding wizard to set up your profile')
  .action(async () => {
    const { runOnboarding } = await import('./onboard');
    await runOnboarding();
  });

// Profile commands
const profileCommand = program
  .command('profile')
  .description('Manage your user profile');

profileCommand
  .command('view')
  .description('View your profile')
  .option('--section <section>', 'View specific section (work_history, projects, skills, canonical_answers)')
  .action(async (options) => {
    const { viewProfile } = await import('./profile');
    await viewProfile(options.section);
  });

profileCommand
  .command('export')
  .description('Export profile to markdown')
  .option('--output <path>', 'Output file path', './profile.md')
  .action(async (options) => {
    const { exportProfile } = await import('./profile');
    await exportProfile(options.output);
  });

// Jobs commands
const jobsCommand = program
  .command('jobs')
  .description('Manage job postings');

jobsCommand
  .command('sync')
  .description('Sync jobs from all configured sources')
  .action(async () => {
    const { syncJobs } = await import('./jobs');
    await syncJobs();
  });

jobsCommand
  .command('list')
  .description('List available jobs')
  .option('--filter <criteria>', 'Filter jobs by criteria')
  .option('--remote', 'Show only remote jobs')
  .option('--company <name>', 'Filter by company name')
  .option('--title <title>', 'Filter by job title')
  .option('--limit <number>', 'Limit number of results', '50')
  .action(async (options) => {
    const { listJobs } = await import('./jobs');
    await listJobs(options);
  });

jobsCommand
  .command('queue <jobId>')
  .description('Add a job to your application queue')
  .action(async (jobId: string) => {
    const { queueJob } = await import('./jobs');
    await queueJob(jobId);
  });

jobsCommand
  .command('open <jobId>')
  .description('Open job posting in browser')
  .action(async (jobId: string) => {
    const { openJob } = await import('./jobs');
    await openJob(jobId);
  });

// Draft command
program
  .command('draft')
  .description('Generate AI draft answers for a job application')
  .option('--job <id>', 'Job ID to generate drafts for (required)')
  .option('--question <text>', 'Specific question to answer')
  .option('--word-limit <number>', 'Word limit for answers', '150')
  .action(async (options) => {
    if (!options.job) {
      console.log(chalk.red('❌ Error: --job <id> is required'));
      process.exit(1);
    }
    const { generateDrafts } = await import('./draft');
    await generateDrafts({
      job: options.job,
      question: options.question,
      wordLimit: options.wordLimit ? parseInt(options.wordLimit, 10) : undefined,
    });
  });

// Apply command
program
  .command('apply')
  .description('Start human-in-the-loop application workflow')
  .option('--job <id>', 'Job ID to apply for')
  .option('--skip-drafts', 'Skip draft generation step')
  .action(async (options) => {
    if (!options.job) {
      console.log(chalk.red('❌ Error: --job <id> is required'));
      process.exit(1);
    }
    console.log(chalk.blue(`🤖 Starting application workflow for job ${options.job}...`));
    console.log(chalk.yellow('\n⚠️  This command is not yet implemented.'));
    console.log(chalk.gray('Coming in Milestone 5: Browser Automation\n'));
  });

// Config command - for testing configuration
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    console.log(chalk.blue('⚙️  Configuration:\n'));

    try {
      const config = getConfig();
      const errors = validateConfig(config);

      console.log(chalk.gray('AI Provider:'), chalk.white(config.aiProvider));
      console.log(chalk.gray('AI Model:'), chalk.white(config.aiModel));
      console.log(chalk.gray('Database Path:'), chalk.white(config.dbPath));
      console.log(chalk.gray('Chrome Profile:'), chalk.white(config.chromeProfilePath || '(not set)'));
      console.log(chalk.gray('Log Level:'), chalk.white(config.logging.level));
      console.log(chalk.gray('Notifications:'), chalk.white(config.notifications.enabled ? 'enabled' : 'disabled'));

      console.log(chalk.gray('\nRate Limits:'));
      console.log(chalk.gray('  RSS:'), chalk.white(`${config.rateLimits.rss}/min`));
      console.log(chalk.gray('  API:'), chalk.white(`${config.rateLimits.api}/hour`));
      console.log(chalk.gray('  Web:'), chalk.white(`${config.rateLimits.web}/min`));

      if (errors.length > 0) {
        console.log(chalk.red('\n❌ Configuration Errors:'));
        errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✓ Configuration is valid'));
      }
    } catch (error) {
      console.log(chalk.red('\n❌ Error loading configuration:'));
      console.log(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
