import { router, organizationProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { WidgetService } from "@/lib/widget/service";
import {
  updateWidgetSettingsSchema,
  updateAllowedDomainsSchema,
} from "@/lib/widget/types";
import { env } from "@/config/env";

export const widgetRouter = router({
  /**
   * Retrieves the current organization's widget configuration.
   */
  get: organizationProcedure.query(async ({ ctx }) => {
    return await WidgetService.getOrCreateWidget(ctx.organizationId);
  }),

  /**
   * Updates widget appearance and behavior settings.
   */
  updateSettings: organizationProcedure
    .input(updateWidgetSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      // Permission check: only OWNER or ADMIN can modify widget configuration
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only organization owners and administrators can configure the website widget.",
        });
      }

      return await WidgetService.updateSettings(ctx.organizationId, input);
    }),

  /**
   * Updates the list of allowed domain origins.
   */
  updateAllowedDomains: organizationProcedure
    .input(updateAllowedDomainsSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only organization owners and administrators can configure allowed domains.",
        });
      }

      try {
        return await WidgetService.updateAllowedDomains(
          ctx.organizationId,
          input.allowedDomains,
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Invalid domain format";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: msg,
        });
      }
    }),

  /**
   * Toggles widget active status.
   */
  toggleActive: organizationProcedure
    .input(z.object({ isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only organization owners and administrators can activate/deactivate the widget.",
        });
      }

      return await WidgetService.toggleActive(
        ctx.organizationId,
        input.isActive,
      );
    }),

  /**
   * Rotates public widget identifier.
   */
  rotatePublicId: organizationProcedure.mutation(async ({ ctx }) => {
    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Only organization owners and administrators can rotate the public widget ID.",
      });
    }

    return await WidgetService.rotatePublicId(ctx.organizationId);
  }),

  /**
   * Generates the embed script snippet for the active organization.
   */
  getSnippet: organizationProcedure.query(async ({ ctx }) => {
    const widget = await WidgetService.getOrCreateWidget(ctx.organizationId);
    const appUrl = (env.NEXT_PUBLIC_APP_URL || "https://dentassist.ai").replace(
      /\/$/,
      "",
    );

    const scriptSrc = `${appUrl}/widget.js`;
    const snippetHtml = `<script\n  src="${scriptSrc}"\n  data-widget-id="${widget.publicId}"\n  async\n></script>`;

    return {
      publicId: widget.publicId,
      scriptSrc,
      snippetHtml,
      appUrl,
      isActive: widget.isActive,
      allowedDomains: widget.allowedDomains,
    };
  }),
});
