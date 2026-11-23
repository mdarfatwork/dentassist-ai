/**
 * Lazy loader for @whiskeysockets/baileys to guarantee compatibility with
 * ESM-only packaging in Node.js 24 without CJS bundle issues.
 */
let baileysInstance: typeof import("@whiskeysockets/baileys") | null = null;

export async function getBaileys(): Promise<
  typeof import("@whiskeysockets/baileys")
> {
  if (!baileysInstance) {
    baileysInstance = await import("@whiskeysockets/baileys");
  }
  return baileysInstance;
}
