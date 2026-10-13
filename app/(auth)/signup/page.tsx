"use client";

import { useState, ChangeEvent, SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth/auth-client";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordStrength } from "@/components/auth/password-strength";
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignupInput>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    // Client-side Zod validation
    const validation = signupSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as string;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsLoading(true);
      const res = await signUp.email({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
      });

      if (res.error) {
        if (res.error.message?.toLowerCase().includes("exists")) {
          setServerError(
            "An account with this email already exists. Please log in instead.",
          );
        } else {
          setServerError(
            res.error.message || "Failed to create account. Please try again.",
          );
        }
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      // Wait a moment then redirect to email verification page with email parameter
      setTimeout(() => {
        router.push(
          `/verify-email?email=${encodeURIComponent(formData.email)}`,
        );
      }, 1200);
    } catch (err: unknown) {
      console.error("Signup error:", err);
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-border shadow-none">
        <CardHeader className="text-center pb-4 border-b-0">
          <div className="mx-auto size-10 rounded-[3px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-2">
            <CheckCircle2 className="size-5" />
          </div>
          <CardTitle className="text-lg font-bold text-foreground">
            Practice Account Created
          </CardTitle>
          <CardDescription>
            We’ve sent a verification link to{" "}
            <strong className="text-foreground">{formData.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-xs text-muted-foreground pb-6">
          Redirecting to clinic verification...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-bold tracking-tight text-foreground">
          Create Practice Account
        </CardTitle>
        <CardDescription>
          Establish your dental clinic operating workspace
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <GoogleButton disabled={isLoading} />

        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative bg-card px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Or continue with email
          </span>
        </div>

        <form
          action="#"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Dr. Emily Vance"
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-0.5">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Work Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="doctor@clinic.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-0.5">{errors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                aria-invalid={!!errors.password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive mt-0.5">
                {errors.password}
              </p>
            )}
            <PasswordStrength password={formData.password} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                aria-invalid={!!errors.confirmPassword}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                tabIndex={-1}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-0.5">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-10 mt-2 font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 text-center text-xs text-muted-foreground border-t border-border/50 pt-4">
        <div>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </div>
        <p className="text-[11px] leading-normal text-muted-foreground/80">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardFooter>
    </Card>
  );
}
