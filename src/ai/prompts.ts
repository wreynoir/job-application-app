/**
 * AI prompt templates for answer generation
 */

import type { AnswerVariant } from '../types';

/**
 * System prompt for answer generation
 */
export const ANSWER_GENERATION_SYSTEM_PROMPT = `You are a professional career advisor and application writer. Your role is to help job seekers create compelling, truthful, and personalized answers to job application questions.

CRITICAL RULES:
1. NEVER fabricate facts, companies, degrees, metrics, or experiences
2. ONLY use information provided in the user's profile
3. If information is missing, mark it clearly as [NEEDS INPUT: description]
4. Be concise, confident, and professional
5. Use active voice and strong action verbs
6. Include specific metrics when available
7. Tailor answers to the specific job and company

ANSWER STYLES:
- Direct: Straightforward, concise answer (2-3 sentences)
- STAR: Situation, Task, Action, Result format (structured narrative)
- Metrics-heavy: Emphasize quantifiable achievements and numbers

For each answer, provide a "claim check" that lists all factual claims and their sources from the user's profile.`;

/**
 * Build user prompt for answer generation
 */
export function buildAnswerPrompt(
  question: string,
  questionType: string,
  jobContext: {
    title: string;
    company: string;
    description?: string;
  },
  userProfile: {
    workHistory?: any[];
    projects?: any[];
    skills?: any;
    canonicalAnswers?: any[];
  },
  options: {
    wordLimit: number;
    variants: AnswerVariant[];
  }
): string {
  let prompt = `JOB CONTEXT:
Title: ${jobContext.title}
Company: ${jobContext.company}
${jobContext.description ? `Description: ${jobContext.description.substring(0, 500)}...` : ''}

QUESTION TO ANSWER:
"${question}"

Question Type: ${questionType}

USER PROFILE:
`;

  // Add work history
  if (userProfile.workHistory && userProfile.workHistory.length > 0) {
    prompt += '\nWORK HISTORY:\n';
    userProfile.workHistory.forEach((job: any, index: number) => {
      prompt += `\n${index + 1}. ${job.title} at ${job.company} (${job.startDate} - ${job.current ? 'Present' : job.endDate})\n`;
      if (job.technologies && job.technologies.length > 0) {
        prompt += `   Technologies: ${job.technologies.join(', ')}\n`;
      }
      if (job.accomplishments && job.accomplishments.length > 0) {
        prompt += '   Accomplishments:\n';
        job.accomplishments.forEach((acc: any) => {
          prompt += `   - ${acc.description}\n`;
          if (acc.metrics && acc.metrics.length > 0) {
            prompt += `     Metrics: ${acc.metrics.join(', ')}\n`;
          }
        });
      }
    });
  }

  // Add projects
  if (userProfile.projects && userProfile.projects.length > 0) {
    prompt += '\nPROJECTS:\n';
    userProfile.projects.forEach((project: any, index: number) => {
      prompt += `\n${index + 1}. ${project.name}\n`;
      prompt += `   Problem: ${project.problem}\n`;
      prompt += `   Approach: ${project.approach}\n`;
      prompt += `   Impact: ${project.impact}\n`;
      if (project.technologies && project.technologies.length > 0) {
        prompt += `   Technologies: ${project.technologies.join(', ')}\n`;
      }
    });
  }

  // Add skills
  if (userProfile.skills && userProfile.skills.length > 0) {
    prompt += '\nSKILLS:\n';
    userProfile.skills.forEach((skillSet: any) => {
      prompt += `${skillSet.category}: ${skillSet.skills.join(', ')}\n`;
    });
  }

  // Add canonical answers if relevant
  if (userProfile.canonicalAnswers && userProfile.canonicalAnswers.length > 0) {
    const relevantAnswer = userProfile.canonicalAnswers.find(
      (ans: any) => ans.questionType.toLowerCase() === questionType.toLowerCase()
    );
    if (relevantAnswer) {
      prompt += `\nCANONICAL ANSWER FOR THIS TYPE:\n${relevantAnswer.answer}\n`;
    }
  }

  prompt += `

REQUIREMENTS:
- Word limit: approximately ${options.wordLimit} words per variant
- Generate ${options.variants.length} variants: ${options.variants.join(', ')}
- Each variant should be a complete, standalone answer
- CRITICAL: Only use facts from the profile above
- If you need information not in the profile, use [NEEDS INPUT: specific detail needed]

OUTPUT FORMAT (JSON):
{
  "variants": [
    {
      "variant": "direct|star|metrics",
      "content": "The actual answer text",
      "wordCount": number,
      "claimCheck": {
        "claims": [
          {
            "text": "specific claim made",
            "source": "work_history|projects|skills|canonical",
            "verified": true|false,
            "profileSection": "where this came from"
          }
        ],
        "confidenceScore": 0-100,
        "needsInput": ["list of missing information"]
      }
    }
  ]
}

Generate the answer variants now:`;

  return prompt;
}

/**
 * Question type detection patterns
 */
export const QUESTION_PATTERNS: Record<string, RegExp[]> = {
  'Why this role?': [
    /why.*interested.*role/i,
    /why.*apply.*position/i,
    /what.*attracts.*role/i,
    /why.*want.*job/i,
  ],
  'Why this company?': [
    /why.*want.*work.*company/i,
    /why.*interested.*company/i,
    /what.*know.*company/i,
    /why.*\[company\]/i,
  ],
  'Describe a project': [
    /describe.*project/i,
    /tell.*about.*project/i,
    /project.*proud/i,
    /significant.*project/i,
  ],
  'Challenge overcome': [
    /challenge.*overcame/i,
    /difficult.*situation/i,
    /obstacle.*faced/i,
    /problem.*solved/i,
  ],
  'Strengths': [
    /what.*strengths/i,
    /key.*strengths/i,
    /greatest.*strength/i,
    /what.*good.*at/i,
  ],
  'Weaknesses': [
    /what.*weakness/i,
    /area.*improve/i,
    /what.*working.*on/i,
    /development.*area/i,
  ],
  'Leadership': [
    /leadership.*experience/i,
    /time.*led.*team/i,
    /demonstrate.*leadership/i,
  ],
  'Conflict resolution': [
    /conflict.*resolved/i,
    /disagreement.*handled/i,
    /difficult.*colleague/i,
  ],
  'Technical experience': [
    /experience.*with.*\[technology\]/i,
    /familiar.*\[technology\]/i,
    /used.*\[technology\]/i,
  ],
};

/**
 * Detect question type from question text
 */
export function detectQuestionType(question: string): string {
  for (const [type, patterns] of Object.entries(QUESTION_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(question))) {
      return type;
    }
  }

  return 'General';
}
