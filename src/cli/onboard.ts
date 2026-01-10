/**
 * Interactive onboarding wizard
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { upsertUserProfile, initializeDatabase } from '../db/client';
import { logger } from '../utils/logger';
import { audit } from '../utils/audit';
import type {
  WorkHistoryEntry,
  AccomplishmentEntry,
  ProjectEntry,
  SkillsEntry,
  CanonicalAnswer,
} from '../types';

/**
 * Run the onboarding wizard
 */
export async function runOnboarding(): Promise<void> {
  console.log(chalk.blue.bold('\n🚀 Job Application Copilot - Onboarding Wizard\n'));
  console.log(chalk.gray('This wizard will help you create your profile for AI-powered job applications.'));
  console.log(chalk.gray('Your answers will be used to generate personalized application responses.\n'));

  try {
    initializeDatabase();

    // Welcome and overview
    const { ready } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ready',
        message: 'Ready to begin?',
        default: true,
      },
    ]);

    if (!ready) {
      console.log(chalk.yellow('\n👋 Onboarding cancelled. Run "copilot onboard" when you\'re ready.\n'));
      return;
    }

    // Section 1: Work History
    console.log(chalk.blue.bold('\n📋 Section 1: Work History\n'));
    const workHistory = await collectWorkHistory();

    // Section 2: Projects
    console.log(chalk.blue.bold('\n💼 Section 2: Projects\n'));
    const projects = await collectProjects();

    // Section 3: Skills
    console.log(chalk.blue.bold('\n⚡ Section 3: Skills\n'));
    const skills = await collectSkills();

    // Section 4: Canonical Answers
    console.log(chalk.blue.bold('\n💬 Section 4: Canonical Answers\n'));
    const canonicalAnswers = await collectCanonicalAnswers();

    // Save to database
    console.log(chalk.blue('\n💾 Saving your profile...\n'));

    upsertUserProfile('work_history', { entries: workHistory });
    upsertUserProfile('projects', { entries: projects });
    upsertUserProfile('skills', { entries: skills });
    upsertUserProfile('canonical_answers', { entries: canonicalAnswers });

    // Audit log
    audit('profile_create', 'profile', null, true, {
      workHistoryCount: workHistory.length,
      projectsCount: projects.length,
      skillsCount: skills.length,
      canonicalAnswersCount: canonicalAnswers.length,
    });

    // Success message
    console.log(chalk.green.bold('✓ Profile created successfully!\n'));
    console.log(chalk.gray('Your profile has been saved and is ready to use for generating application answers.\n'));
    console.log(chalk.blue('💡 Next steps:'));
    console.log(chalk.gray(`  1. ${chalk.bold('copilot jobs:sync')} - Fetch job postings`));
    console.log(chalk.gray(`  2. ${chalk.bold('copilot jobs:list')} - Browse available jobs`));
    console.log(chalk.gray(`  3. ${chalk.bold('copilot draft --job <id>')} - Generate draft answers\n`));

    logger.info('Onboarding completed successfully');
  } catch (error) {
    console.log(chalk.red('\n❌ Error during onboarding:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Onboarding error:', error);
    process.exit(1);
  }
}

/**
 * Collect work history
 */
async function collectWorkHistory(): Promise<WorkHistoryEntry[]> {
  const entries: WorkHistoryEntry[] = [];

  console.log(chalk.gray('Tell us about your work experience (STAR format encouraged for accomplishments).\n'));

  let addMore = true;

  while (addMore) {
    const { company } = await inquirer.prompt([
      {
        type: 'input',
        name: 'company',
        message: 'Company name:',
        validate: (input) => input.trim().length > 0 || 'Company name is required',
      },
    ]);

    const { title } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Job title:',
        validate: (input) => input.trim().length > 0 || 'Job title is required',
      },
    ]);

    const { startDate } = await inquirer.prompt([
      {
        type: 'input',
        name: 'startDate',
        message: 'Start date (e.g., "Jan 2020"):',
        validate: (input) => input.trim().length > 0 || 'Start date is required',
      },
    ]);

    const { current } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'current',
        message: 'Is this your current position?',
        default: false,
      },
    ]);

    let endDate = null;
    if (!current) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'endDate',
          message: 'End date (e.g., "Dec 2022"):',
          validate: (input) => input.trim().length > 0 || 'End date is required',
        },
      ]);
      endDate = answer.endDate;
    }

    // Collect accomplishments
    const accomplishments = await collectAccomplishments();

    // Collect technologies
    const { technologies } = await inquirer.prompt([
      {
        type: 'input',
        name: 'technologies',
        message: 'Key technologies/tools used (comma-separated):',
        filter: (input: string) => input.split(',').map((s) => s.trim()).filter(Boolean),
      },
    ]);

    entries.push({
      company,
      title,
      startDate,
      endDate,
      current,
      accomplishments,
      technologies,
    });

    const { more } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'more',
        message: 'Add another work experience?',
        default: false,
      },
    ]);

    addMore = more;
  }

  return entries;
}

/**
 * Collect accomplishments for a job
 */
async function collectAccomplishments(): Promise<AccomplishmentEntry[]> {
  const accomplishments: AccomplishmentEntry[] = [];

  console.log(chalk.gray('\n  Add accomplishments (use STAR format for best results):\n'));

  let addMore = true;

  while (addMore) {
    const { useSTAR } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useSTAR',
        message: '  Use STAR format (Situation, Task, Action, Result)?',
        default: true,
      },
    ]);

    if (useSTAR) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'situation',
          message: '  Situation (what was the context?):',
        },
        {
          type: 'input',
          name: 'task',
          message: '  Task (what needed to be done?):',
        },
        {
          type: 'input',
          name: 'action',
          message: '  Action (what did you do?):',
        },
        {
          type: 'input',
          name: 'result',
          message: '  Result (what was the outcome?):',
        },
        {
          type: 'input',
          name: 'metrics',
          message: '  Metrics (numbers/percentages, comma-separated):',
          filter: (input: string) => input.split(',').map((s) => s.trim()).filter(Boolean),
        },
      ]);

      const description = `${answers.situation} ${answers.task} ${answers.action} ${answers.result}`.trim();

      accomplishments.push({
        description,
        situation: answers.situation,
        task: answers.task,
        action: answers.action,
        result: answers.result,
        metrics: answers.metrics.length > 0 ? answers.metrics : undefined,
      });
    } else {
      const { description, metrics } = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: '  Accomplishment:',
          validate: (input) => input.trim().length > 0 || 'Description is required',
        },
        {
          type: 'input',
          name: 'metrics',
          message: '  Metrics (numbers/percentages, comma-separated):',
          filter: (input: string) => input.split(',').map((s) => s.trim()).filter(Boolean),
        },
      ]);

      accomplishments.push({
        description,
        metrics: metrics.length > 0 ? metrics : undefined,
      });
    }

    const { more } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'more',
        message: '  Add another accomplishment?',
        default: true,
      },
    ]);

    addMore = more;
  }

  return accomplishments;
}

/**
 * Collect projects
 */
async function collectProjects(): Promise<ProjectEntry[]> {
  const entries: ProjectEntry[] = [];

  console.log(chalk.gray('Tell us about your key projects (problem → approach → impact format).\n'));

  const { hasProjects } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasProjects',
      message: 'Do you want to add projects?',
      default: true,
    },
  ]);

  if (!hasProjects) return entries;

  let addMore = true;

  while (addMore) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        validate: (input) => input.trim().length > 0 || 'Project name is required',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Brief description:',
      },
      {
        type: 'input',
        name: 'problem',
        message: 'Problem (what challenge did this solve?):',
        validate: (input) => input.trim().length > 0 || 'Problem is required',
      },
      {
        type: 'input',
        name: 'approach',
        message: 'Approach (how did you solve it?):',
        validate: (input) => input.trim().length > 0 || 'Approach is required',
      },
      {
        type: 'input',
        name: 'impact',
        message: 'Impact (what was the result/outcome?):',
        validate: (input) => input.trim().length > 0 || 'Impact is required',
      },
      {
        type: 'input',
        name: 'technologies',
        message: 'Technologies used (comma-separated):',
        filter: (input: string) => input.split(',').map((s) => s.trim()).filter(Boolean),
      },
      {
        type: 'input',
        name: 'url',
        message: 'Project URL (optional):',
      },
    ]);

    entries.push(answers);

    const { more } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'more',
        message: 'Add another project?',
        default: false,
      },
    ]);

    addMore = more;
  }

  return entries;
}

/**
 * Collect skills
 */
async function collectSkills(): Promise<SkillsEntry[]> {
  const entries: SkillsEntry[] = [];

  console.log(chalk.gray('Tell us about your skills and expertise.\n'));

  const categories = [
    { name: 'Programming Languages', key: 'languages' },
    { name: 'Frameworks & Libraries', key: 'frameworks' },
    { name: 'Tools & Platforms', key: 'tools' },
    { name: 'Soft Skills', key: 'soft' },
  ];

  for (const category of categories) {
    const { skills } = await inquirer.prompt([
      {
        type: 'input',
        name: 'skills',
        message: `${category.name} (comma-separated):`,
        filter: (input: string) => input.split(',').map((s) => s.trim()).filter(Boolean),
      },
    ]);

    if (skills.length > 0) {
      entries.push({
        category: category.name,
        skills,
      });
    }
  }

  return entries;
}

/**
 * Collect canonical answers
 */
async function collectCanonicalAnswers(): Promise<CanonicalAnswer[]> {
  const answers: CanonicalAnswer[] = [];

  console.log(chalk.gray('Create template answers for common application questions.\n'));

  const commonQuestions = [
    {
      type: 'Why this role?',
      prompt: 'Template answer for "Why are you interested in this role?"',
    },
    {
      type: 'Why this company?',
      prompt: 'Template answer for "Why do you want to work at [company]?"',
    },
    {
      type: 'Strengths',
      prompt: 'What are your key strengths?',
    },
    {
      type: 'Weaknesses',
      prompt: 'What is an area you\'re working to improve?',
    },
    {
      type: 'Conflict resolution',
      prompt: 'Describe a time you resolved a conflict',
    },
    {
      type: 'Leadership',
      prompt: 'Describe a time you demonstrated leadership',
    },
  ];

  for (const question of commonQuestions) {
    const { answer, skip } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'skip',
        message: `Add answer for: "${question.type}"?`,
        default: true,
      },
      {
        type: 'editor',
        name: 'answer',
        message: question.prompt,
        when: (answers) => !answers.skip,
      },
    ]);

    if (!skip && answer && answer.trim()) {
      answers.push({
        questionType: question.type,
        answer: answer.trim(),
      });
    }
  }

  return answers;
}
