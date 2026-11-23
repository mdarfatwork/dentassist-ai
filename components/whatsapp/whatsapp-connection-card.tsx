"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Trash2,
  ShieldCheck,
  Smartphone,
  Bot,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { WhatsAppStatus } from "@/lib/whatsapp/types";

export function WhatsAppConnectionCard() {
  const { activeOrganization } = useOrganization();
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState<WhatsAppStatus | null>(null);
  const [liveQr, setLiveQr] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const statusQuery = trpc.whatsapp.getStatus.useQuery(undefined, {
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.state?.status;
      if (currentStatus === "AWAITING_SCAN" || currentStatus === "CONNECTING") {
        return 2000;
      }
      return 15000;
    },
  });

  const connectMutation = trpc.whatsapp.connect.useMutation({
    onSuccess: (data) => {
      setLiveStatus(data.status);
      if (data.qrCode) {
        setLiveQr(data.qrCode);
      }
      statusQuery.refetch();
    },
  });

  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => {
      setDisconnectModalOpen(false);
      setLiveStatus("DISCONNECTED");
      setLiveQr(null);
      statusQuery.refetch();
    },
  });

  const state = statusQuery.data?.state;
  const currentStatus: WhatsAppStatus =
    liveStatus ?? state?.status ?? "DISCONNECTED";
  const qrCode = liveQr ?? state?.qrCode ?? null;

  // Real-time EventSource listener for instant QR and status updates
  useEffect(() => {
    if (currentStatus !== "CONNECTING" && currentStatus !== "AWAITING_SCAN") {
      return;
    }

    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/whatsapp/stream");

      es.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          if (update.status) {
            setLiveStatus(update.status);
          }
          if (update.qrCode) {
            setLiveQr(update.qrCode);
          }
          if (update.status === "CONNECTED" || update.status === "FAILED") {
            statusQuery.refetch();
            es?.close();
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es?.close();
      };
    } catch {
      // EventSource not supported or failed
    }

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [currentStatus, statusQuery]);

  // Countdown timer ticker for QR code freshness
  useEffect(() => {
    if (currentStatus !== "AWAITING_SCAN") return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStatus]);

  const secondsRemaining = state?.qrExpiresAt
    ? Math.max(
        0,
        Math.floor((new Date(state.qrExpiresAt).getTime() - now) / 1000),
      )
    : 60;

  const handleConnect = useCallback(async () => {
    setLiveStatus("CONNECTING");
    await connectMutation.mutateAsync();
  }, [connectMutation]);

  const handleDisconnect = async () => {
    await disconnectMutation.mutateAsync();
  };

  const isOwnerOrAdmin =
    activeOrganization?.role === "OWNER" ||
    activeOrganization?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <Card className="border border-border/80 bg-card rounded-xl shadow-xs overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border/60">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    WhatsApp Integration
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Autonomous 24/7 AI Receptionist linked directly via WhatsApp
                    Web
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentStatus === "CONNECTED" && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-50 text-emerald-700 gap-1.5 py-1 px-3"
                >
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected & Active
                </Badge>
              )}
              {currentStatus === "AWAITING_SCAN" && (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-50 text-amber-700 gap-1.5 py-1 px-3"
                >
                  <Loader2 className="size-3 animate-spin text-amber-600" />
                  Awaiting QR Scan
                </Badge>
              )}
              {currentStatus === "CONNECTING" && (
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary gap-1.5 py-1 px-3"
                >
                  <Loader2 className="size-3 animate-spin text-primary" />
                  Connecting
                </Badge>
              )}
              {currentStatus === "FAILED" && (
                <Badge
                  variant="outline"
                  className="border-destructive/30 bg-destructive/10 text-destructive gap-1.5 py-1 px-3"
                >
                  <AlertTriangle className="size-3 text-destructive" />
                  Connection Error
                </Badge>
              )}
              {currentStatus === "DISCONNECTED" && (
                <Badge
                  variant="outline"
                  className="border-muted text-muted-foreground py-1 px-3"
                >
                  Disconnected
                </Badge>
              )}
            </div>
          </div>

          {/* Body Content by Status */}
          <div className="pt-6">
            {/* 1. DISCONNECTED STATE */}
            {currentStatus === "DISCONNECTED" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-background border border-border/60 space-y-2">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Bot className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Autonomous Receptionist
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      DentAssist AI responds to patient appointment requests,
                      inquiries, and clinic questions instantly on WhatsApp.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-background border border-border/60 space-y-2">
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Encrypted State & Isolation
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Session keys and credentials are encrypted at rest with
                      AES-256-GCM. Zero patient data leaks.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-background border border-border/60 space-y-2">
                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Sparkles className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Zero Third-Party Fees
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Powered by the official Baileys protocol engine. Connect
                      any phone number with standard WhatsApp Web QR pairing.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Ready to connect your clinic line?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Generate a temporary pairing QR code and link your clinic
                      device in seconds.
                    </p>
                  </div>

                  {isOwnerOrAdmin && (
                    <Button
                      onClick={handleConnect}
                      disabled={connectMutation.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-5 py-2.5 shadow-xs cursor-pointer gap-2 shrink-0"
                    >
                      {connectMutation.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        <>
                          <QrCode className="size-4" />
                          Connect WhatsApp
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 2. CONNECTING STATE (NO QR YET) */}
            {currentStatus === "CONNECTING" && !qrCode && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Loader2 className="size-8 animate-spin" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-semibold text-foreground">
                    Initializing WhatsApp Worker
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Establishing cryptographic session parameters and generating
                    your unique linked-device QR code...
                  </p>
                </div>
              </div>
            )}

            {/* 3. AWAITING SCAN (QR DISPLAY) */}
            {currentStatus === "AWAITING_SCAN" && qrCode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-border shadow-xs space-y-4">
                  <div className="relative p-2 bg-white rounded-lg border border-border/80">
                    <Image
                      src={qrCode}
                      alt="WhatsApp Web Pairing QR Code"
                      width={256}
                      height={256}
                      unoptimized
                      priority
                      className="size-64 rounded-md object-contain"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs font-mono text-muted-foreground">
                      Refreshes in {secondsRemaining}s
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnect}
                      disabled={connectMutation.isPending}
                      className="h-7 text-xs rounded-lg gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="size-3" />
                      Refresh QR
                    </Button>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Smartphone className="size-5 text-primary" />
                      Scan with your WhatsApp App
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Follow these steps on your clinic WhatsApp device:
                    </p>
                  </div>

                  <ol className="space-y-3.5 text-xs text-foreground/90">
                    <li className="flex items-start gap-3">
                      <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span>
                        Open <strong>WhatsApp</strong> on your mobile phone.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span>
                        Tap <strong>Menu (⋮)</strong> on Android or{" "}
                        <strong>Settings</strong> on iPhone.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <span>
                        Select <strong>Linked Devices</strong>, then tap{" "}
                        <strong>Link a Device</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                        4
                      </span>
                      <span>
                        Point your camera at this QR code. Once scanned, your
                        session will activate automatically.
                      </span>
                    </li>
                  </ol>

                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-amber-700" />
                      Security Note
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      QR codes are short-lived authentication secrets valid for
                      60 seconds. DentAssist AI never shares or logs this
                      pairing token.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CONNECTED STATE */}
            {currentStatus === "CONNECTED" && (
              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        WhatsApp Line Linked & Operational
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        DentAssist AI is actively monitoring and replying to
                        patient direct messages.
                      </p>
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <Button
                      variant="outline"
                      onClick={() => setDisconnectModalOpen(true)}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg text-xs h-9 gap-1.5 cursor-pointer shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                      Disconnect WhatsApp
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-background border border-border/60 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Linked Phone Number
                    </span>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      {state?.phoneNumber
                        ? `+${state.phoneNumber}`
                        : "Configured"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-background border border-border/60 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Connected Profile
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {state?.pushName ||
                        activeOrganization?.name ||
                        "DentAssist Clinic"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-background border border-border/60 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Last Connected
                    </span>
                    <p className="text-sm font-mono text-foreground">
                      {state?.lastConnectedAt
                        ? new Date(state.lastConnectedAt).toLocaleDateString()
                        : "Active"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. FAILED STATE */}
            {currentStatus === "FAILED" && (
              <div className="p-5 rounded-xl bg-destructive/5 border border-destructive/20 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-destructive">
                      WhatsApp Connection Error
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {state?.disconnectReason ||
                        "The connection to the WhatsApp socket could not be established. Ensure your persistent WhatsApp worker is running."}
                    </p>
                  </div>
                </div>

                {isOwnerOrAdmin && (
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={handleConnect}
                      disabled={connectMutation.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs h-8 gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" />
                      Retry Connection
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      disabled={disconnectMutation.isPending}
                      className="text-xs h-8 rounded-lg cursor-pointer"
                    >
                      Reset Session
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectModalOpen} onOpenChange={setDisconnectModalOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Disconnect WhatsApp Session?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              Disconnecting will immediately unlink this device from your
              clinic&apos;s WhatsApp account and purge all encrypted
              cryptographic session keys. Incoming patient direct messages will
              no longer receive automated AI receptionist replies until you pair
              again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setDisconnectModalOpen(false)}
              className="rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="rounded-lg text-xs cursor-pointer gap-1.5"
            >
              {disconnectMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Confirm Disconnect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
