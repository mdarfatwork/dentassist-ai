import crypto from "crypto";

/**
 * AES-256-GCM Token Encryption Utility
 * Provides authenticated encryption for sensitive Google OAuth access and refresh tokens.
 * Plaintext tokens are NEVER stored in plaintext or logged.
 */

function getEncryptionKey(): Buffer {
  const envKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error(
      "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY environment variable is missing. A 32-byte key is required.",
    );
  }

  // If 64 hex characters (32 bytes hex-encoded)
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, "hex");
  }

  // If base64-encoded 32 bytes (44 chars with padding)
  if (envKey.length === 44 && /^[0-9a-zA-Z+/=]+$/.test(envKey)) {
    const buf = Buffer.from(envKey, "base64");
    if (buf.length === 32) return buf;
  }

  // Derive 32-byte key deterministically via SHA-256 if arbitrary string
  return crypto.createHash("sha256").update(envKey).digest();
}

export function encryptToken(plainText: string): string {
  if (!plainText) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptToken(cipherText: string): string {
  if (!cipherText) return "";

  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
