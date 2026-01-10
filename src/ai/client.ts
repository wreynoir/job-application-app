/**
 * AI API client for answer generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../utils/config';
import { logger } from '../utils/logger';

let anthropicClient: Anthropic | null = null;

/**
 * Get Anthropic client instance
 */
export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const config = getConfig();

    if (config.aiProvider !== 'anthropic') {
      throw new Error('AI provider must be set to "anthropic"');
    }

    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    anthropicClient = new Anthropic({
      apiKey,
    });

    logger.info('Anthropic client initialized');
  }

  return anthropicClient;
}

/**
 * Generate completion using Claude
 */
export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const client = getAnthropicClient();
  const config = getConfig();

  const model = options.model || config.aiModel;
  const maxTokens = options.maxTokens || 1024;
  const temperature = options.temperature || 0.7;

  try {
    logger.debug('Generating AI completion', { model, maxTokens, temperature });

    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    logger.debug('AI completion generated', {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return content.text;
  } catch (error) {
    logger.error('Error generating AI completion:', error);
    throw error;
  }
}

/**
 * Generate JSON completion using Claude
 */
export async function generateJsonCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<T> {
  const fullUserPrompt = `${userPrompt}\n\nRespond with valid JSON only. No markdown, no explanations, just the JSON object.`;

  const response = await generateCompletion(systemPrompt, fullUserPrompt, options);

  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    if (!jsonStr) {
      throw new Error('Empty JSON response');
    }

    return JSON.parse(jsonStr.trim()) as T;
  } catch (error) {
    logger.error('Failed to parse JSON response:', { response, error });
    throw new Error(`Invalid JSON response from AI: ${error instanceof Error ? error.message : String(error)}`);
  }
}
