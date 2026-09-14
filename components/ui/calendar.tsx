"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DayPicker,
  getDefaultClassNames,
  useDayPicker,
  type ChevronProps,
  type DayButton,
  type Locale,
  type RootProps,
  type WeekNumberProps,
} from "react-day-picker";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";

function CalendarRoot({ className, rootRef, ...props }: RootProps) {
  return (
    <div
      data-slot="calendar"
      ref={rootRef}
      className={cn(className)}
      {...props}
    />
  );
}

function CalendarChevron({
  className,
  orientation,
  ...props
}: Readonly<ChevronProps>) {
  if (orientation === "left") {
    return <ChevronLeftIcon className={cn("size-3.5", className)} {...props} />;
  }

  if (orientation === "right") {
    return (
      <ChevronRightIcon className={cn("size-3.5", className)} {...props} />
    );
  }

  return (
    <ChevronDownIcon
      className={cn(
        "size-3 text-muted-foreground/70 transition-transform duration-150",
        className,
      )}
      {...props}
    />
  );
}

function CalendarWeekNumber({ children, ...props }: WeekNumberProps) {
  return (
    <td {...props}>
      <div className="flex size-(--cell-size) items-center justify-center text-center font-mono text-[10px]">
        {children}
      </div>
    </td>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "outline",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background p-2.5 [--cell-radius:3px] [--cell-size:2rem] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-3 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-7 p-0 rounded-[3px] border-border text-foreground hover:bg-muted/70 hover:text-foreground select-none aria-disabled:opacity-40",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-7 p-0 rounded-[3px] border-border text-foreground hover:bg-muted/70 hover:text-foreground select-none aria-disabled:opacity-40",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-7 w-full items-center justify-center px-8",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-7 w-full items-center justify-center gap-1.5 text-xs font-semibold tracking-tight text-foreground",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative inline-flex items-center justify-center h-7 rounded-[3px] border border-border bg-background shadow-2xs hover:bg-muted/70 hover:border-border/90 text-foreground transition-all duration-150 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring cursor-pointer group/dropdown data-[disabled=true]:opacity-40 data-[disabled=true]:pointer-events-none",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 appearance-none bg-transparent [&>option]:bg-popover [&>option]:text-popover-foreground",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          captionLayout === "label"
            ? "font-bold text-xs tracking-tight text-foreground select-none"
            : "flex items-center gap-1 px-2 h-full text-xs font-semibold tracking-tight text-foreground select-none pointer-events-none group-hover/dropdown:text-foreground [&>svg]:size-3 [&>svg]:text-muted-foreground/70 group-hover/dropdown:[&>svg]:text-foreground [&>svg]:transition-transform group-hover/dropdown:[&>svg]:translate-y-px",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-[2px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center select-none py-1",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1.5 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[10px] font-mono text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-[3px] p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-[3px]",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-[3px]"
            : "[&:first-child[data-selected=true]_button]:rounded-l-[3px]",
          defaultClassNames.day,
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-[3px] bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-[3px] bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end,
        ),
        today: cn(
          "rounded-[3px] border border-border/80 bg-muted/40 font-semibold text-foreground data-[selected=true]:border-transparent data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground/30 opacity-40 aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground/30 opacity-30 cursor-not-allowed",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: CalendarRoot,
        Chevron: CalendarChevron,
        DayButton: CalendarDayButton,
        WeekNumber: CalendarWeekNumber,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale: propLocale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();
  const { dayPickerProps } = useDayPicker();
  const locale = propLocale ?? dayPickerProps.locale;

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-0.5 border-0 leading-none font-mono tabular-nums text-xs font-medium group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-1 group-data-[focused=true]/day:ring-ring/40 data-[range-end=true]:rounded-[3px] data-[range-end=true]:rounded-r-[3px] data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-[3px] data-[range-start=true]:rounded-l-[3px] data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:font-semibold data-[selected-single=true]:hover:bg-primary/90 dark:hover:text-foreground [&>span]:text-[10px] [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export {
  Calendar,
  CalendarDayButton,
  CalendarRoot,
  CalendarChevron,
  CalendarWeekNumber,
};
