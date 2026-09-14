"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(
  undefined,
);

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: Readonly<TabsProps>) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue || "",
  );
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (val: string) => {
      if (!isControlled) {
        setUncontrolledValue(val);
      }
      onValueChange?.(val);
    },
    [isControlled, onValueChange],
  );

  const contextValue = React.useMemo(
    () => ({ value: activeValue, onValueChange: handleValueChange }),
    [activeValue, handleValueChange],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full flex flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-9 items-center justify-start border-b border-border bg-transparent p-0 text-muted-foreground gap-1 overflow-x-auto max-w-full",
        className,
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

function TabsTrigger({
  value,
  className,
  children,
  ...props
}: Readonly<TabsTriggerProps>) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component");
  }

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-3.5 py-2 text-xs font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer border-b-2 -mb-px",
        isSelected
          ? "border-primary text-foreground font-semibold"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

function TabsContent({
  value,
  className,
  children,
  ...props
}: Readonly<TabsContentProps>) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component");
  }

  if (context.value !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={cn(
        "outline-none animate-in fade-in-50 duration-100",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
