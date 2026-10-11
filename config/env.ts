import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL or DB_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z
    .url("BETTER_AUTH_URL must be a valid URL")
    .default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.url().optional().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // S3-compatible Object Storage
  AWS_ENDPOINT_URL_S3: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-2"),
  AWS_S3_BUCKET_NAME: z.string().default("assets"),
  // Pinecone Vector DB
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX: z.string().default("dentassist"),
  PINECONE_HOST: z.string().optional(),
  PINECONE_NAMESPACE_PREFIX: z.string().optional(),
  // AI Provider & Model Configuration (Legacy & Defaults)
  AI_PROVIDER: z.string().default("gemini"),
  AI_MODEL: z.string().default("gemini-2.5-flash-lite"),
  // Three Provider Failover Configuration
  AI_PROVIDER_1: z.string().default("gemini"),
  AI_MODEL_1: z.string().default("gemini-2.5-flash-lite"),
  AI_PRIORITY_1: z.coerce.number().default(1),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_BASE_URL: z
    .string()
    .default("https://generativelanguage.googleapis.com/v1beta/openai/"),

  AI_PROVIDER_2: z.string().default("groq"),
  AI_MODEL_2: z.string().default("openai/gpt-oss-20b"),
  AI_PRIORITY_2: z.coerce.number().default(2),
  GROQ_API_KEY: z.string().optional(),
  GROQ_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),

  AI_PROVIDER_3: z.string().default("openrouter"),
  AI_MODEL_3: z.string().default("google/gemma-4-31b-it:free"),
  AI_PRIORITY_3: z.coerce.number().default(3),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().optional(),

  // Circuit Breaker & Failover Settings
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(15000),
  AI_PROVIDER_COOLDOWN_MS: z.coerce.number().default(60000),
  AI_RATE_LIMIT_COOLDOWN_MS: z.coerce.number().default(60000),
  AI_TIMEOUT_COOLDOWN_MS: z.coerce.number().default(30000),
  AI_PROVIDER_ERROR_COOLDOWN_MS: z.coerce.number().default(30000),
  AI_NETWORK_ERROR_COOLDOWN_MS: z.coerce.number().default(30000),
  AI_INVALID_OUTPUT_COOLDOWN_MS: z.coerce.number().default(30000),
  AI_AUTH_ERROR_COOLDOWN_MS: z.coerce.number().default(600000),
  AI_CONFIG_ERROR_COOLDOWN_MS: z.coerce.number().default(600000),
  AI_FAILURE_THRESHOLD: z.coerce.number().default(1),

  // NVIDIA NIM LLM & Prompt Guard (Preserved for prompt guard & legacy embeddings)
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_BASE_URL: z.string().default("https://integrate.api.nvidia.com/v1"),
  NVIDIA_LLM_MODEL: z.string().default("nvidia/nemotron-3.5-lightning-30b-a3b"),
  NVIDIA_PROMPT_GUARD_MODEL: z
    .string()
    .default("nvidia/nemotron-3.5-lightning-30b-a3b"),
  // Embeddings & RAG
  EMBEDDING_PROVIDER: z.enum(["pinecone", "mock"]).default("pinecone"),
  EMBEDDING_MODEL: z.string().default("multilingual-e5-large"),
  MAX_KNOWLEDGE_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024),
  RAG_TOP_K: z.coerce.number().default(5),
  RAG_CHUNK_SIZE: z.coerce.number().default(600),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(80),
});

const rawEnv = {
  DATABASE_URL: process.env.DATABASE_URL || process.env.DB_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000",
  NODE_ENV: process.env.NODE_ENV || "development",
  AWS_ENDPOINT_URL_S3: process.env.AWS_ENDPOINT_URL_S3,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || "us-east-2",
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "assets",
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_INDEX: process.env.PINECONE_INDEX || "dentassist",
  PINECONE_HOST: process.env.PINECONE_HOST,
  PINECONE_NAMESPACE_PREFIX: process.env.PINECONE_NAMESPACE_PREFIX,
  AI_PROVIDER: process.env.AI_PROVIDER || "gemini",
  AI_MODEL:
    process.env.AI_MODEL || process.env.AI_MODEL_1 || "gemini-2.5-flash-lite",
  AI_PROVIDER_1: process.env.AI_PROVIDER_1 || "gemini",
  AI_MODEL_1: process.env.AI_MODEL_1 || "gemini-2.5-flash-lite",
  AI_PRIORITY_1: process.env.AI_PRIORITY_1 || 1,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_BASE_URL:
    process.env.GEMINI_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta/openai/",

  AI_PROVIDER_2: process.env.AI_PROVIDER_2 || "groq",
  AI_MODEL_2: process.env.AI_MODEL_2 || "openai/gpt-oss-20b",
  AI_PRIORITY_2: process.env.AI_PRIORITY_2 || 2,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",

  AI_PROVIDER_3: process.env.AI_PROVIDER_3 || "openrouter",
  AI_MODEL_3:
    process.env.AI_MODEL_3 ||
    process.env.OPENROUTER_MODEL ||
    "google/gemma-4-31b-it:free",
  AI_PRIORITY_3: process.env.AI_PRIORITY_3 || 3,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL:
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,

  AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS || 15000,
  AI_PROVIDER_COOLDOWN_MS: process.env.AI_PROVIDER_COOLDOWN_MS || 60000,
  AI_RATE_LIMIT_COOLDOWN_MS: process.env.AI_RATE_LIMIT_COOLDOWN_MS || 60000,
  AI_TIMEOUT_COOLDOWN_MS: process.env.AI_TIMEOUT_COOLDOWN_MS || 30000,
  AI_PROVIDER_ERROR_COOLDOWN_MS:
    process.env.AI_PROVIDER_ERROR_COOLDOWN_MS || 30000,
  AI_NETWORK_ERROR_COOLDOWN_MS:
    process.env.AI_NETWORK_ERROR_COOLDOWN_MS || 30000,
  AI_INVALID_OUTPUT_COOLDOWN_MS:
    process.env.AI_INVALID_OUTPUT_COOLDOWN_MS || 30000,
  AI_AUTH_ERROR_COOLDOWN_MS: process.env.AI_AUTH_ERROR_COOLDOWN_MS || 600000,
  AI_CONFIG_ERROR_COOLDOWN_MS:
    process.env.AI_CONFIG_ERROR_COOLDOWN_MS || 600000,
  AI_FAILURE_THRESHOLD: process.env.AI_FAILURE_THRESHOLD || 1,
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
  NVIDIA_BASE_URL:
    process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
  NVIDIA_LLM_MODEL:
    process.env.NVIDIA_LLM_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
  NVIDIA_PROMPT_GUARD_MODEL:
    process.env.NVIDIA_PROMPT_GUARD_MODEL ||
    "nvidia/nemotron-3.5-lightning-30b-a3b",
  EMBEDDING_PROVIDER:
    (process.env.EMBEDDING_PROVIDER as "pinecone" | "mock") || "pinecone",
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "multilingual-e5-large",
  MAX_KNOWLEDGE_FILE_SIZE:
    process.env.MAX_KNOWLEDGE_FILE_SIZE || 10 * 1024 * 1024,
  RAG_TOP_K: process.env.RAG_TOP_K || 5,
  RAG_CHUNK_SIZE: process.env.RAG_CHUNK_SIZE || 600,
  RAG_CHUNK_OVERLAP: process.env.RAG_CHUNK_OVERLAP || 80,
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    z.flattenError(parsed.error).fieldErrors,
  );
  // In development, provide fallback/warning so build/tooling doesn't crash prematurely
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables");
  }
}

export const env = parsed.success
  ? parsed.data
  : (rawEnv as z.infer<typeof envSchema>);
export type Env = typeof env;
