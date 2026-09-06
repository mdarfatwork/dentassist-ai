"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signOut } from "@/lib/auth/auth-client";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  className?: string;
  showIcon?: boolean;
}

export function LogoutButton({
  variant = "outline",
  className,
  showIcon = true,
}: Readonly<LogoutButtonProps>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <Spinner className="mr-2" />
      ) : (
        showIcon && <LogOut className="size-4 mr-2" />
      )}
      <span>{isLoading ? "Signing out..." : "Sign Out"}</span>
    </Button>
  );
}
