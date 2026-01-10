/**
 * Profile management commands
 */

import chalk from 'chalk';
import { getUserProfile, initializeDatabase } from '../db/client';
import { logger } from '../utils/logger';
import type { ProfileSection } from '../types';

/**
 * View user profile
 */
export async function viewProfile(section?: string): Promise<void> {
  try {
    initializeDatabase();

    if (section) {
      // View specific section
      await viewSection(section as ProfileSection);
    } else {
      // View all sections
      console.log(chalk.blue.bold('\n👤 Your Profile\n'));

      const sections: ProfileSection[] = ['work_history', 'projects', 'skills', 'canonical_answers'];

      for (const sec of sections) {
        await viewSection(sec, false);
      }

      console.log(chalk.gray('\n💡 Tip: Use "copilot profile --section <name>" to view a specific section\n'));
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Error viewing profile:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Profile view error:', error);
    process.exit(1);
  }
}

/**
 * View a specific profile section
 */
async function viewSection(section: ProfileSection, showHeader = true): Promise<void> {
  const data = getUserProfile(section);

  if (!data) {
    if (showHeader) {
      console.log(chalk.yellow(`\n⚠  No data found for section: ${section}`));
      console.log(chalk.gray('Run "copilot onboard" to create your profile\n'));
    }
    return;
  }

  switch (section) {
    case 'work_history':
      displayWorkHistory(data, showHeader);
      break;
    case 'projects':
      displayProjects(data, showHeader);
      break;
    case 'skills':
      displaySkills(data, showHeader);
      break;
    case 'canonical_answers':
      displayCanonicalAnswers(data, showHeader);
      break;
  }
}

function displayWorkHistory(data: any, showHeader: boolean): void {
  if (showHeader) {
    console.log(chalk.blue.bold('\n📋 Work History\n'));
  } else {
    console.log(chalk.blue.bold('📋 Work History'));
  }

  const entries = data.entries || [];

  if (entries.length === 0) {
    console.log(chalk.gray('  No work history added yet\n'));
    return;
  }

  entries.forEach((entry: any, index: number) => {
    const period = entry.current
      ? `${entry.startDate} - Present`
      : `${entry.startDate} - ${entry.endDate || 'Unknown'}`;

    console.log(chalk.white.bold(`\n  ${index + 1}. ${entry.title} at ${entry.company}`));
    console.log(chalk.gray(`     ${period}`));

    if (entry.technologies && entry.technologies.length > 0) {
      console.log(chalk.cyan(`     Technologies: ${entry.technologies.join(', ')}`));
    }

    if (entry.accomplishments && entry.accomplishments.length > 0) {
      console.log(chalk.gray('\n     Accomplishments:'));
      entry.accomplishments.forEach((acc: any, i: number) => {
        console.log(chalk.white(`     ${i + 1}. ${acc.description}`));
        if (acc.metrics && acc.metrics.length > 0) {
          console.log(chalk.green(`        Metrics: ${acc.metrics.join(', ')}`));
        }
      });
    }
  });

  console.log(); // Extra newline
}

function displayProjects(data: any, showHeader: boolean): void {
  if (showHeader) {
    console.log(chalk.blue.bold('\n💼 Projects\n'));
  } else {
    console.log(chalk.blue.bold('\n💼 Projects'));
  }

  const entries = data.entries || [];

  if (entries.length === 0) {
    console.log(chalk.gray('  No projects added yet\n'));
    return;
  }

  entries.forEach((project: any, index: number) => {
    console.log(chalk.white.bold(`\n  ${index + 1}. ${project.name}`));

    if (project.description) {
      console.log(chalk.gray(`     ${project.description}`));
    }

    console.log(chalk.yellow(`     Problem: ${project.problem}`));
    console.log(chalk.cyan(`     Approach: ${project.approach}`));
    console.log(chalk.green(`     Impact: ${project.impact}`));

    if (project.technologies && project.technologies.length > 0) {
      console.log(chalk.blue(`     Tech: ${project.technologies.join(', ')}`));
    }

    if (project.url) {
      console.log(chalk.gray(`     URL: ${project.url}`));
    }
  });

  console.log(); // Extra newline
}

function displaySkills(data: any, showHeader: boolean): void {
  if (showHeader) {
    console.log(chalk.blue.bold('\n⚡ Skills\n'));
  } else {
    console.log(chalk.blue.bold('\n⚡ Skills'));
  }

  const entries = data.entries || [];

  if (entries.length === 0) {
    console.log(chalk.gray('  No skills added yet\n'));
    return;
  }

  entries.forEach((skillSet: any) => {
    console.log(chalk.white.bold(`\n  ${skillSet.category}:`));
    console.log(chalk.cyan(`  ${skillSet.skills.join(', ')}`));
  });

  console.log(); // Extra newline
}

function displayCanonicalAnswers(data: any, showHeader: boolean): void {
  if (showHeader) {
    console.log(chalk.blue.bold('\n💬 Canonical Answers\n'));
  } else {
    console.log(chalk.blue.bold('\n💬 Canonical Answers'));
  }

  const entries = data.entries || [];

  if (entries.length === 0) {
    console.log(chalk.gray('  No canonical answers added yet\n'));
    return;
  }

  entries.forEach((answer: any, index: number) => {
    console.log(chalk.white.bold(`\n  ${index + 1}. ${answer.questionType}`));
    console.log(chalk.gray(`     ${answer.answer.substring(0, 150)}${answer.answer.length > 150 ? '...' : ''}`));
  });

  console.log(); // Extra newline
}

/**
 * Export profile to markdown
 */
export async function exportProfile(outputPath: string): Promise<void> {
  try {
    initializeDatabase();

    console.log(chalk.blue('\n📤 Exporting profile to markdown...\n'));

    const sections: ProfileSection[] = ['work_history', 'projects', 'skills', 'canonical_answers'];
    let markdown = '# Job Application Profile\n\n';
    markdown += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    for (const section of sections) {
      const data = getUserProfile(section);
      if (!data) continue;

      markdown += formatSectionToMarkdown(section, data);
    }

    // Write to file
    const fs = require('fs');
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    console.log(chalk.green(`✓ Profile exported to: ${outputPath}\n`));
    logger.info(`Profile exported to ${outputPath}`);
  } catch (error) {
    console.log(chalk.red('\n❌ Error exporting profile:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    logger.error('Profile export error:', error);
    process.exit(1);
  }
}

function formatSectionToMarkdown(section: ProfileSection, data: any): string {
  let md = '';

  switch (section) {
    case 'work_history':
      md += '## Work History\n\n';
      const workEntries = data.entries || [];
      workEntries.forEach((entry: any) => {
        const period = entry.current
          ? `${entry.startDate} - Present`
          : `${entry.startDate} - ${entry.endDate}`;
        md += `### ${entry.title} at ${entry.company}\n`;
        md += `**${period}**\n\n`;
        if (entry.technologies && entry.technologies.length > 0) {
          md += `**Technologies:** ${entry.technologies.join(', ')}\n\n`;
        }
        if (entry.accomplishments && entry.accomplishments.length > 0) {
          md += '**Accomplishments:**\n\n';
          entry.accomplishments.forEach((acc: any) => {
            md += `- ${acc.description}\n`;
            if (acc.metrics && acc.metrics.length > 0) {
              md += `  - Metrics: ${acc.metrics.join(', ')}\n`;
            }
          });
          md += '\n';
        }
      });
      break;

    case 'projects':
      md += '## Projects\n\n';
      const projectEntries = data.entries || [];
      projectEntries.forEach((project: any) => {
        md += `### ${project.name}\n\n`;
        if (project.description) {
          md += `${project.description}\n\n`;
        }
        md += `**Problem:** ${project.problem}\n\n`;
        md += `**Approach:** ${project.approach}\n\n`;
        md += `**Impact:** ${project.impact}\n\n`;
        if (project.technologies && project.technologies.length > 0) {
          md += `**Technologies:** ${project.technologies.join(', ')}\n\n`;
        }
        if (project.url) {
          md += `**URL:** ${project.url}\n\n`;
        }
      });
      break;

    case 'skills':
      md += '## Skills\n\n';
      const skillEntries = data.entries || [];
      skillEntries.forEach((skillSet: any) => {
        md += `**${skillSet.category}:** ${skillSet.skills.join(', ')}\n\n`;
      });
      break;

    case 'canonical_answers':
      md += '## Canonical Answers\n\n';
      const answerEntries = data.entries || [];
      answerEntries.forEach((answer: any) => {
        md += `### ${answer.questionType}\n\n`;
        md += `${answer.answer}\n\n`;
      });
      break;
  }

  return md;
}
