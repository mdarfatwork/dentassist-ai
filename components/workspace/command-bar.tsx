import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommandBarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CommandBar({
  searchValue,
  onSearchChange,
  placeholder = "Filter or search workspace...",
  filters,
  actions,
  className,
}: Readonly<CommandBarProps>) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 bg-muted/20 border border-border rounded-[3px]",
        className,
      )}
    >
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={placeholder}
          className="h-7.5 pl-8 bg-background text-xs border-border/80 focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {filters}
        {actions}
      </div>
    </div>
  );
}
