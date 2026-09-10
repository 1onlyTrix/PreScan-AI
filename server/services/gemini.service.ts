import { GoogleGenAI } from '@google/genai';
import { AI_CONFIG } from '../config/ai.config';

let genAIClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[GeminiService] Warning: GEMINI_API_KEY is not set in environment.');
    }
    // Initialize Google GenAI client
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export async function generateGeminiContent(params: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}): Promise<string> {
  const ai = getGeminiClient();
  const primaryModel = params.model || AI_CONFIG.MODEL;
  const candidateModels = Array.from(
    new Set([
      primaryModel,
      ...AI_CONFIG.FALLBACK_MODELS,
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-2.5-pro',
    ])
  ).filter(Boolean);

  let lastError: any = null;

  for (const modelName of candidateModels) {
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: params.responseMimeType,
            responseSchema: params.responseSchema,
            temperature: params.temperature ?? AI_CONFIG.TEMPERATURE,
            maxOutputTokens: params.maxOutputTokens ?? AI_CONFIG.MAX_OUTPUT_TOKENS,
          },
        });

        let text = response.text;
        if (!text && response.candidates && response.candidates.length > 0) {
          const candidateParts = response.candidates[0]?.content?.parts;
          if (Array.isArray(candidateParts)) {
            text = candidateParts.map((p: any) => p.text || '').join('');
          }
        }

        if (text && text.trim().length > 0) {
          return text;
        }

        throw new Error(`Empty response received from model ${modelName}.`);
      } catch (error: any) {
        lastError = error;

        // Check if model is not found (404) or experiencing high demand / unavailable (503 / 429)
        const isHighDemandOrUnavailable =
          error?.status === 503 ||
          error?.status === 429 ||
          error?.code === 503 ||
          error?.code === 429 ||
          error?.message?.includes('503') ||
          error?.message?.includes('high demand') ||
          error?.message?.includes('UNAVAILABLE') ||
          error?.message?.includes('RESOURCE_EXHAUSTED');

        const isNotFound =
          error?.status === 404 ||
          error?.code === 404 ||
          error?.message?.includes('404') ||
          error?.message?.includes('no longer available');

        if (isNotFound || isHighDemandOrUnavailable) {
          console.info(`[GeminiService] Model ${modelName} is ${isNotFound ? 'not found' : 'experiencing high demand (503/429)'}. Seamlessly switching to next model candidate...`);
          await new Promise((res) => setTimeout(res, 200));
          break; // Switch immediately to next model candidate
        }

        console.warn(`[GeminiService] Attempt ${attempt}/${maxAttempts} failed for model ${modelName}:`, error?.message || error);

        if (attempt < maxAttempts) {
          const backoffMs = attempt * 500;
          console.log(`[GeminiService] Retrying ${modelName} in ${backoffMs}ms...`);
          await new Promise((res) => setTimeout(res, backoffMs));
        } else {
          break; // move to next model candidate
        }
      }
    }
  }

  throw lastError || new Error(`Gemini generation failed across all model candidates: ${candidateModels.join(', ')}`);
}
