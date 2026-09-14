import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusIndicator, type StatusType } from "./status-indicator";

export interface TimelineAppointmentItem {
  id: string;
  patientName: string;
  serviceName: string;
  dentistName: string;
  time: string;
  durationMinutes: number;
  status: "confirmed" | "pending" | "completed" | "cancelled";
}

interface AppointmentTimelineProps {
  items: TimelineAppointmentItem[];
  className?: string;
  onSelect?: (item: TimelineAppointmentItem) => void;
}

const statusMap: Record<
  TimelineAppointmentItem["status"],
  { label: string; type: StatusType }
> = {
  confirmed: { label: "Confirmed", type: "active" },
  pending: { label: "Pending Intake", type: "warning" },
  completed: { label: "Completed", type: "success" },
  cancelled: { label: "Cancelled", type: "destructive" },
};

export function AppointmentTimeline({
  items,
  className,
  onSelect,
}: Readonly<AppointmentTimelineProps>) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-[3px]">
        No appointments scheduled for this timeline.
      </div>
    );
  }

  return (
    <div
      className={cn("divide-y divide-border border-y border-border", className)}
    >
      {items.map((item) => {
        const statusInfo = statusMap[item.status];
        return (
          <div
            key={item.id}
            onClick={() => onSelect?.(item)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-3 hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-3">
              {/* Time Column */}
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground w-24 shrink-0">
                <Clock className="size-3 text-muted-foreground" />
                <span className="tabular-nums">{item.time}</span>
              </div>

              {/* Patient & Service Column */}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5 truncate">
                  <User className="size-3 text-muted-foreground shrink-0" />
                  {item.patientName}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {item.serviceName} • {item.durationMinutes} min
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
              <span className="text-[11px] text-muted-foreground border-l border-border/80 pl-3 hidden md:inline">
                Dr. {item.dentistName}
              </span>
              <StatusIndicator
                status={statusInfo.type}
                label={statusInfo.label}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
