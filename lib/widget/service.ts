import { db } from "@/lib/db";
import crypto from "crypto";
import {
  type UpdateWidgetSettingsInput,
  type PublicWidgetConfig,
} from "./types";
import { validateAllowedDomainsList } from "./domain-validator";
import { ReceptionistService } from "@/lib/receptionist/service";
import { type ReceptionistResponse } from "@/lib/receptionist/types";

/**
 * Generates an unguessable public widget identifier:
 * e.g. "da_wgt_3f9a7b2c8e1d4f6a9b0c2e4f"
 */
export function generatePublicWidgetId(): string {
  return `da_wgt_${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Hashes a session token using SHA-256 for secure storage.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class WidgetService {
  /**
   * Resolves an active widget by its publicId.
   * Returns null if not found or inactive.
   */
  public static async getActiveWidgetByPublicId(publicId: string) {
    if (!publicId || typeof publicId !== "string") return null;

    const widget = await db.websiteWidget.findUnique({
      where: { publicId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            timezone: true,
          },
        },
      },
    });

    if (!widget || !widget.isActive) {
      return null;
    }

    return widget;
  }

  /**
   * Returns sanitized public configuration safe to expose to browser.
   */
  public static formatPublicConfig(
    widget: NonNullable<
      Awaited<ReturnType<typeof WidgetService.getActiveWidgetByPublicId>>
    >,
  ): PublicWidgetConfig {
    return {
      publicId: widget.publicId,
      clinicName: widget.organization.name,
      assistantName: widget.assistantName,
      welcomeMessage: widget.welcomeMessage,
      primaryColor: widget.primaryColor,
      launcherPosition: widget.launcherPosition as
        "bottom-right" | "bottom-left",
      showBranding: widget.showBranding,
      enableChat: widget.enableChat,
      enableVoice: widget.enableVoice,
      timezone: widget.organization.timezone,
    };
  }

  /**
   * Retrieves or initializes widget for an organization (staff administrative operation).
   */
  public static async getOrCreateWidget(organizationId: string) {
    let widget = await db.websiteWidget.findUnique({
      where: { organizationId },
    });

    if (!widget) {
      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });

      widget = await db.websiteWidget.create({
        data: {
          publicId: generatePublicWidgetId(),
          organizationId,
          name: org?.name
            ? `${org.name} Receptionist Widget`
            : "Clinic Receptionist Widget",
          primaryColor: "#1E40AF",
          launcherPosition: "bottom-right",
          welcomeMessage: "Hi! How can I help you today?",
          assistantName: "DentAssist",
          showBranding: true,
          enableChat: true,
          enableVoice: false,
          allowedDomains: [],
          isActive: true,
        },
      });
    }

    return widget;
  }

  /**
   * Updates widget appearance and behavior settings.
   */
  public static async updateSettings(
    organizationId: string,
    input: UpdateWidgetSettingsInput,
  ) {
    // Ensure widget exists
    await this.getOrCreateWidget(organizationId);

    return await db.websiteWidget.update({
      where: { organizationId },
      data: {
        name: input.name,
        assistantName: input.assistantName,
        welcomeMessage: input.welcomeMessage,
        primaryColor: input.primaryColor,
        launcherPosition: input.launcherPosition,
        showBranding: input.showBranding,
        enableChat: input.enableChat,
        enableVoice: input.enableVoice,
      },
    });
  }

  /**
   * Updates allowed domains with validation.
   */
  public static async updateAllowedDomains(
    organizationId: string,
    domains: string[],
  ) {
    await this.getOrCreateWidget(organizationId);
    const validatedDomains = validateAllowedDomainsList(domains);

    return await db.websiteWidget.update({
      where: { organizationId },
      data: {
        allowedDomains: validatedDomains,
      },
    });
  }

  /**
   * Toggles widget active status.
   */
  public static async toggleActive(organizationId: string, isActive: boolean) {
    await this.getOrCreateWidget(organizationId);

    return await db.websiteWidget.update({
      where: { organizationId },
      data: { isActive },
    });
  }

  /**
   * Rotates public widget identifier.
   */
  public static async rotatePublicId(organizationId: string) {
    await this.getOrCreateWidget(organizationId);
    const newPublicId = generatePublicWidgetId();

    return await db.websiteWidget.update({
      where: { organizationId },
      data: { publicId: newPublicId },
    });
  }

  /**
   * Creates a cryptographically random visitor session bound to this widget and organization.
   */
  public static async createVisitorSession(publicWidgetId: string) {
    const widget = await this.getActiveWidgetByPublicId(publicWidgetId);
    if (!widget) {
      throw new Error("WIDGET_NOT_FOUND_OR_INACTIVE");
    }

    const rawToken = `da_ses_${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiration

    // Create an isolated conversation for the organization
    const conversation = await db.conversation.create({
      data: {
        organizationId: widget.organizationId,
        bookingState: {},
      },
      select: { id: true },
    });

    await db.widgetSession.create({
      data: {
        widgetId: widget.id,
        tokenHash,
        conversationId: conversation.id,
        expiresAt,
      },
    });

    return {
      sessionToken: rawToken,
      conversationId: conversation.id,
      expiresAt,
    };
  }

  /**
   * Verifies that a visitor session token is valid, non-expired, and bound to the specified widget.
   */
  public static async verifyVisitorSession(
    publicWidgetId: string,
    rawToken: string,
  ) {
    if (!publicWidgetId || !rawToken) return null;

    const widget = await this.getActiveWidgetByPublicId(publicWidgetId);
    if (!widget) return null;

    const tokenHash = hashSessionToken(rawToken);
    const session = await db.widgetSession.findUnique({
      where: { tokenHash },
    });

    if (!session) return null;

    // Strict boundary checks:
    // 1. Session must belong to the resolved widget
    if (session.widgetId !== widget.id) return null;

    // 2. Session must not be expired
    if (new Date() > session.expiresAt) return null;

    return {
      session,
      widget,
      conversationId: session.conversationId,
    };
  }

  /**
   * Processes a public visitor chat message through the existing AI Core.
   */
  public static async processVisitorMessage(params: {
    publicWidgetId: string;
    sessionToken: string;
    message: string;
  }): Promise<ReceptionistResponse> {
    const verification = await this.verifyVisitorSession(
      params.publicWidgetId,
      params.sessionToken,
    );

    if (!verification) {
      throw new Error("UNAUTHORIZED_VISITOR_SESSION");
    }

    const { widget, conversationId } = verification;

    if (!widget.enableChat) {
      throw new Error("CHAT_DISABLED");
    }

    const trimmed = params.message.trim();
    if (!trimmed) {
      throw new Error("EMPTY_MESSAGE");
    }
    if (trimmed.length > 2000) {
      throw new Error("MESSAGE_TOO_LONG");
    }

    // Call existing AI Core with verified organization ID derived from server-side widget record
    return await ReceptionistService.processMessage({
      organizationId: widget.organizationId,
      conversationId: conversationId ?? undefined,
      message: trimmed,
    });
  }

  /**
   * Processes a spoken utterance through the existing AI Core (reusing browser voice).
   */
  public static async processVisitorVoice(params: {
    publicWidgetId: string;
    sessionToken: string;
    transcript: string;
  }): Promise<ReceptionistResponse> {
    const verification = await this.verifyVisitorSession(
      params.publicWidgetId,
      params.sessionToken,
    );

    if (!verification) {
      throw new Error("UNAUTHORIZED_VISITOR_SESSION");
    }

    const { widget, conversationId } = verification;

    if (!widget.enableVoice) {
      throw new Error("VOICE_DISABLED");
    }

    const trimmed = params.transcript.trim();
    if (!trimmed) {
      throw new Error("EMPTY_TRANSCRIPT");
    }
    if (trimmed.length > 2000) {
      throw new Error("TRANSCRIPT_TOO_LONG");
    }

    return await ReceptionistService.processMessage({
      organizationId: widget.organizationId,
      conversationId: conversationId ?? undefined,
      message: trimmed,
    });
  }
}
