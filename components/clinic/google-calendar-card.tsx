"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Loader2,
  Trash2,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function GoogleCalendarCard() {
  const { activeOrganization } = useOrganization();
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [selectedCalendarSummary, setSelectedCalendarSummary] =
    useState<string>("");

  const statusQuery = trpc.googleCalendar.getStatus.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const listCalendarsQuery = trpc.googleCalendar.listCalendars.useQuery(
    undefined,
    {
      enabled: selectModalOpen,
    },
  );

  const selectMutation = trpc.googleCalendar.selectCalendar.useMutation({
    onSuccess: () => {
      setSelectModalOpen(false);
      statusQuery.refetch();
    },
  });

  const disconnectMutation = trpc.googleCalendar.disconnect.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // Check URL parameters for callback feedback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("selectCalendar") === "true") {
        url.searchParams.delete("selectCalendar");
        url.searchParams.delete("calendarConnected");
        window.history.replaceState({}, "", url.toString());
        const timer = setTimeout(() => {
          setSelectModalOpen(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const connection = statusQuery.data;
  const isOwnerOrAdmin =
    activeOrganization?.role === "OWNER" ||
    activeOrganization?.role === "ADMIN";

  const handleConnect = () => {
    // Navigate full browser to Google OAuth consent redirect handler
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/google-calendar/connect");
  };

  const handleDisconnect = async () => {
    if (
      confirm(
        "Are you sure you want to disconnect Google Calendar? Patient appointment synchronizations will be stopped.",
      )
    ) {
      await disconnectMutation.mutateAsync();
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedCalendarId || !selectedCalendarSummary) return;
    await selectMutation.mutateAsync({
      calendarId: selectedCalendarId,
      calendarName: selectedCalendarSummary,
    });
  };

  return (
    <>
      <Card className="border-border shadow-none">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-[4px] bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    Google Calendar Integration
                  </h3>
                  {connection?.status === "CONNECTED" &&
                  connection.calendarId ? (
                    <Badge
                      variant="success"
                      className="text-[10px] gap-1 px-1.5 py-0.2"
                    >
                      <CheckCircle2 className="size-3" /> Connected
                    </Badge>
                  ) : connection?.status === "REAUTH_REQUIRED" ? (
                    <Badge
                      variant="destructive"
                      className="text-[10px] gap-1 px-1.5 py-0.2"
                    >
                      <AlertTriangle className="size-3" /> Reauth Required
                    </Badge>
                  ) : connection?.status === "CONNECTED" &&
                    !connection.calendarId ? (
                    <Badge
                      variant="warning"
                      className="text-[10px] gap-1 px-1.5 py-0.2"
                    >
                      <CalendarDays className="size-3" /> Select Calendar
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-mono"
                    >
                      Disconnected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  Connect your clinic&apos;s Google Calendar to synchronize
                  bookings, detect practitioner chair busy periods, and prevent
                  double bookings in real time.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => statusQuery.refetch()}
                disabled={statusQuery.isFetching}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" /> Refresh
              </Button>
            </div>
          </div>

          {/* Connection Status Details */}
          {statusQuery.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin text-primary" /> Loading
              calendar status...
            </div>
          ) : connection?.status === "CONNECTED" && connection.calendarId ? (
            <div className="rounded-[4px] border border-border bg-muted/40 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Synchronized Calendar
                  </span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                    <CalendarDays className="size-3.5 text-primary" />
                    {connection.calendarName || connection.calendarId}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Google Account
                  </span>
                  <span className="font-mono text-foreground mt-0.5 block">
                    {connection.googleAccountEmail || "Connected Account"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>Real-time FreeBusy & Event Sync Active</span>
                </div>

                {isOwnerOrAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectModalOpen(true)}
                      className="text-xs h-7 gap-1"
                    >
                      Change Calendar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={disconnectMutation.isPending}
                      className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                    >
                      <Trash2 className="size-3" /> Disconnect
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : connection?.status === "CONNECTED" && !connection.calendarId ? (
            <div className="rounded-[4px] border border-amber-500/20 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    Calendar Selection Required
                  </h4>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    Google account authorized ({connection.googleAccountEmail}).
                    Please choose which calendar DentAssist will use for
                    appointments.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setSelectModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <CalendarDays className="size-3.5" /> Select Calendar Now
              </Button>
            </div>
          ) : connection?.status === "REAUTH_REQUIRED" ? (
            <div className="rounded-[4px] border border-destructive/20 bg-destructive/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-destructive">
                    Google Calendar Reauthorization Required
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Access to your clinic Google Calendar was revoked or
                    expired. Please reconnect to restore appointment
                    synchronization.
                  </p>
                </div>
              </div>
              {isOwnerOrAdmin && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleConnect}
                  className="text-xs gap-1.5"
                >
                  <ExternalLink className="size-3.5" /> Reconnect Google
                  Calendar
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-[4px] border border-dashed border-border p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="size-10 rounded-[3px] bg-muted flex items-center justify-center text-muted-foreground">
                <Calendar className="size-5" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-xs font-semibold text-foreground">
                  No Calendar Connected
                </h4>
                <p className="text-xs text-muted-foreground">
                  Connect your clinic Google account to automatically block out
                  busy hours and push confirmed bookings directly to your
                  clinical schedule.
                </p>
              </div>
              {isOwnerOrAdmin ? (
                <Button
                  size="sm"
                  onClick={handleConnect}
                  className="text-xs gap-1.5"
                >
                  <ExternalLink className="size-3.5" /> Connect Google Calendar
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground italic">
                  Ask a clinic owner or administrator to connect Google
                  Calendar.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Selection Dialog */}
      <Dialog open={selectModalOpen} onOpenChange={setSelectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Select Google
              Calendar
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose the specific calendar DentAssist AI will check for
              availability and push confirmed bookings to.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            {listCalendarsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />{" "}
                Fetching calendars from Google...
              </div>
            ) : listCalendarsQuery.isError ? (
              <div className="p-3 text-xs rounded-[4px] bg-destructive/10 text-destructive border border-destructive/20">
                Failed to load calendars: {listCalendarsQuery.error.message}
              </div>
            ) : (listCalendarsQuery.data || []).length === 0 ? (
              <div className="p-4 text-xs text-center text-muted-foreground">
                No calendars found on this Google account.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {(listCalendarsQuery.data || []).map((cal) => {
                  const isSelected = selectedCalendarId === cal.id;
                  return (
                    <div
                      key={cal.id}
                      onClick={() => {
                        setSelectedCalendarId(cal.id);
                        setSelectedCalendarSummary(cal.summary);
                      }}
                      className={`p-3 rounded-[3px] border cursor-pointer transition-colors flex items-center justify-between text-xs ${
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          {cal.summary}
                          {cal.primary && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 font-mono"
                            >
                              Primary
                            </Badge>
                          )}
                        </div>
                        {cal.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {cal.description}
                          </p>
                        )}
                      </div>
                      <div className="size-4 rounded-full border flex items-center justify-center shrink-0 border-border">
                        {isSelected && (
                          <div className="size-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSelection}
              disabled={!selectedCalendarId || selectMutation.isPending}
              className="text-xs gap-1.5"
            >
              {selectMutation.isPending ? (
                <>
                  <Loader2 className="size-3 animate-spin" /> Saving...
                </>
              ) : (
                "Save Calendar Selection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
