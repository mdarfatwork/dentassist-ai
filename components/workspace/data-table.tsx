import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: Readonly<React.HTMLAttributes<HTMLTableElement>>) {
  return (
    <div className="w-full overflow-x-auto border-y border-border">
      <table
        className={cn(
          "w-full caption-bottom text-xs text-left border-collapse",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: Readonly<React.HTMLAttributes<HTMLTableSectionElement>>) {
  return (
    <thead
      className={cn(
        "bg-muted/40 text-muted-foreground font-semibold border-b border-border text-[11px] uppercase tracking-wider",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: Readonly<React.HTMLAttributes<HTMLTableSectionElement>>) {
  return (
    <tbody
      className={cn("divide-y divide-border/60 bg-background", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: Readonly<React.HTMLAttributes<HTMLTableRowElement>>) {
  return (
    <tr
      className={cn(
        "hover:bg-muted/30 transition-colors data-[state=selected]:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: Readonly<React.ThHTMLAttributes<HTMLTableCellElement>>) {
  return (
    <th
      className={cn(
        "h-8 px-3.5 text-left align-middle font-semibold text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: Readonly<React.TdHTMLAttributes<HTMLTableCellElement>>) {
  return (
    <td
      className={cn(
        "py-2.5 px-3.5 align-middle text-foreground tabular-nums [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}
