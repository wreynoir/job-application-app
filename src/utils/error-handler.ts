/**
 * Centralized error handling for CLI commands
 */

import chalk from 'chalk';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestions?: string[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, suggestions?: string[]) {
    super(message, 'VALIDATION_ERROR', suggestions);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, suggestions?: string[]) {
    super(message, 'CONFIGURATION_ERROR', suggestions);
    this.name = 'ConfigurationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, suggestions?: string[]) {
    super(message, 'DATABASE_ERROR', suggestions);
    this.name = 'DatabaseError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, suggestions?: string[]) {
    super(message, 'NETWORK_ERROR', suggestions);
    this.name = 'NetworkError';
  }
}

export class AIError extends AppError {
  constructor(message: string, suggestions?: string[]) {
    super(message, 'AI_ERROR', suggestions);
    this.name = 'AIError';
  }
}

/**
 * Handle errors in CLI commands with user-friendly messages
 */
export function handleError(error: unknown, context?: string): void {
  logger.error(`Error ${context ? `in ${context}` : ''}:`, error);

  console.error('\n' + chalk.red.bold('❌ Error:'));

  if (error instanceof AppError) {
    console.error(chalk.red(error.message));

    if (error.suggestions && error.suggestions.length > 0) {
      console.error('\n' + chalk.yellow('💡 Suggestions:'));
      error.suggestions.forEach((suggestion) => {
        console.error(chalk.yellow(`  • ${suggestion}`));
      });
    }
  } else if (error instanceof Error) {
    console.error(chalk.red(error.message));

    // Provide specific suggestions based on error type
    if (error.message.includes('ENOENT')) {
      console.error('\n' + chalk.yellow('💡 Suggestion:'));
      console.error(chalk.yellow('  • The file or directory does not exist. Check the path.'));
    } else if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
      console.error('\n' + chalk.yellow('💡 Suggestion:'));
      console.error(chalk.yellow('  • Permission denied. Check file permissions or run with appropriate privileges.'));
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n' + chalk.yellow('💡 Suggestion:'));
      console.error(chalk.yellow('  • Network issue. Check your internet connection and the URL.'));
    } else if (error.message.includes('SQLITE') || error.message.includes('database')) {
      console.error('\n' + chalk.yellow('💡 Suggestion:'));
      console.error(chalk.yellow('  • Database error. Try deleting the database and running the command again.'));
    }
  } else {
    console.error(chalk.red(String(error)));
  }

  console.error(''); // Empty line for spacing
  process.exit(1);
}

/**
 * Wrap async CLI command handlers with error handling
 */
export function wrapCommand<T extends unknown[]>(
  fn: (...args: T) => Promise<void>,
  context?: string
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await fn(...args);
    } catch (error) {
      handleError(error, context);
    }
  };
}

/**
 * Validate that a string is not empty
 */
export function validateNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

/**
 * Validate that a number is positive
 */
export function validatePositive(value: number, fieldName: string): void {
  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be positive`);
  }
}

/**
 * Validate that a value is one of the allowed options
 */
export function validateEnum<T>(value: T, allowedValues: T[], fieldName: string): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, fieldName: string): void {
  try {
    new URL(url);
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`, [
      'Example: https://example.com/jobs',
    ]);
  }
}
