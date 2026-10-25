"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Copy,
  Check,
  RefreshCw,
  Power,
  Shield,
  Code2,
  AlertCircle,
  Eye,
  Sliders,
  Send,
  Bot,
  Trash2,
  Plus,
} from "lucide-react";
import type { WebsiteWidget } from "@prisma/client";

interface SnippetData {
  publicId: string;
  scriptSrc: string;
  snippetHtml: string;
  appUrl: string;
  isActive: boolean;
  allowedDomains: string[];
}

export function WebsiteWidgetManager() {
  const widgetQuery = trpc.widget.get.useQuery();
  const snippetQuery = trpc.widget.getSnippet.useQuery();

  if (widgetQuery.isLoading) {
    return (
      <div className="rounded-[4px] border border-border bg-card p-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="size-4 animate-spin text-primary" /> Loading
        Website Widget configuration...
      </div>
    );
  }

  if (!widgetQuery.data) {
    return (
      <div className="rounded-[4px] border border-border bg-card p-8 text-center text-xs text-muted-foreground">
        Could not load widget. Please refresh the page.
      </div>
    );
  }

  return (
    <WebsiteWidgetForm
      key={`${widgetQuery.data.id}-${widgetQuery.data.updatedAt.toString()}`}
      initialWidget={widgetQuery.data}
      initialSnippet={snippetQuery.data}
    />
  );
}

interface WebsiteWidgetFormProps {
  initialWidget: WebsiteWidget;
  initialSnippet?: SnippetData;
}

function WebsiteWidgetForm({
  initialWidget,
  initialSnippet,
}: WebsiteWidgetFormProps) {
  const { activeOrganization } = useOrganization();
  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.widget.updateSettings.useMutation({
    onSuccess: () => {
      utils.widget.get.invalidate();
      utils.widget.getSnippet.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    },
    onError: (err) => {
      setErrorMessage(err.message);
    },
  });

  const updateDomainsMutation = trpc.widget.updateAllowedDomains.useMutation({
    onSuccess: () => {
      utils.widget.get.invalidate();
      utils.widget.getSnippet.invalidate();
      setNewDomain("");
      setDomainError(null);
    },
    onError: (err) => {
      setDomainError(err.message);
    },
  });

  const toggleActiveMutation = trpc.widget.toggleActive.useMutation({
    onSuccess: () => {
      utils.widget.get.invalidate();
      utils.widget.getSnippet.invalidate();
    },
  });

  const rotatePublicIdMutation = trpc.widget.rotatePublicId.useMutation({
    onSuccess: () => {
      utils.widget.get.invalidate();
      utils.widget.getSnippet.invalidate();
      setShowRotateConfirm(false);
    },
  });

  // Local Form State initialized directly from props (zero useEffect needed)
  const [name, setName] = useState(initialWidget.name || "");
  const [assistantName, setAssistantName] = useState(
    initialWidget.assistantName || "DentAssist",
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialWidget.welcomeMessage || "Hi! How can I help you today?",
  );
  const [primaryColor, setPrimaryColor] = useState(
    initialWidget.primaryColor || "#1E40AF",
  );
  const [launcherPosition, setLauncherPosition] = useState<
    "bottom-right" | "bottom-left"
  >(
    (initialWidget.launcherPosition as "bottom-right" | "bottom-left") ||
      "bottom-right",
  );
  const [showBranding, setShowBranding] = useState(initialWidget.showBranding);
  const [enableChat, setEnableChat] = useState(initialWidget.enableChat);
  const [enableVoice, setEnableVoice] = useState(initialWidget.enableVoice);

  // Domains State
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);

  // Status & Feedback State
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedPublicId, setCopiedPublicId] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  // Live Preview State
  const [previewChatOpen, setPreviewChatOpen] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<
    Array<{ role: "assistant" | "user"; text: string }>
  >([
    {
      role: "assistant",
      text: initialWidget.welcomeMessage || "Hi! How can I help you today?",
    },
  ]);
  const [previewInput, setPreviewInput] = useState("");

  const handleSaveSettings = () => {
    setErrorMessage(null);
    updateSettingsMutation.mutate({
      name,
      assistantName,
      welcomeMessage,
      primaryColor,
      launcherPosition,
      showBranding,
      enableChat,
      enableVoice,
    });
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    setDomainError(null);
    const existing = initialWidget.allowedDomains || [];
    if (existing.includes(newDomain.trim().toLowerCase())) {
      setDomainError("This domain is already in the allowed list.");
      return;
    }
    updateDomainsMutation.mutate({
      allowedDomains: [...existing, newDomain.trim()],
    });
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    const existing = initialWidget.allowedDomains || [];
    updateDomainsMutation.mutate({
      allowedDomains: existing.filter((d: string) => d !== domainToRemove),
    });
  };

  const handleCopySnippet = () => {
    if (!initialSnippet?.snippetHtml) return;
    navigator.clipboard.writeText(initialSnippet.snippetHtml);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyPublicId = () => {
    if (!initialWidget.publicId) return;
    navigator.clipboard.writeText(initialWidget.publicId);
    setCopiedPublicId(true);
    setTimeout(() => setCopiedPublicId(false), 2000);
  };

  const handlePreviewSend = () => {
    if (!previewInput.trim()) return;
    const userText = previewInput.trim();
    setPreviewInput("");
    setPreviewMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      {
        role: "assistant",
        text: `[Preview Response] This is how ${assistantName || "DentAssist"} will interact with patients on your website according to your clinic knowledge base.`,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="rounded-[4px] border border-border bg-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold tracking-tight">
              <Globe className="size-3.5" /> Embeddable Receptionist Widget
            </span>
            <Badge
              variant={initialWidget.isActive ? "success" : "secondary"}
              className="text-[10px] px-1.5 py-0.2 uppercase font-semibold"
            >
              {initialWidget.isActive
                ? "Active & Serving"
                : "Inactive / Suspended"}
            </Badge>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Website Chatbot & Booking Receptionist
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl leading-normal">
            Install DentAssist on your practice website using a single snippet.
            Patients can check services, ask insurance and policy questions, and
            book appointments directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant={initialWidget.isActive ? "outline" : "default"}
            size="sm"
            onClick={() =>
              toggleActiveMutation.mutate({ isActive: !initialWidget.isActive })
            }
            disabled={toggleActiveMutation.isPending}
            className="text-xs font-semibold gap-1.5"
          >
            <Power className="size-3.5" />
            {initialWidget.isActive ? "Deactivate Widget" : "Activate Widget"}
          </Button>
        </div>
      </div>

      {/* Grid: Settings & Snippet on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Configuration, Domains, Installation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Appearance & Behavior Card */}
          <Card className="rounded-[4px] border-border shadow-none">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sliders className="size-4 text-primary" /> Widget Settings
                    & Appearance
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Customize branding, welcome messaging, colors, and layout.
                  </CardDescription>
                </div>
                {saveSuccess && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="size-3" /> Saved!
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {errorMessage && (
                <div className="rounded-[3px] p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Widget Name (Internal)
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Main Clinic Receptionist"
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Assistant Display Name
                  </label>
                  <Input
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="e.g. DentAssist"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Welcome Greeting Message
                </label>
                <Input
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="e.g. Hi! How can I help you today?"
                  className="text-xs h-8"
                />
                <span className="text-[11px] text-muted-foreground">
                  Shown automatically when a visitor clicks the chat launcher.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Primary Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="size-8 rounded-[3px] border border-border cursor-pointer bg-transparent p-0.5"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1E40AF"
                      className="font-mono text-xs h-8 uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Launcher Position
                  </label>
                  <Select
                    value={launcherPosition}
                    onValueChange={(val) => {
                      if (val) {
                        setLauncherPosition(
                          val as "bottom-right" | "bottom-left",
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs font-medium">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">
                        Bottom Right (Standard)
                      </SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toggles */}
              <div className="border-t border-border pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={enableChat}
                    onChange={(e) => setEnableChat(e.target.checked)}
                    className="rounded-[2px] text-primary focus:ring-0"
                  />
                  <span className="font-medium text-foreground">
                    Enable Chat
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={showBranding}
                    onChange={(e) => setShowBranding(e.target.checked)}
                    className="rounded-[2px] text-primary focus:ring-0"
                  />
                  <span className="font-medium text-foreground">
                    Show Branding
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="text-xs font-semibold"
                >
                  {updateSettingsMutation.isPending
                    ? "Saving..."
                    : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Allowed Domains Card */}
          <Card className="rounded-[4px] border-border shadow-none">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Shield className="size-4 text-primary" /> Allowed Website
                Domains
              </CardTitle>
              <CardDescription className="text-xs">
                Restrict which websites may load this widget. Leave empty to
                allow any domain during development.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="https://brightsmile.com or http://localhost:3000"
                    className="text-xs h-8 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDomain();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddDomain}
                    disabled={
                      updateDomainsMutation.isPending || !newDomain.trim()
                    }
                    className="text-xs gap-1 shrink-0 h-8 font-semibold"
                  >
                    <Plus className="size-3.5" /> Add Origin
                  </Button>
                </div>
                {domainError && (
                  <p className="text-[11px] text-destructive font-medium">
                    {domainError}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Origins must include the scheme (e.g.,{" "}
                  <code className="font-mono">https://myclinic.com</code>).
                  Exact origin matching is enforced. Subdomains must be listed
                  separately.
                </p>
              </div>

              {/* Domain List */}
              <div className="space-y-1.5">
                {(initialWidget.allowedDomains || []).length === 0 ? (
                  <div className="rounded-[3px] border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    No domain restrictions configured. The widget can load on
                    any website.
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-[3px] overflow-hidden bg-background">
                    {initialWidget.allowedDomains.map((domain: string) => (
                      <div
                        key={domain}
                        className="flex items-center justify-between px-3 py-2 text-xs font-mono"
                      >
                        <span className="text-foreground">{domain}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemoveDomain(domain)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Installation Snippet Card */}
          <Card className="rounded-[4px] border-border shadow-none">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Code2 className="size-4 text-primary" /> Installation Code
                    Snippet
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Copy and paste this snippet into your website before the
                    closing <code className="font-mono">&lt;/body&gt;</code>{" "}
                    tag.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopySnippet}
                  className="text-xs gap-1.5 font-semibold h-8"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copy Snippet
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="relative rounded-[3px] bg-slate-950 text-slate-100 p-3 font-mono text-xs overflow-x-auto border border-border">
                <pre>{initialSnippet?.snippetHtml || "Loading snippet..."}</pre>
              </div>

              {/* Public ID Key Info */}
              <div className="flex items-center justify-between p-2.5 rounded-[3px] bg-muted/40 border border-border text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Public Widget Identifier:
                  </span>
                  <div className="font-mono font-bold text-foreground">
                    {initialWidget.publicId}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyPublicId}
                    className="text-xs h-7 gap-1"
                  >
                    {copiedPublicId ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    Copy ID
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRotateConfirm(true)}
                    className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  >
                    Rotate
                  </Button>
                </div>
              </div>

              {showRotateConfirm && (
                <div className="rounded-[3px] p-3 border border-amber-500/30 bg-amber-500/10 text-xs space-y-2">
                  <p className="font-semibold text-foreground">
                    Rotate Public Widget ID?
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Rotating the public ID will immediately invalidate any
                    existing website installations until the snippet is updated
                    on your site.
                  </p>
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRotateConfirm(false)}
                      className="text-xs h-7"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rotatePublicIdMutation.mutate()}
                      disabled={rotatePublicIdMutation.isPending}
                      className="text-xs h-7"
                    >
                      Confirm Rotation
                    </Button>
                  </div>
                </div>
              )}

              {/* Guides Tabs */}
              <Tabs defaultValue="html">
                <TabsList className="w-full justify-start border-b border-border h-8">
                  <TabsTrigger value="html" className="text-xs h-7">
                    Standard HTML
                  </TabsTrigger>
                  <TabsTrigger value="react" className="text-xs h-7">
                    Next.js / React
                  </TabsTrigger>
                  <TabsTrigger value="wordpress" className="text-xs h-7">
                    WordPress / Webflow
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value="html"
                  className="pt-2 text-xs text-muted-foreground space-y-1"
                >
                  <p>
                    1. Open your HTML template file (e.g.{" "}
                    <code className="font-mono">index.html</code>).
                  </p>
                  <p>
                    2. Paste the snippet just before the closing{" "}
                    <code className="font-mono">&lt;/body&gt;</code> tag.
                  </p>
                  <p>
                    3. Save and publish your website. The widget launcher will
                    automatically appear.
                  </p>
                </TabsContent>
                <TabsContent
                  value="react"
                  className="pt-2 text-xs text-muted-foreground space-y-1"
                >
                  <p>
                    In Next.js App Router, add Next Script to your root layout:
                  </p>
                  <div className="bg-muted p-2 rounded-[3px] font-mono text-[11px] text-foreground border border-border mt-1">
                    {`import Script from "next/script";\n\n<Script\n  src="${initialSnippet?.scriptSrc}"\n  data-widget-id="${initialWidget.publicId}"\n  strategy="lazyOnload"\n/>`}
                  </div>
                </TabsContent>
                <TabsContent
                  value="wordpress"
                  className="pt-2 text-xs text-muted-foreground space-y-1"
                >
                  <p>
                    1. In WordPress, navigate to{" "}
                    <strong>Appearance → Theme File Editor</strong> or use a
                    plugin like <strong>WPCode</strong>.
                  </p>
                  <p>
                    2. In Webflow, navigate to{" "}
                    <strong>
                      Project Settings → Custom Code → Footer Code
                    </strong>
                    .
                  </p>
                  <p>
                    3. Paste the snippet into the footer and publish changes.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Interactive Live Preview */}
        <div className="lg:col-span-5 sticky top-20">
          <Card className="rounded-[4px] border-border shadow-none overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Eye className="size-4 text-primary" /> Live Widget Preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Interactive simulation of your live website appearance.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono"
                >
                  {launcherPosition}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mock Host Website Window */}
              <div className="h-[520px] bg-slate-100 dark:bg-slate-900 relative flex flex-col justify-between p-4 overflow-hidden select-none border-b border-border">
                {/* Mock Browser Header Bar */}
                <div className="rounded-[3px] bg-white dark:bg-slate-800 border border-border p-2.5 shadow-sm space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-red-400" />
                    <div className="size-2 rounded-full bg-amber-400" />
                    <div className="size-2 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                      https://{activeOrganization?.slug || "clinic"}.example.com
                    </span>
                  </div>
                  <div className="h-3 w-1/3 bg-muted rounded-[2px]" />
                  <div className="h-2 w-2/3 bg-muted/60 rounded-[2px]" />
                </div>

                {/* Simulated Chat Panel (Expanded State) */}
                {previewChatOpen && (
                  <div
                    className={`absolute bottom-16 ${
                      launcherPosition === "bottom-left" ? "left-4" : "right-4"
                    } w-[320px] h-[400px] bg-white dark:bg-slate-950 rounded-[8px] shadow-xl border border-border flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150`}
                  >
                    {/* Widget Header */}
                    <div
                      className="p-3 text-white flex items-center justify-between"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <div>
                        <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-400 inline-block" />
                          {activeOrganization?.name || "Clinic Reception"}
                        </div>
                        <div className="text-[10px] opacity-80">
                          {assistantName || "DentAssist"} • Online
                        </div>
                      </div>
                      <button
                        onClick={() => setPreviewChatOpen(false)}
                        className="text-white hover:opacity-80 text-xs px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-900/40 text-xs">
                      {previewMessages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`max-w-[85%] p-2 rounded-[6px] text-xs leading-normal ${
                            m.role === "user"
                              ? "ml-auto text-white"
                              : "bg-white dark:bg-slate-800 text-foreground border border-border"
                          }`}
                          style={
                            m.role === "user"
                              ? { backgroundColor: primaryColor }
                              : {}
                          }
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>

                    {/* Input Footer */}
                    <div className="p-2 border-t border-border bg-white dark:bg-slate-950 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={previewInput}
                          onChange={(e) => setPreviewInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handlePreviewSend();
                            }
                          }}
                          placeholder="Type a test message..."
                          className="flex-1 h-7 px-2 text-xs border border-border rounded-[3px] bg-background focus:outline-none"
                        />
                        <button
                          onClick={handlePreviewSend}
                          className="size-7 rounded-[3px] text-white flex items-center justify-center shrink-0 cursor-pointer"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Send className="size-3" />
                        </button>
                      </div>
                      {showBranding && (
                        <div className="text-[9px] text-center text-muted-foreground">
                          Powered by DentAssist AI
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Launcher Button */}
                <div
                  className={`flex ${
                    launcherPosition === "bottom-left"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <button
                    onClick={() => setPreviewChatOpen(!previewChatOpen)}
                    style={{ backgroundColor: primaryColor }}
                    className="flex items-center gap-2 px-3.5 py-2 text-white font-bold text-xs rounded-full shadow-lg hover:opacity-95 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Bot className="size-4" />
                    <span>Chat with {assistantName || "DentAssist"}</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
