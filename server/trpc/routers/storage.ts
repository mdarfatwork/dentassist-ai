import { router, organizationProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  generateClinicStorageKey,
  getPresignedUploadUrl,
  getPresignedViewUrl,
  deleteObjectFromS3,
  getPermanentStorageUrl,
} from "@/lib/storage/s3";

export const storageRouter = router({
  /**
   * Generates a presigned S3 PUT URL for direct client-side upload.
   */
  getUploadUrl: organizationProcedure
    .input(
      z.object({
        filename: z.string().min(1, "Filename is required"),
        contentType: z.string().min(1, "Content type is required"),
        folder: z.enum(["photos", "logo", "documents"]).default("photos"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only clinic owners and admins can request upload signatures.",
        });
      }

      const key = generateClinicStorageKey({
        organizationId: ctx.organizationId,
        folder: input.folder,
        filename: input.filename,
      });

      const { uploadUrl } = await getPresignedUploadUrl({
        key,
        contentType: input.contentType,
      });

      return {
        uploadUrl,
        key,
        url: getPermanentStorageUrl(key),
      };
    }),

  /**
   * Generates a fresh presigned GET URL for viewing an authorized tenant asset.
   */
  getViewUrl: organizationProcedure
    .input(
      z.object({
        key: z.string().min(1, "Storage key is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Ensure the object key strictly belongs to this clinic's folder
      if (!input.key.startsWith(`clinics/${ctx.organizationId}/`)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view assets belonging to your organization.",
        });
      }

      const viewUrl = await getPresignedViewUrl({
        key: input.key,
        expiresInSeconds: 604800,
      });

      return {
        viewUrl,
        permanentUrl: getPermanentStorageUrl(input.key),
      };
    }),

  /**
   * Securely deletes an asset from S3 within the clinic tenant folder.
   */
  deleteFile: organizationProcedure
    .input(
      z.object({
        key: z.string().min(1, "Storage key is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only clinic owners and admins can delete clinic assets.",
        });
      }

      if (!input.key.startsWith(`clinics/${ctx.organizationId}/`)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete assets belonging to your organization.",
        });
      }

      await deleteObjectFromS3({ key: input.key });

      return { success: true };
    }),
});
