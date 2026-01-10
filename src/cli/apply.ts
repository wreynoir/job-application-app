/**
 * Application workflow CLI command
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getJobById,
  getApplicationByJobId,
  createApplication,
  initializeDatabase,
  updateJobStatus,
} from '../db/client';
import { createPage } from '../browser/launcher';
import { runApplicationWorkflow } from '../browser/automator';
import { logger } from '../utils/logger';
import { audit } from '../utils/audit';

export interface ApplyOptions {
  job: string;
  skipDrafts?: boolean;
}

/**
 * Start application workflow
 */
export async function startApplication(options: ApplyOptions): Promise<void> {
  let page;

  try {
    initializeDatabase();

    const jobId = parseInt(options.job, 10);
    if (isNaN(jobId)) {
      console.log(chalk.red('\n❌ Invalid job ID'));
      return;
    }

    // Get job details
    const job = getJobById(jobId);
    if (!job) {
      console.log(chalk.red(`\n❌ Job not found: ${jobId}`));
      return;
    }

    console.log(chalk.blue.bold('\n🤖 Job Application Copilot - Apply Workflow\n'));
    console.log(chalk.gray('  Job:'), chalk.white(`${job.title} at ${job.company}`));
    console.log(chalk.gray('  URL:'), chalk.blue(job.url));
    console.log();

    // Check if application already exists
    let application = getApplicationByJobId(jobId);

    if (application) {
      console.log(chalk.yellow(`⚠️  An application for this job already exists (Status: ${application.status})`));

      const { continueAnyway } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAnyway',
          message: 'Continue anyway?',
          default: false,
        },
      ]);

      if (!continueAnyway) {
        console.log(chalk.gray('\n👋 Application cancelled\n'));
        return;
      }
    } else {
      // Create new application
      application = createApplication(jobId);
    }

    // Confirm before launching browser
    const { ready } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ready',
        message: 'Ready to launch browser and start application?',
        default: true,
      },
    ]);

    if (!ready) {
      console.log(chalk.gray('\n👋 Application cancelled\n'));
      return;
    }

    console.log(chalk.blue('\n🚀 Launching browser...\n'));

    // Create browser page
    page = await createPage();

    // Update job status
    updateJobStatus(jobId, 'applied');

    // Audit log
    audit('application_start', 'application', application.id, true, {
      jobId,
      jobTitle: job.title,
      jobCompany: job.company,
    });

    // Display instructions
    displayWorkflowInstructions();

    // Run automation workflow
    const result = await runApplicationWorkflow(page, {
      applicationId: application.id,
      jobId,
      jobUrl: job.url,
      jobTitle: job.title,
      jobCompany: job.company,
    });

    if (result.success) {
      console.log(chalk.green.bold('\n✅ Application workflow completed successfully!\n'));
      console.log(chalk.gray('All steps logged in database'));
      console.log(chalk.gray(`Application ID: ${application.id}\n`));

      logger.info('Application completed', {
        applicationId: application.id,
        jobId,
      });
    } else {
      console.log(chalk.red.bold(`\n❌ Application workflow failed: ${result.message}\n`));
      logger.error('Application failed', {
        applicationId: application.id,
        jobId,
        error: result.message,
      });
    }

    // Ask if user wants to close browser
    const { closeBrowserNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'closeBrowserNow',
        message: 'Close browser window?',
        default: false,
      },
    ]);

    if (closeBrowserNow && page) {
      await page.close();
      console.log(chalk.gray('\n✓ Browser closed\n'));
    } else {
      console.log(chalk.gray('\n💡 Browser left open for you to review/complete the application\n'));
      console.log(chalk.gray('   Close it manually when done\n'));
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Error during application:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Application error:', error);

    // Close browser on error
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    process.exit(1);
  }
}

/**
 * Display workflow instructions
 */
function displayWorkflowInstructions(): void {
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('               APPLICATION WORKFLOW GUIDE'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════'));
  console.log();
  console.log(chalk.white('  How this works:'));
  console.log(chalk.gray('  1. Browser will open with the job application page'));
  console.log(chalk.gray('  2. Tool monitors for human-required steps (CAPTCHA, 2FA, etc.)'));
  console.log(chalk.gray('  3. When detected, you\'ll be notified to complete them'));
  console.log(chalk.gray('  4. Tool automatically resumes after you complete each step'));
  console.log(chalk.gray('  5. All actions are logged for compliance'));
  console.log();
  console.log(chalk.yellow('  ⚠️  Important:'));
  console.log(chalk.gray('  • You must manually submit the final application'));
  console.log(chalk.gray('  • Review all information before submission'));
  console.log(chalk.gray('  • Desktop notifications will alert you when action needed'));
  console.log();
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════'));
  console.log();
}
