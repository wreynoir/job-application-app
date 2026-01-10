/**
 * Resume parser - extracts structured profile data from resume files
 */

import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import Anthropic from '@anthropic-ai/sdk';
import { getConfig, getAIApiKey } from './config';
import { logger } from './logger';
import type { WorkHistoryEntry, ProjectEntry, SkillsEntry } from '../types';

/**
 * Parsed resume data structure
 */
export interface ParsedResume {
  workHistory: WorkHistoryEntry[];
  projects: ProjectEntry[];
  skills: SkillsEntry[];
  education: EducationEntry[];
  summary?: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  graduationDate?: string;
  gpa?: string;
}

/**
 * Extract text from a resume file (PDF or DOCX)
 */
export async function extractResumeText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error(`Resume file not found: ${filePath}`);
  }

  logger.info(`Extracting text from resume: ${filePath}`);

  if (ext === '.docx') {
    return extractDocxText(filePath);
  } else if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');
  } else {
    throw new Error(`Unsupported resume format: ${ext}. Please use DOCX or TXT (PDF support coming soon).`);
  }
}

/**
 * Extract text from DOCX
 */
async function extractDocxText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    logger.error('Error extracting DOCX text:', error);
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse resume text into structured data using Claude AI
 */
export async function parseResumeWithAI(resumeText: string): Promise<ParsedResume> {
  const config = getConfig();

  if (config.aiProvider !== 'anthropic') {
    throw new Error('Resume parsing currently only supports Anthropic Claude API');
  }

  const apiKey = getAIApiKey('anthropic');
  const client = new Anthropic({ apiKey });

  logger.info('Parsing resume with Claude AI...');

  const prompt = `You are a resume parser. Extract structured information from the following resume text and return it as valid JSON.

Resume Text:
${resumeText}

Please extract the following information and return ONLY valid JSON (no markdown, no code blocks, just raw JSON):

{
  "workHistory": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM or Month YYYY",
      "endDate": "YYYY-MM or Month YYYY or null if current",
      "current": true/false,
      "accomplishments": [
        {
          "description": "Brief description of accomplishment or responsibility",
          "metrics": ["Any quantifiable metrics mentioned, e.g., '30% increase', '100k users'"]
        }
      ],
      "technologies": ["Technology 1", "Technology 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "problem": "What problem did it solve?",
      "approach": "How was it built/approached?",
      "impact": "What was the impact/result?",
      "technologies": ["Tech 1", "Tech 2"],
      "url": "URL if mentioned"
    }
  ],
  "skills": [
    {
      "category": "Programming Languages / Frameworks / Tools / etc.",
      "skills": ["Skill 1", "Skill 2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science / Master of Arts / etc.",
      "fieldOfStudy": "Computer Science / etc.",
      "graduationDate": "YYYY or Month YYYY",
      "gpa": "3.8/4.0 (if mentioned)"
    }
  ],
  "summary": "A 2-3 sentence professional summary of the candidate's experience and strengths"
}

Important instructions:
- Extract ALL work experience entries, projects, skills, and education
- For accomplishments, try to extract quantifiable metrics separately when mentioned
- If dates are vague (e.g., "2020 - Present"), use your best judgment
- For "current" positions, set endDate to null and current to true
- Group skills into logical categories (e.g., "Programming Languages", "Frameworks", "Tools")
- If information is missing or unclear, use null or empty arrays
- Be thorough - extract as much detail as possible from the resume
- Return ONLY the JSON object, no other text`;

  try {
    const response = await client.messages.create({
      model: config.aiModel,
      max_tokens: 4096,
      temperature: 0.2, // Lower temperature for more consistent parsing
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let jsonText = textContent.text.trim();

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const parsed = JSON.parse(jsonText);

    logger.info('Successfully parsed resume');
    logger.debug('Parsed data:', {
      workHistoryCount: parsed.workHistory?.length || 0,
      projectsCount: parsed.projects?.length || 0,
      skillsCount: parsed.skills?.length || 0,
      educationCount: parsed.education?.length || 0,
    });

    return parsed as ParsedResume;
  } catch (error) {
    logger.error('Error parsing resume with AI:', error);
    throw new Error(`Failed to parse resume: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Full resume parsing pipeline: extract text and parse into structured data
 */
export async function parseResume(filePath: string): Promise<ParsedResume> {
  const text = await extractResumeText(filePath);

  if (!text || text.trim().length === 0) {
    throw new Error('Resume file is empty or could not be read');
  }

  logger.info(`Extracted ${text.length} characters from resume`);

  return parseResumeWithAI(text);
}
