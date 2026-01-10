/**
 * CLI helper utilities for consistent output and UX
 */

import chalk from 'chalk';

/**
 * Display a success message with icon
 */
export function showSuccess(message: string, details?: string[]): void {
  console.log('\n' + chalk.green('✓ ') + chalk.green.bold(message));
  if (details && details.length > 0) {
    console.log('');
    details.forEach((detail) => {
      console.log(chalk.gray(`  ${detail}`));
    });
  }
  console.log('');
}

/**
 * Display an info message with icon
 */
export function showInfo(message: string, details?: string[]): void {
  console.log('\n' + chalk.blue('ℹ ') + chalk.blue(message));
  if (details && details.length > 0) {
    console.log('');
    details.forEach((detail) => {
      console.log(chalk.gray(`  ${detail}`));
    });
  }
  console.log('');
}

/**
 * Display a warning message with icon
 */
export function showWarning(message: string, details?: string[]): void {
  console.log('\n' + chalk.yellow('⚠ ') + chalk.yellow(message));
  if (details && details.length > 0) {
    console.log('');
    details.forEach((detail) => {
      console.log(chalk.gray(`  ${detail}`));
    });
  }
  console.log('');
}

/**
 * Display next steps to the user
 */
export function showNextSteps(title: string, steps: string[]): void {
  console.log('\n' + chalk.cyan.bold('💡 ' + title));
  steps.forEach((step, index) => {
    console.log(chalk.cyan(`  ${index + 1}. ${step}`));
  });
  console.log('');
}

/**
 * Display a section header
 */
export function showHeader(title: string, icon?: string): void {
  const displayIcon = icon || '📋';
  console.log('\n' + chalk.bold(`${displayIcon} ${title}\n`));
}

/**
 * Display a divider line
 */
export function showDivider(): void {
  console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Format a job for display
 */
export function formatJobDisplay(job: {
  id: number;
  title: string;
  company: string;
  location?: string;
  url: string;
}): void {
  console.log(chalk.bold.white(`Job: ${job.title} at ${job.company}`));
  if (job.location) {
    console.log(chalk.gray(`Location: ${job.location}`));
  }
  console.log(chalk.gray(`URL: ${job.url}`));
}

/**
 * Prompt user to confirm action
 */
export function confirmationPrompt(message: string): string {
  return chalk.yellow(`? ${message} (y/N): `);
}

/**
 * Show loading message
 */
export function showLoading(message: string): void {
  console.log(chalk.blue(`⏳ ${message}...`));
}

/**
 * Clear the last line (for updating loading messages)
 */
export function clearLine(): void {
  process.stdout.write('\r\x1b[K');
}

/**
 * Display a tip or helpful hint
 */
export function showTip(message: string): void {
  console.log(chalk.cyan('💡 Tip: ') + chalk.gray(message));
}

/**
 * Display an emoji-formatted list
 */
export function showList(items: string[], icon = '•'): void {
  items.forEach((item) => {
    console.log(chalk.white(`  ${icon} ${item}`));
  });
}
