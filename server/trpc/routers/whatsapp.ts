import { router, organizationProcedure } from "../trpc";
import { WhatsAppWorkerClient } from "@/lib/whatsapp/worker-client";

export const whatsappRouter = router({
  /**
   * Fetch the current WhatsApp connection status for the authenticated active organization.
   */
  getStatus: organizationProcedure.query(async ({ ctx }) => {
    return WhatsAppWorkerClient.getStatus(ctx.organizationId);
  }),

  /**
   * Request the persistent worker to initialize QR pairing or restore session for the organization.
   */
  connect: organizationProcedure.mutation(async ({ ctx }) => {
    return WhatsAppWorkerClient.connect(ctx.organizationId);
  }),

  /**
   * Request the persistent worker to disconnect and purge the session for the organization.
   */
  disconnect: organizationProcedure.mutation(async ({ ctx }) => {
    return WhatsAppWorkerClient.disconnect(ctx.organizationId);
  }),
});
