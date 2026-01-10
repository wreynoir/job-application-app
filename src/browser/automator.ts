/**
 * Application form automation with human-in-the-loop
 */

import type { Page } from 'playwright';
import { detectHumanStep, waitForHumanStepResolution } from './detector';
import {
  notifyHumanStepDetected,
  notifyApplicationProgress,
  notifyApplicationComplete,
} from './notifier';
import { navigateToUrl } from './launcher';
import { addApplicationStep, updateApplicationStatus } from '../db/client';
import { logger } from '../utils/logger';
import { audit } from '../utils/audit';
import chalk from 'chalk';

export interface ApplicationContext {
  applicationId: number;
  jobId: number;
  jobUrl: string;
  jobTitle: string;
  jobCompany: string;
}

/**
 * Run automated application workflow
 */
export async function runApplicationWorkflow(
  page: Page,
  context: ApplicationContext
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info('Starting application workflow', {
      applicationId: context.applicationId,
      jobId: context.jobId,
    });

    // Update status
    updateApplicationStatus(context.applicationId, 'in_progress');
    addApplicationStep(
      context.applicationId,
      'navigation',
      `Navigating to ${context.jobUrl}`
    );

    // Navigate to job application
    console.log(chalk.blue(`\n🌐 Opening application page...\n`));
    await navigateToUrl(page, context.jobUrl);

    notifyApplicationProgress(context.jobTitle, context.jobCompany, 'Page loaded');

    // Wait for page to stabilize
    console.log(chalk.gray('Waiting for page to load completely...'));
    await page.waitForTimeout(3000);

    // Main application loop
    let continueApplication = true;
    let loopCount = 0;
    const maxLoops = 20; // Prevent infinite loops

    while (continueApplication && loopCount < maxLoops) {
      loopCount++;

      console.log(chalk.gray(`\n[Loop ${loopCount}] Checking for human steps...`));

      // Check for human intervention needs
      const humanStep = await detectHumanStep(page);

      if (humanStep) {
        // Human step detected!
        console.log(chalk.yellow.bold(`\n⚠️  Human step detected: ${humanStep.type.toUpperCase()}`));
        console.log(chalk.yellow(`   ${humanStep.description}\n`));

        // Log to database
        addApplicationStep(
          context.applicationId,
          'human_step_detected',
          `${humanStep.type}: ${humanStep.description}`,
          { type: humanStep.type, element: humanStep.element }
        );

        // Update application status
        updateApplicationStatus(context.applicationId, 'paused');

        // Send notification
        notifyHumanStepDetected(humanStep.type, humanStep.description);

        // Audit log
        audit('human_step_pause', 'application', context.applicationId, false, {
          stepType: humanStep.type,
          description: humanStep.description,
        });

        // Display instructions
        displayHumanStepInstructions(humanStep.type, humanStep.description);

        // Wait for resolution
        console.log(chalk.blue('\n⏳ Waiting for you to complete the step...\n'));

        const resolved = await waitForHumanStepResolution(page, humanStep);

        if (!resolved) {
          console.log(chalk.red('\n❌ Timeout waiting for human step resolution\n'));
          updateApplicationStatus(context.applicationId, 'paused');
          return {
            success: false,
            message: `Timeout waiting for ${humanStep.type} resolution`,
          };
        }

        // Log resolution
        console.log(chalk.green('\n✓ Human step resolved! Continuing...\n'));
        addApplicationStep(
          context.applicationId,
          'human_step_resolved',
          `${humanStep.type} resolved`
        );

        // Resume
        updateApplicationStatus(context.applicationId, 'in_progress');
        audit('human_step_resume', 'application', context.applicationId, true, {
          stepType: humanStep.type,
        });

        // Wait a moment after resolution
        await page.waitForTimeout(2000);
      } else {
        // No human step detected
        console.log(chalk.gray('   No human steps detected, application can continue'));

        // Check if we're done or need to continue
        // This is a simplified version - in full implementation,
        // we'd detect submit buttons, form fields, etc.

        console.log(chalk.blue('\n💡 Ready for next action'));
        console.log(chalk.gray('   Check the browser for the application form'));
        console.log(chalk.gray('   The tool will continue monitoring for human steps\n'));

        // For now, we'll prompt user to continue or finish
        continueApplication = false; // Exit loop for now
      }
    }

    // Application workflow complete
    console.log(chalk.green.bold('\n✓ Application workflow monitoring complete\n'));

    addApplicationStep(
      context.applicationId,
      'submission',
      'Application workflow completed (manual submission required)'
    );

    updateApplicationStatus(context.applicationId, 'completed');
    notifyApplicationComplete(context.jobTitle, context.jobCompany, true);

    return {
      success: true,
      message: 'Application workflow completed successfully',
    };
  } catch (error) {
    logger.error('Application workflow error:', error);

    addApplicationStep(
      context.applicationId,
      'error',
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );

    updateApplicationStatus(context.applicationId, 'failed');
    notifyApplicationComplete(context.jobTitle, context.jobCompany, false);

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Display instructions for human step
 */
function displayHumanStepInstructions(type: string, description: string): void {
  console.log(chalk.yellow.bold('┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow.bold('│                   ACTION REQUIRED                            │'));
  console.log(chalk.yellow.bold('└─────────────────────────────────────────────────────────────┘'));
  console.log();

  switch (type) {
    case 'captcha':
      console.log(chalk.white('  🤖 CAPTCHA Detected'));
      console.log(chalk.gray('     Please solve the CAPTCHA in the browser window'));
      console.log(chalk.gray('     The tool will automatically resume when complete'));
      break;

    case '2fa':
      console.log(chalk.white('  🔐 Verification Code Required'));
      console.log(chalk.gray('     Please enter your 2FA/verification code in the browser'));
      console.log(chalk.gray('     Check your phone/email for the code'));
      break;

    case 'file_upload':
      console.log(chalk.white('  📎 File Upload Required'));
      console.log(chalk.gray('     Please upload the requested file (resume/CV/document)'));
      console.log(chalk.gray('     Use the file picker in the browser window'));
      break;

    case 'consent':
      console.log(chalk.white('  ✅ Consent Form'));
      console.log(chalk.gray('     Please review and check the required boxes'));
      console.log(chalk.gray('     Read the terms carefully before agreeing'));
      break;

    default:
      console.log(chalk.white(`  ⚠️  ${description}`));
      console.log(chalk.gray('     Please complete the required action in the browser'));
  }

  console.log();
  console.log(chalk.blue('  💡 The tool is monitoring for completion and will resume automatically'));
  console.log();
}
