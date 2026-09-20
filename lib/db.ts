import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if cached client is missing newly generated models (e.g. across Next.js HMR)
const isOutdatedClient =
  globalForPrisma.prisma &&
  (!("appointment" in globalForPrisma.prisma) ||
    !("conversation" in globalForPrisma.prisma));

if (isOutdatedClient && globalForPrisma.prisma) {
  try {
    void globalForPrisma.prisma.$disconnect();
  } catch {
    // Ignore disconnect errors during hot-reload
  }
  globalForPrisma.prisma = undefined;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
