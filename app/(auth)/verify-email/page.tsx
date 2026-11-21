import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Card className="border-border shadow-xs bg-card text-center">
      <CardHeader className="pb-3 border-b-0 space-y-1.5">
        <div className="mx-auto size-10 rounded-[6px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-1">
          <CheckCircle2 className="size-5" />
        </div>
        <CardTitle className="text-lg font-bold">
          Verified with Google
        </CardTitle>
        <CardDescription>
          Email verification is handled automatically via Google OAuth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-muted-foreground">
        <p>
          Your Google account identity is pre-verified. No manual email token or
          confirmation link is required to access your practice workspace.
        </p>
        <Link href="/login" className="block w-full">
          <Button className="w-full">Continue to Sign In</Button>
        </Link>
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
