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
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Card className="border-border shadow-xs bg-card">
      <CardHeader className="text-center pb-3 border-b-0 space-y-1.5">
        <div className="mx-auto size-10 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center mb-1">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle className="text-lg font-bold">
          Google Single Sign-On
        </CardTitle>
        <CardDescription>
          Password management is handled directly through Google.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center text-xs text-muted-foreground">
        <p>
          DentAssist AI uses Google OAuth for secure, passwordless practitioner
          sign-in. To update your Google account password or security settings,
          please visit your Google Account management.
        </p>
        <Link href="/login" className="block w-full">
          <Button className="w-full">Sign In with Google</Button>
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
