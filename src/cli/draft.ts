/**
 * Draft answer generation commands
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { generateDraftAnswers, validateAnswer } from '../ai/generator';
import { getJobById, createQAPair, initializeDatabase } from '../db/client';
import { logger } from '../utils/logger';
import { audit } from '../utils/audit';
import type { DraftAnswer } from '../types';

export interface DraftOptions {
  job: string;
  question?: string;
  wordLimit?: number;
}

/**
 * Generate draft answers for a job
 */
export async function generateDrafts(options: DraftOptions): Promise<void> {
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

    console.log(chalk.blue.bold('\n✍️  Draft Answer Generator\n'));
    console.log(chalk.gray('  Job:'), chalk.white(`${job.title} at ${job.company}`));
    console.log(chalk.gray('  URL:'), chalk.blue(job.url));
    console.log();

    // Get questions
    let questions: string[] = [];

    if (options.question) {
      questions = [options.question];
    } else {
      // Ask user for questions
      const { questionInput } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'questionInput',
          message: 'Enter application questions (one per line):',
        },
      ]);

      questions = questionInput
        .split('\n')
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0);

      if (questions.length === 0) {
        console.log(chalk.yellow('\n⚠  No questions provided. Exiting.\n'));
        return;
      }
    }

    console.log(chalk.blue(`\n📝 Generating drafts for ${questions.length} question(s)...\n`));

    // Generate drafts for each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]!;

      console.log(chalk.cyan.bold(`\nQuestion ${i + 1}/${questions.length}:`));
      console.log(chalk.white(`"${question}"\n`));

      const spinner = ora('Generating draft answers...').start();

      try {
        const result = await generateDraftAnswers({
          jobId,
          jobTitle: job.title,
          jobCompany: job.company,
          jobDescription: job.description || undefined,
          question,
          wordLimit: options.wordLimit,
        });

        spinner.succeed(`Generated ${result.variants.length} variants in ${(result.processingTime / 1000).toFixed(2)}s`);

        console.log(chalk.gray(`  Question type: ${result.questionType}\n`));

        // Display each variant
        result.variants.forEach((draft, index) => {
          displayDraftAnswer(draft, index + 1);
        });

        // Save to database
        createQAPair(jobId, question, result.variants);

        // Audit log
        audit('draft_generate', 'job', jobId, false, {
          question,
          questionType: result.questionType,
          variantCount: result.variants.length,
          processingTime: result.processingTime,
        });
      } catch (error) {
        spinner.fail('Failed to generate draft answers');
        console.log(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}\n`));
        logger.error(`Draft generation error for question: ${question}`, error);
      }

      // Delay between questions to avoid rate limiting
      if (i < questions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(chalk.green.bold('\n✓ Draft generation complete!\n'));
    console.log(chalk.gray('💡 Next steps:'));
    console.log(chalk.gray(`  ${chalk.bold('copilot apply --job ' + jobId)} - Start the application process\n`));

    logger.info('Draft generation completed', { jobId, questionCount: questions.length });
  } catch (error) {
    console.log(chalk.red('\n❌ Error generating drafts:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Draft generation error:', error);
    process.exit(1);
  }
}

/**
 * Display a draft answer with formatting
 */
function displayDraftAnswer(draft: DraftAnswer, index: number): void {
  const variantLabels: Record<string, string> = {
    direct: 'Direct',
    star: 'STAR Format',
    metrics: 'Metrics-Heavy',
  };

  const label = variantLabels[draft.variant] || draft.variant;

  // Use appropriate color based on variant
  let colorFn: any;
  switch (draft.variant) {
    case 'direct':
      colorFn = chalk.cyan.bold;
      break;
    case 'star':
      colorFn = chalk.yellow.bold;
      break;
    case 'metrics':
      colorFn = chalk.green.bold;
      break;
    default:
      colorFn = chalk.white.bold;
  }

  console.log(colorFn(`  ${index}. ${label} (${draft.wordCount} words)`));
  console.log(chalk.white(`  ${draft.content}\n`));

  // Validation
  const validation = validateAnswer(draft);
  if (!validation.isValid) {
    console.log(chalk.yellow('  ⚠ Validation Issues:'));
    validation.issues.forEach((issue) => {
      console.log(chalk.yellow(`    - ${issue}`));
    });
    console.log();
  }

  // Claim check
  if (draft.claimCheck.needsInput.length > 0) {
    console.log(chalk.red('  🚨 NEEDS INPUT:'));
    draft.claimCheck.needsInput.forEach((need) => {
      console.log(chalk.red(`    - ${need}`));
    });
    console.log();
  }

  // Show confidence score
  const confidenceColor =
    draft.claimCheck.confidenceScore >= 80
      ? chalk.green
      : draft.claimCheck.confidenceScore >= 60
      ? chalk.yellow
      : chalk.red;

  console.log(chalk.gray('  Confidence:'), confidenceColor(`${draft.claimCheck.confidenceScore}%`));

  // Show verified claims count
  const verifiedCount = draft.claimCheck.claims.filter((c) => c.verified).length;
  const totalClaims = draft.claimCheck.claims.length;
  console.log(
    chalk.gray('  Claims:'),
    chalk.white(`${verifiedCount}/${totalClaims} verified`)
  );

  console.log();
}
