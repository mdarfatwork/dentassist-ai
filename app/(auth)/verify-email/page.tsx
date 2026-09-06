"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { sendVerificationEmail } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MailCheck,
  RotateCw,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const errorParam = searchParams.get("error");

  let initialStatus: "idle" | "verifying" | "success" | "error" = "idle";
  if (errorParam) {
    initialStatus = "error";
  } else if (token) {
    initialStatus = "verifying";
  }

  let initialErrorMessage: string | null = null;
  if (errorParam === "expired") {
    initialErrorMessage =
      "Verification link has expired. Please request a new one.";
  } else if (errorParam) {
    initialErrorMessage =
      "Invalid verification link. Please check your email or request a new one.";
  }

  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage,
  );
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendCountdown, setResendCountdown] = useState(0);

  // If a token is in the URL, verify it asynchronously
  useEffect(() => {
    if (!token || errorParam) return;

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => {
            router.push("/dashboard");
          }, 2500);
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus("error");
          setErrorMessage(
            data.message || "Verification token is invalid or has expired.",
          );
        }
      })
      .catch((err) => {
        console.error("Verification error:", err);
        setStatus("error");
        setErrorMessage("Failed to verify email. Please try again.");
      });
  }, [token, errorParam, router]);

  // Handle Resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleResend = async () => {
    if (!email || resendCountdown > 0) return;
    try {
      setResendStatus("sending");
      await sendVerificationEmail({
        email: email.trim(),
        callbackURL: `${window.location.origin}/dashboard`,
      });
      setResendStatus("sent");
      setResendCountdown(60);
    } catch (err: unknown) {
      console.error("Resend verification error:", err);
      setResendStatus("error");
    }
  };

  // State 1: Verifying token
  if (status === "verifying") {
    return (
      <Card className="border-border shadow-sm text-center p-8">
        <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Spinner className="size-6" />
        </div>
        <CardTitle className="text-xl font-bold">
          Verifying your email...
        </CardTitle>
        <CardDescription className="mt-2">
          Please wait while we confirm your email address.
        </CardDescription>
      </Card>
    );
  }

  // State 2: Verification Success
  if (status === "success") {
    return (
      <Card className="border-border shadow-sm text-center">
        <CardHeader className="pb-3">
          <div className="mx-auto size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
          <CardDescription>
            Your email has been successfully verified. Welcome to DentAssist AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Redirecting you to your dashboard in a few seconds...
          </p>
          <Link href="/dashboard">
            <Button className="w-full">Continue to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // State 3: Verification Error
  if (status === "error") {
    return (
      <Card className="border-border shadow-sm text-center">
        <CardHeader className="pb-3">
          <div className="mx-auto size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
            <AlertCircle className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Verification Failed
          </CardTitle>
          <CardDescription>
            {errorMessage || "The verification link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email && (
            <Button
              onClick={handleResend}
              disabled={resendStatus === "sending" || resendCountdown > 0}
              className="w-full"
            >
              {resendStatus === "sending" ? (
                <Spinner className="mr-2" />
              ) : (
                <RotateCw className="size-4 mr-2" />
              )}
              {resendCountdown > 0
                ? `Resend available in ${resendCountdown}s`
                : "Resend Verification Email"}
            </Button>
          )}
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // State 4: Default Idle state (after signup, awaiting click)
  return (
    <Card className="border-border shadow-sm text-center">
      <CardHeader className="pb-3">
        <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
          <MailCheck className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
        <CardDescription>
          {email ? (
            <>
              We&apos;ve sent a verification link to{" "}
              <strong className="text-foreground">{email}</strong>.
            </>
          ) : (
            "Please check your email for the verification link to activate your account."
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-xs text-muted-foreground">
        <p>
          Click the link in the email to confirm your address and access your
          DentAssist AI portal.
        </p>

        {resendStatus === "sent" && (
          <Alert variant="success" className="text-left">
            <CheckCircle2 className="size-4" />
            <AlertDescription>
              A new verification link has been sent to your email!
            </AlertDescription>
          </Alert>
        )}

        {resendStatus === "error" && (
          <Alert variant="destructive" className="text-left">
            <AlertCircle className="size-4" />
            <AlertDescription>
              Failed to resend verification email. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {email && (
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resendStatus === "sending" || resendCountdown > 0}
              className="w-full text-xs"
            >
              {resendStatus === "sending" ? (
                <Spinner className="mr-2" />
              ) : (
                <RotateCw className="size-3.5 mr-2" />
              )}
              {resendCountdown > 0
                ? `Resend link in ${resendCountdown}s`
                : "Didn't receive email? Resend"}
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/50 pt-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-border shadow-sm p-8 text-center">
          <Spinner className="mx-auto size-6" />
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
