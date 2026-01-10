/**
 * Draft answer generator
 */

import { generateJsonCompletion } from './client';
import { ANSWER_GENERATION_SYSTEM_PROMPT, buildAnswerPrompt, detectQuestionType } from './prompts';
import { getUserProfile } from '../db/client';
import { logger } from '../utils/logger';
import type { DraftAnswer, AnswerVariant } from '../types';

export interface GenerateDraftOptions {
  jobId: number;
  jobTitle: string;
  jobCompany: string;
  jobDescription?: string;
  question: string;
  questionType?: string;
  wordLimit?: number;
  variants?: AnswerVariant[];
}

export interface GenerateDraftResponse {
  variants: DraftAnswer[];
  processingTime: number;
  questionType: string;
}

/**
 * Generate draft answers for a question
 */
export async function generateDraftAnswers(
  options: GenerateDraftOptions
): Promise<GenerateDraftResponse> {
  const startTime = Date.now();

  try {
    logger.info('Generating draft answers', {
      jobId: options.jobId,
      question: options.question,
    });

    // Load user profile
    const workHistoryData = getUserProfile('work_history');
    const projectsData = getUserProfile('projects');
    const skillsData = getUserProfile('skills');
    const canonicalData = getUserProfile('canonical_answers');

    if (!workHistoryData && !projectsData) {
      throw new Error(
        'User profile not found. Please run "copilot onboard" to create your profile first.'
      );
    }

    const userProfile = {
      workHistory: (workHistoryData?.['entries'] as any[]) || [],
      projects: (projectsData?.['entries'] as any[]) || [],
      skills: (skillsData?.['entries'] as any) || [],
      canonicalAnswers: (canonicalData?.['entries'] as any[]) || [],
    };

    // Detect question type if not provided
    const questionType = options.questionType || detectQuestionType(options.question);

    // Set defaults
    const wordLimit = options.wordLimit || 150;
    const variants = options.variants || ['direct', 'star', 'metrics'] as AnswerVariant[];

    // Build prompt
    const userPrompt = buildAnswerPrompt(
      options.question,
      questionType,
      {
        title: options.jobTitle,
        company: options.jobCompany,
        description: options.jobDescription,
      },
      userProfile,
      {
        wordLimit,
        variants,
      }
    );

    // Generate completion
    logger.debug('Sending prompt to AI', { questionType, wordLimit, variants });

    const response = await generateJsonCompletion<{ variants: DraftAnswer[] }>(
      ANSWER_GENERATION_SYSTEM_PROMPT,
      userPrompt,
      {
        maxTokens: 2048,
        temperature: 0.7,
      }
    );

    const processingTime = Date.now() - startTime;

    logger.info('Draft answers generated successfully', {
      jobId: options.jobId,
      variantCount: response.variants.length,
      processingTime,
    });

    return {
      variants: response.variants,
      processingTime,
      questionType,
    };
  } catch (error) {
    logger.error('Error generating draft answers:', error);
    throw error;
  }
}

/**
 * Generate drafts for multiple questions
 */
export async function generateMultipleDrafts(
  jobId: number,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string | undefined,
  questions: string[]
): Promise<Map<string, GenerateDraftResponse>> {
  const results = new Map<string, GenerateDraftResponse>();

  logger.info(`Generating drafts for ${questions.length} questions`);

  for (const question of questions) {
    try {
      const result = await generateDraftAnswers({
        jobId,
        jobTitle,
        jobCompany,
        jobDescription,
        question,
      });

      results.set(question, result);

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.error(`Failed to generate draft for question: ${question}`, error);
      // Continue with other questions
    }
  }

  logger.info(`Generated drafts for ${results.size}/${questions.length} questions`);

  return results;
}

/**
 * Validate generated answer for claim accuracy
 */
export function validateAnswer(answer: DraftAnswer): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for unverified claims
  const unverifiedClaims = answer.claimCheck.claims.filter((claim) => !claim.verified);
  if (unverifiedClaims.length > 0) {
    issues.push(`${unverifiedClaims.length} unverified claims found`);
  }

  // Check for needed input
  if (answer.claimCheck.needsInput.length > 0) {
    issues.push(`Missing information: ${answer.claimCheck.needsInput.join(', ')}`);
  }

  // Check confidence score
  if (answer.claimCheck.confidenceScore < 70) {
    issues.push(`Low confidence score: ${answer.claimCheck.confidenceScore}%`);
  }

  // Check for [NEEDS INPUT] markers in content
  const needsInputMatches = answer.content.match(/\[NEEDS INPUT:?[^\]]*\]/g);
  if (needsInputMatches && needsInputMatches.length > 0) {
    issues.push(`Content contains ${needsInputMatches.length} NEEDS INPUT markers`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
