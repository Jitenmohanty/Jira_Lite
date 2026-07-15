import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';

let client: Anthropic | null = null;

/** The assistant is only available when an API key is configured. */
export function isAiEnabled(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

/** Lazily-constructed shared Anthropic client. Throws if AI is disabled. */
export function getAnthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('AI assistant is not configured (ANTHROPIC_API_KEY unset)');
  }
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}
