import type { GoogleGenAI } from '@google/genai' with {
  'resolution-mode': 'require',
};

/**
 * Isolates the dynamic import of @google/genai in its own module so it can be
 * fully replaced with `jest.mock('./google-genai-loader')` in tests — Jest's
 * default environment can't execute a real dynamic import() without
 * --experimental-vm-modules, and jest.mock() only intercepts require().
 */
export async function loadGoogleGenAI(): Promise<{
  GoogleGenAI: new (options?: { apiKey?: string }) => GoogleGenAI;
}> {
  return import('@google/genai');
}

export type { GoogleGenAI };
