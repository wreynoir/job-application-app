/**
 * Configuration management for Job Application Copilot
 */

import dotenv from 'dotenv';
import { AppConfig } from '../types';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Get application configuration from environment variables
 */
export function getConfig(): AppConfig {
  // Determine AI provider based on which API key is set
  const hasAnthropicKey = !!process.env['ANTHROPIC_API_KEY'];
  const hasOpenAIKey = !!process.env['OPENAI_API_KEY'];

  let aiProvider: 'anthropic' | 'openai' = 'anthropic';
  let aiModel = 'claude-4-5-haiku-20250514'; // Claude 4.5 Haiku (newest)

  if (hasOpenAIKey && !hasAnthropicKey) {
    aiProvider = 'openai';
    aiModel = 'gpt-4-turbo-preview';
  }

  // Override with explicit model selection if provided
  const envModel = process.env['AI_MODEL'];
  if (envModel) {
    aiModel = envModel;
    if (aiModel.startsWith('gpt-')) {
      aiProvider = 'openai';
    } else if (aiModel.startsWith('claude-')) {
      aiProvider = 'anthropic';
    }
  }

  return {
    aiProvider,
    aiModel,
    dbPath: process.env['DB_PATH'] || path.join(process.cwd(), 'data', 'copilot.db'),
    chromeProfilePath: process.env['CHROME_PROFILE_PATH'] || '',
    indeedPublisherId: process.env['INDEED_PUBLISHER_ID'],
    adzunaAppId: process.env['ADZUNA_APP_ID'],
    adzunaAppKey: process.env['ADZUNA_APP_KEY'],
    jsearchApiKey: process.env['JSEARCH_API_KEY'],
    rateLimits: {
      rss: parseInt(process.env['RATE_LIMIT_RSS'] || '1', 10),
      api: parseInt(process.env['RATE_LIMIT_API'] || '100', 10),
      web: parseInt(process.env['RATE_LIMIT_WEB'] || '12', 10),
    },
    logging: {
      level: (process.env['LOG_LEVEL'] as 'debug' | 'info' | 'warn' | 'error') || 'info',
    },
    notifications: {
      enabled: process.env['ENABLE_DESKTOP_NOTIFICATIONS'] !== 'false',
    },
  };
}

/**
 * Validate required configuration
 */
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  // Check AI API keys
  if (config.aiProvider === 'anthropic' && !process.env['ANTHROPIC_API_KEY']) {
    errors.push('ANTHROPIC_API_KEY is required when using Anthropic AI provider');
  }

  if (config.aiProvider === 'openai' && !process.env['OPENAI_API_KEY']) {
    errors.push('OPENAI_API_KEY is required when using OpenAI AI provider');
  }

  // Chrome profile path is optional initially but required for apply command
  if (!config.chromeProfilePath) {
    // This is just a warning, not a hard error
    console.warn('Warning: CHROME_PROFILE_PATH not set. Browser automation will not work.');
  }

  return errors;
}

/**
 * Get API key for the configured AI provider
 */
export function getAIApiKey(provider: 'anthropic' | 'openai'): string {
  const key = provider === 'anthropic'
    ? process.env['ANTHROPIC_API_KEY']
    : process.env['OPENAI_API_KEY'];

  if (!key) {
    throw new Error(`${provider.toUpperCase()}_API_KEY environment variable is not set`);
  }

  return key;
}
