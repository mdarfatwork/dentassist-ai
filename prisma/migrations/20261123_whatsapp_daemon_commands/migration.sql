-- CreateEnum
CREATE TYPE "WhatsAppCommandType" AS ENUM ('CONNECT', 'DISCONNECT');

-- CreateEnum
CREATE TYPE "WhatsAppCommandStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "whatsapp_command" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "commandType" "WhatsAppCommandType" NOT NULL,
    "status" "WhatsAppCommandStatus" NOT NULL DEFAULT 'PENDING',
    "payload" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_command_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_command_idempotencyKey_key" ON "whatsapp_command"("idempotencyKey");

-- CreateIndex
CREATE INDEX "whatsapp_command_status_leaseExpiresAt_createdAt_idx" ON "whatsapp_command"("status", "leaseExpiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_command_organizationId_status_idx" ON "whatsapp_command"("organizationId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_connection_status_idx" ON "whatsapp_connection"("status");

-- AddForeignKey
ALTER TABLE "whatsapp_command" ADD CONSTRAINT "whatsapp_command_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
