import crypto from "crypto";

/**
 * AES-256-GCM WhatsApp Authentication State Encryption Utility
 * Provides authenticated encryption for sensitive Baileys session credentials and Signal cryptographic keys.
 * Raw credentials and keys are NEVER stored in plaintext or logged.
 */

function getEncryptionKey(): Buffer {
  const envKey =
    process.env.WHATSAPP_AUTH_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;

  if (!envKey) {
    throw new Error(
      "WHATSAPP_AUTH_ENCRYPTION_KEY environment variable is missing. A 32-byte key is required.",
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

/**
 * Encrypt plaintext using AES-256-GCM with a fresh random 12-byte IV.
 * Returns format: `${ivHex}:${authTagHex}:${encryptedHex}`
 */
export function encryptAuthData(plainText: string): string {
  if (!plainText) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt AES-256-GCM ciphertext, verifying authentication tag.
 * Throws if authentication tag verification fails (tampered data).
 */
export function decryptAuthData(cipherText: string): string {
  if (!cipherText) return "";

  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted WhatsApp auth data format.");
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
