import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  User,
  Mail,
  Calendar,
  Key,
  Shield,
} from "lucide-react";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!sessionData?.user) {
    redirect("/login");
  }

  const { user, session } = sessionData;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs shadow-primary/20">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <span className="font-bold text-base leading-none text-foreground flex items-center gap-1.5">
                DentAssist{" "}
                <span className="text-primary font-semibold text-xs px-1.5 py-0.5 rounded bg-primary/10">
                  AI
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Receptionist Management Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-foreground">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <LogoutButton variant="outline" />
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Welcome Banner */}
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <Shield className="size-3.5" /> Authentication Phase 1 Complete
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user.name}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Your clinic session is securely authenticated. Ready to connect
              your dental practice workflows and AI receptionist.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user.emailVerified ? (
              <Badge variant="success" className="gap-1 px-3 py-1 text-xs">
                <CheckCircle2 className="size-3.5" /> Email Verified
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 px-3 py-1 text-xs">
                <AlertTriangle className="size-3.5" /> Unverified Email
              </Badge>
            )}
          </div>
        </div>

        {/* User & Session Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Profile Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="size-4 text-primary" /> Authenticated Profile
              </CardTitle>
              <CardDescription>
                Account details retrieved from database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5" /> Full Name
                </span>
                <span className="font-medium text-foreground">{user.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Email Address
                </span>
                <span className="font-medium text-foreground">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Shield className="size-3.5" /> Verification Status
                </span>
                <span>
                  {user.emailVerified ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="size-3.5" /> Pending
                      Verification
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Key className="size-3.5" /> User ID
                </span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                  {user.id}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Active Session Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="size-4 text-primary" /> Session Information
              </CardTitle>
              <CardDescription>
                Cryptographically signed Better Auth session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Session ID</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground max-w-[200px] truncate">
                  {session.id}
                </code>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Expires At</span>
                <span className="font-medium text-foreground text-xs">
                  {new Date(session.expiresAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Session Created</span>
                <span className="font-medium text-foreground text-xs">
                  {new Date(session.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Auth Provider</span>
                <span className="font-medium text-foreground capitalize text-xs">
                  Better Auth Database Session
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
