"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signOut } from "@/lib/auth/auth-client";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  className?: string;
  showIcon?: boolean;
  hideText?: boolean;
  iconOnly?: boolean;
  title?: string;
}

export function LogoutButton({
  variant = "outline",
  className,
  showIcon = true,
  hideText = false,
  iconOnly = false,
  title,
}: Readonly<LogoutButtonProps>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isIconOnly = hideText || iconOnly;

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
            router.refresh();
          },
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback navigation
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={cn(isIconOnly && "p-0 justify-center", className)}
      onClick={handleLogout}
      disabled={isLoading}
      title={title || (isIconOnly ? "Sign Out" : undefined)}
      aria-label="Sign Out"
    >
      {isLoading ? (
        <Spinner className={cn(!isIconOnly && "mr-2")} />
      ) : (
        showIcon && (
          <LogOut className={cn("size-4 shrink-0", !isIconOnly && "mr-2")} />
        )
      )}
      {!isIconOnly && <span>{isLoading ? "Signing out..." : "Sign Out"}</span>}
    </Button>
  );
}
