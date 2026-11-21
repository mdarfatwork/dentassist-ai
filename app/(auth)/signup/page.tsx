"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/auth-client";
import { getFriendlyOAuthErrorMessage } from "@/lib/auth/oauth-errors";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { GoogleButton } from "@/components/auth/google-button";
import { AlertCircle, Stethoscope } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl =
    searchParams.get("callbackUrl") ||
    searchParams.get("callbackURL") ||
    "/dashboard";
  const errorParam = searchParams.get("error");
  const errorDescParam = searchParams.get("error_description");

  const [authError, setAuthError] = useState<string | null>(() =>
    getFriendlyOAuthErrorMessage(errorParam, errorDescParam),
  );
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  // If already authenticated, redirect to destination
  const { data: session, isPending: isSessionPending } = useSession();

  useEffect(() => {
    if (!isSessionPending && session?.user) {
      router.replace(callbackUrl);
    }
  }, [session, isSessionPending, callbackUrl, router]);

  if (isSessionPending) {
    return (
      <Card className="w-full border-border bg-card shadow-xs p-8 text-center flex flex-col items-center justify-center">
        <Spinner className="size-5 text-primary mb-2.5" />
        <p className="text-xs text-muted-foreground">Checking session...</p>
      </Card>
    );
  }

  return (
    <Card className="w-full border-border bg-card shadow-xs p-6 sm:p-8">
      {/* Centered Brand & Header Section */}
      <div className="flex flex-col items-center text-center">
        {/* DentAssist AI Branding with Dental Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-4 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs"
          aria-label="DentAssist AI Homepage"
        >
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs transition-transform duration-200 group-hover:scale-105">
            <Stethoscope className="size-4.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-base tracking-tight text-foreground">
              DentAssist
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-sm bg-primary/10 text-primary border border-primary/20">
              AI
            </span>
          </div>
        </Link>

        {/* Heading & Short Description */}
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Get started with DentAssist AI.
        </p>
      </div>

      {/* Main Content Area without Divider Lines */}
      <div className="mt-6 space-y-4">
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs leading-relaxed">
              {authError}
            </AlertDescription>
          </Alert>
        )}

        <GoogleButton
          text="Continue with Google"
          callbackURL={callbackUrl}
          errorCallbackURL={
            typeof window !== "undefined"
              ? `${window.location.origin}/signup`
              : "/signup"
          }
          onLoadingChange={setIsButtonLoading}
          onError={setAuthError}
          disabled={isButtonLoading}
        />
      </div>

      {/* Seamless Footer without Divider Line */}
      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link
            href={
              callbackUrl !== "/dashboard"
                ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/login"
            }
            className="font-semibold text-primary hover:underline hover:text-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full border-border bg-card shadow-xs p-8 text-center flex flex-col items-center justify-center">
          <Spinner className="size-5 text-primary mb-2.5" />
          <p className="text-xs text-muted-foreground">Loading...</p>
        </Card>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
