"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

function Popover({ ...props }: Readonly<PopoverPrimitive.Root.Props>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: Readonly<PopoverPrimitive.Trigger.Props>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverPortal({ ...props }: Readonly<PopoverPrimitive.Portal.Props>) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />;
}

function PopoverClose({ ...props }: Readonly<PopoverPrimitive.Close.Props>) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

function PopoverContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  alignOffset = 0,
  children,
  ...props
}: Readonly<
  PopoverPrimitive.Popup.Props &
    Pick<
      PopoverPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset"
    >
>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-auto rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-xl duration-100 outline-none",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-left-1 data-[side=inline-start]:slide-in-from-right-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-98 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-98",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverPortal, PopoverClose };
