/**
 * Interactive setup wizard for first-time users
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { showHeader, showSuccess, showNextSteps } from '../utils/cli-helpers';

interface SetupAnswers {
  anthropicKey: string;
  chromeProfilePath: string;
  enableNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Run the interactive setup wizard
 */
export async function runSetupWizard(): Promise<void> {
  showHeader('Welcome to Job Application Copilot!', '🚀');

  console.log(chalk.white('This setup wizard will help you configure the tool.\n'));
  console.log(chalk.gray('You can always change these settings later by editing the .env file.\n'));

  // Check if .env already exists
  const envPath = path.join(process.cwd(), '.env');

  if (fs.existsSync(envPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'An .env file already exists. Do you want to reconfigure?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\n✓ Keeping existing configuration.\n'));
      return;
    }
  }

  // Gather configuration
  const answers = await inquirer.prompt<SetupAnswers>([
    {
      type: 'input',
      name: 'anthropicKey',
      message: 'Enter your Anthropic API key:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'API key is required. Get one at: https://console.anthropic.com/';
        }
        if (!input.startsWith('sk-ant-')) {
          return 'Invalid Anthropic API key format. Should start with "sk-ant-"';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'chromeProfilePath',
      message: 'Enter your Chrome profile path (optional, press Enter to skip):',
      default: '',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return true; // Optional
        }
        if (!fs.existsSync(input)) {
          return `Path does not exist: ${input}\nFind it in Chrome → chrome://version/ → "Profile Path"`;
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'enableNotifications',
      message: 'Enable desktop notifications?',
      default: true,
    },
    {
      type: 'list',
      name: 'logLevel',
      message: 'Select log level:',
      choices: [
        { name: 'Info (Recommended)', value: 'info' },
        { name: 'Debug (Verbose)', value: 'debug' },
        { name: 'Warning', value: 'warn' },
        { name: 'Error', value: 'error' },
      ],
      default: 'info',
    },
  ]);

  // Create .env file
  const envContent = `# AI API Configuration
# Choose one of the following AI providers:

# Anthropic Claude API (Recommended)
ANTHROPIC_API_KEY=${answers.anthropicKey}

# OpenAI API (Alternative)
# OPENAI_API_KEY=your_openai_api_key_here

# AI Model Selection (optional, defaults to claude-3-5-sonnet-20241022)
# AI_MODEL=claude-3-5-sonnet-20241022
# AI_MODEL=gpt-4-turbo-preview

# Database Configuration
DB_PATH=./data/copilot.db

# Browser Configuration
# Path to your Chrome user profile directory (where Simplify extension is installed)
# macOS example: /Users/YOUR_USERNAME/Library/Application Support/Google/Chrome/Default
# Windows example: C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Google\\Chrome\\User Data\\Default
# Linux example: /home/YOUR_USERNAME/.config/google-chrome/Default
CHROME_PROFILE_PATH=${answers.chromeProfilePath}

# Job Source Configuration (Optional)
# Greenhouse API
GREENHOUSE_API_KEY=

# Lever API
LEVER_API_KEY=

# Rate Limiting (requests per minute)
RATE_LIMIT_RSS=1
RATE_LIMIT_API=100
RATE_LIMIT_WEB=12

# Logging
LOG_LEVEL=${answers.logLevel}
# Options: debug, info, warn, error

# Notification Settings
ENABLE_DESKTOP_NOTIFICATIONS=${answers.enableNotifications}
`;

  fs.writeFileSync(envPath, envContent, 'utf-8');

  showSuccess('Configuration saved successfully!', [
    `Configuration file: ${envPath}`,
    'You can edit this file anytime to update your settings.',
  ]);

  // Show next steps
  showNextSteps('Get Started', [
    'Run "npm start -- onboard" to create your profile',
    'Run "npm start -- jobs sync" to fetch available jobs',
    'Run "npm start -- jobs list" to browse jobs',
    'Run "npm start -- --help" to see all commands',
  ]);

  // Offer to run onboarding now
  const { runOnboarding } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'runOnboarding',
      message: 'Would you like to create your profile now?',
      default: true,
    },
  ]);

  if (runOnboarding) {
    console.log('');
    const { runOnboarding: onboardModule } = await import('./onboard');
    await onboardModule();
  } else {
    console.log(chalk.gray('\nRun "npm start -- onboard" when you\'re ready to create your profile.\n'));
  }
}

/**
 * Check if setup is needed (no .env file exists)
 */
export function needsSetup(): boolean {
  const envPath = path.join(process.cwd(), '.env');
  return !fs.existsSync(envPath);
}

/**
 * Show setup reminder if .env doesn't exist
 */
export function showSetupReminder(): void {
  console.log(chalk.yellow('\n⚠ ') + chalk.yellow('Configuration not found!'));
  console.log(chalk.gray('  Run ') + chalk.cyan('npm start -- setup') + chalk.gray(' to configure the tool.'));
  console.log(chalk.gray('  Or copy .env.example to .env and edit it manually.\n'));
}
