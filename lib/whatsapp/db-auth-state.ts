import { db } from "@/lib/db";
import { encryptAuthData, decryptAuthData } from "./encryption";
import { getBaileys } from "./baileys-loader";
import type {
  AuthenticationState,
  SignalDataSet,
  SignalDataTypeMap,
  AuthenticationCreds,
} from "@whiskeysockets/baileys";

export interface DatabaseAuthStateResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearAuthState: () => Promise<void>;
}

/**
 * Production-ready PostgreSQL database-backed authentication state adapter for Baileys.
 * Encrypts all sensitive credentials and Signal protocol keys at rest using AES-256-GCM.
 * Replaces useMultiFileAuthState as required by Baileys production documentation.
 */
export async function initDatabaseAuthState(
  organizationId: string,
): Promise<DatabaseAuthStateResult> {
  const { BufferJSON, initAuthCreds, proto } = await getBaileys();

  // Helper to read and decrypt a key from the database
  const readData = async (key: string): Promise<unknown | null> => {
    try {
      const record = await db.whatsAppAuthState.findUnique({
        where: {
          organizationId_key: {
            organizationId,
            key,
          },
        },
      });

      if (!record?.value) return null;

      const decrypted = decryptAuthData(record.value);
      return JSON.parse(decrypted, BufferJSON.reviver);
    } catch (error) {
      console.error(
        `[WhatsApp Auth] Failed to read auth key "${key}" for org ${organizationId}:`,
        error instanceof Error ? error.message : "Decryption / parse error",
      );
      return null;
    }
  };

  // Helper to encrypt and write a key to the database
  const writeData = async (key: string, data: unknown): Promise<void> => {
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    const encrypted = encryptAuthData(serialized);

    await db.whatsAppAuthState.upsert({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
      update: {
        value: encrypted,
      },
      create: {
        organizationId,
        key,
        value: encrypted,
      },
    });
  };

  // 1. Load or initialize credentials
  const credsData = await readData("creds");
  let creds: AuthenticationCreds;

  if (credsData) {
    creds = credsData as AuthenticationCreds;
  } else {
    creds = initAuthCreds();
    await writeData("creds", creds);
  }

  // 2. Build the SignalKeyStore implementation
  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[],
      ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
        const result: { [id: string]: SignalDataTypeMap[T] } = {};
        if (ids.length === 0) return result;

        const dbKeys = ids.map((id) => `${type}-${id}`);
        const records = await db.whatsAppAuthState.findMany({
          where: {
            organizationId,
            key: { in: dbKeys },
          },
        });

        const recordMap = new Map<string, string>();
        for (const rec of records) {
          recordMap.set(rec.key, rec.value);
        }

        for (const id of ids) {
          const key = `${type}-${id}`;
          const encryptedValue = recordMap.get(key);

          if (encryptedValue) {
            try {
              const decrypted = decryptAuthData(encryptedValue);
              let value = JSON.parse(decrypted, BufferJSON.reviver);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              result[id] = value as SignalDataTypeMap[T];
            } catch {
              // Ignore parse/decryption failure for individual key
            }
          }
        }

        return result;
      },

      set: async (data: SignalDataSet): Promise<void> => {
        const upsertOps: Array<{ key: string; value: string }> = [];
        const deleteKeys: string[] = [];

        for (const category of Object.keys(data)) {
          const categoryData = data[category as keyof SignalDataSet];
          if (!categoryData) continue;

          for (const id of Object.keys(categoryData)) {
            const value = (categoryData as Record<string, unknown>)[id];
            const key = `${category}-${id}`;

            if (value !== null && value !== undefined) {
              const serialized = JSON.stringify(value, BufferJSON.replacer);
              const encrypted = encryptAuthData(serialized);
              upsertOps.push({ key, value: encrypted });
            } else {
              deleteKeys.push(key);
            }
          }
        }

        const transactions = [];

        if (deleteKeys.length > 0) {
          transactions.push(
            db.whatsAppAuthState.deleteMany({
              where: {
                organizationId,
                key: { in: deleteKeys },
              },
            }),
          );
        }

        for (const op of upsertOps) {
          transactions.push(
            db.whatsAppAuthState.upsert({
              where: {
                organizationId_key: {
                  organizationId,
                  key: op.key,
                },
              },
              update: { value: op.value },
              create: {
                organizationId,
                key: op.key,
                value: op.value,
              },
            }),
          );
        }

        if (transactions.length > 0) {
          await db.$transaction(transactions);
        }
      },

      clear: async (): Promise<void> => {
        await db.whatsAppAuthState.deleteMany({
          where: { organizationId },
        });
      },
    },
  };

  const saveCreds = async (): Promise<void> => {
    await writeData("creds", state.creds);
  };

  const clearAuthState = async (): Promise<void> => {
    await db.whatsAppAuthState.deleteMany({
      where: { organizationId },
    });
  };

  return {
    state,
    saveCreds,
    clearAuthState,
  };
}
