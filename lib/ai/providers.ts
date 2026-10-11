import { env } from "@/config/env";
import { BaseOpenAICompatibleProvider } from "./base-provider";

export class GeminiProvider extends BaseOpenAICompatibleProvider {
  constructor() {
    super({
      providerName: "gemini",
      baseURL:
        env.GEMINI_BASE_URL ||
        process.env.GEMINI_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
      defaultModel:
        env.AI_MODEL_1 || process.env.AI_MODEL_1 || "gemini-2.5-flash-lite",
    });
  }
}

export class GroqProvider extends BaseOpenAICompatibleProvider {
  constructor() {
    super({
      providerName: "groq",
      baseURL:
        env.GROQ_BASE_URL ||
        process.env.GROQ_BASE_URL ||
        "https://api.groq.com/openai/v1",
      apiKey: env.GROQ_API_KEY || process.env.GROQ_API_KEY,
      defaultModel:
        env.AI_MODEL_2 || process.env.AI_MODEL_2 || "openai/gpt-oss-20b",
    });
  }
}

export class OpenRouterProvider extends BaseOpenAICompatibleProvider {
  constructor() {
    super({
      providerName: "openrouter",
      baseURL:
        env.OPENROUTER_BASE_URL ||
        process.env.OPENROUTER_BASE_URL ||
        "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
      defaultModel:
        env.AI_MODEL_3 ||
        process.env.AI_MODEL_3 ||
        env.AI_MODEL ||
        process.env.OPENROUTER_MODEL ||
        "google/gemma-4-31b-it:free",
      defaultHeaders: {
        "HTTP-Referer": "https://dentassist.ai",
        "X-Title": "DentAssist AI Receptionist",
      },
    });
  }
}

// Backward compatibility alias for existing references
export class OpenRouterAIProvider extends OpenRouterProvider {}
