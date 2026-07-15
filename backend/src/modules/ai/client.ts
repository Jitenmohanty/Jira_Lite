import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

let client: GoogleGenAI | null = null;

/** The assistant is only available when a Gemini API key is configured. */
export function isAiEnabled(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

/** Lazily-constructed shared Gemini client. Throws if AI is disabled. */
export function getGemini(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new Error('AI assistant is not configured (GEMINI_API_KEY unset)');
  }
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}
