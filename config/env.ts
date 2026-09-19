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
