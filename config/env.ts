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
  // Groq LLM & Prompt Guard
  GROQ_API_KEY: z.string().optional(),
  GROQ_LLM_MODEL: z.string().default("qwen/qwen3.6-27b"),
  GROQ_PROMPT_GUARD_MODEL: z
    .string()
    .default("meta-llama/llama-prompt-guard-2-86m"),
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
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_LLM_MODEL: process.env.GROQ_LLM_MODEL || "qwen/qwen3.6-27b",
  GROQ_PROMPT_GUARD_MODEL:
    process.env.GROQ_PROMPT_GUARD_MODEL ||
    "meta-llama/llama-prompt-guard-2-86m",
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
