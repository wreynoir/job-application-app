/**
 * Startup checks and welcome messages
 */

import chalk from 'chalk';
import fs from 'fs';
import { getConfig, validateConfig } from './config';
import { ConfigurationError } from './error-handler';

/**
 * Check if this is the first run (no database exists)
 */
export function isFirstRun(): boolean {
  const config = getConfig();
  const dbExists = fs.existsSync(config.dbPath);
  return !dbExists;
}

/**
 * Show welcome message for first-time users
 */
export function showWelcomeMessage(): void {
  console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
  console.log(chalk.bold.cyan('   Welcome to Job Application Copilot! 🚀'));
  console.log(chalk.bold.cyan('═'.repeat(60)) + '\n');

  console.log(chalk.white('This tool helps you automate job applications with AI assistance'));
  console.log(chalk.white('while maintaining human oversight and safety.\n'));

  console.log(chalk.yellow.bold('Getting Started:\n'));
  console.log(chalk.yellow('  1. Run ') + chalk.cyan.bold('npm start -- onboard') + chalk.yellow(' to create your profile'));
  console.log(chalk.yellow('  2. Run ') + chalk.cyan.bold('npm start -- jobs sync') + chalk.yellow(' to fetch jobs'));
  console.log(chalk.yellow('  3. Run ') + chalk.cyan.bold('npm start -- jobs list') + chalk.yellow(' to browse available jobs'));
  console.log(chalk.yellow('  4. Use ') + chalk.cyan.bold('npm start -- --help') + chalk.yellow(' to see all commands\n'));

  console.log(chalk.gray('Need help? Check the README.md or run ') + chalk.cyan('npm start -- config'));
  console.log(chalk.gray('to verify your configuration.\n'));
}

/**
 * Validate configuration at startup
 */
export function validateStartupConfig(): void {
  try {
    const config = getConfig();
    const errors = validateConfig(config);

    if (errors.length > 0) {
      throw new ConfigurationError(
        'Configuration validation failed',
        errors.concat([
          '',
          'Please check your .env file and ensure all required variables are set.',
          'See .env.example for reference.',
        ])
      );
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError('Failed to load configuration', [
      'Make sure you have a .env file in the project root',
      'Copy .env.example to .env and fill in your API keys',
    ]);
  }
}

/**
 * Check if user profile exists
 */
export function hasUserProfile(): boolean {
  try {
    const config = getConfig();
    if (!fs.existsSync(config.dbPath)) {
      return false;
    }

    // TODO: Add actual check for profile in database
    // For now, just check if database exists
    return fs.existsSync(config.dbPath);
  } catch {
    return false;
  }
}

/**
 * Show reminder to create profile if it doesn't exist
 */
export function showProfileReminder(): void {
  console.log(chalk.yellow('\n⚠ ') + chalk.yellow('No user profile found!'));
  console.log(chalk.gray('  Run ') + chalk.cyan('npm start -- onboard') + chalk.gray(' to create your profile.'));
  console.log(chalk.gray('  A complete profile helps generate better AI drafts.\n'));
}
