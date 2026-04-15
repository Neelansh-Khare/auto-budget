"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Nav } from "@/components/Nav";
import { useToast } from "@/components/ToastContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Badge } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import { BALANCE_ROLES } from "@/lib/constants";
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  Share2, 
  Bot, 
  FileSpreadsheet, 
  Save, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";

type Account = { id: string; name: string; mappedBalanceRole: string | null };

interface Settings {
  exportDestination?: string;
  autoSyncEnabled?: boolean;
  autoSyncCron?: string;
  autoPushToSheets?: boolean;
  llmEnabled?: boolean;
  llmProvider?: string;
  llmModel?: string;
  confidenceThreshold?: number;
}

interface SheetSettings {
  spreadsheetId?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "accounts" | "integrations">("general");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sheet, setSheet] = useState<SheetSettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [googleUrl, setGoogleUrl] = useState("");
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isTestingLLM, setIsTestingLLM] = useState(false);
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [isTestingPlaid, setIsTestingPlaid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error, info } = useToast();

  const load = useCallback(async () => {
    const data = await fetch("/api/settings").then((r) => r.json());
    setSettings(data.settings || {});
    setSheet(data.sheet || {});
    setAccounts(data.accounts || []);
    setIsPlaidConnected(data.isPlaidConnected);
    setIsGoogleConnected(data.isGoogleConnected);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/google/auth-url")
      .then((r) => r.json())
      .then((d) => setGoogleUrl(d.url));
    // Get Plaid link token
    fetch("/api/plaid/link-token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setLinkToken(d.link_token))
      .catch((err) => console.error("Failed to get link token:", err));
  }, [load]);

  async function save() {
    setIsSaving(true);
    try {
      const resp = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          sheet,
          accountRoles: accounts.map((a) => ({ id: a.id, role: a.mappedBalanceRole })),
        }),
      });
      if (resp.ok) {
        success("Settings saved successfully");
      } else {
        error("Failed to save settings");
      }
    } catch {
      error("An error occurred while saving settings");
    } finally {
      setIsSaving(false);
    }
  }

  const onSuccess = useCallback(
    async (publicToken: string, metadata: unknown) => {
      try {
        const meta = metadata as { institution?: { name?: string } };
        const resp = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution: meta.institution?.name || "Unknown",
          }),
        });
        if (resp.ok) {
          success("Plaid connected successfully");
          await load(); // Reload to show new accounts
        } else {
          error("Plaid connection failed");
        }
      } catch {
        error("An error occurred during Plaid exchange");
      }
    },
    [success, error, load],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  async function testLLM() {
    setIsTestingLLM(true);
    info("Testing LLM connection...");
    try {
      const resp = await fetch("/api/llm/test", { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        success(`LLM test successful! Categorized as: ${data.result.category}`);
      } else {
        error(data.error || "LLM test failed");
      }
    } catch {
      error("An error occurred during LLM test");
    } finally {
      setIsTestingLLM(false);
    }
  }

  async function testSheets() {
    setIsTestingSheets(true);
    info("Testing Google Sheets connection...");
    try {
      const resp = await fetch("/api/sheets/test", { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        success(`Google Sheets test successful! Connected to "${data.title}"`);
      } else {
        error(data.error || "Google Sheets test failed");
      }
    } catch {
      error("An error occurred during Google Sheets test");
    } finally {
      setIsTestingSheets(false);
    }
  }

  async function testPlaid() {
    setIsTestingPlaid(true);
    info("Testing Plaid connection...");
    try {
      const resp = await fetch("/api/plaid/test", { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        success(`Plaid test successful! Found ${data.accounts.length} accounts.`);
      } else {
        error(data.error || "Plaid test failed");
      }
    } catch {
      error("An error occurred during Plaid test");
    } finally {
      setIsTestingPlaid(false);
    }
  }

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "accounts", label: "Accounts", icon: CreditCard },
    { id: "integrations", label: "Integrations", icon: Share2 },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your sync preferences and account mappings.</p>
          </div>
          <Button variant="primary" onClick={save} isLoading={isSaving} leftIcon={Save}>
            Save Changes
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Export Destination</CardTitle>
                <CardDescription>Where your budget data should be primarily stored.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    settings?.exportDestination === "native" || !settings?.exportDestination
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setSettings({ ...settings, exportDestination: "native" })}
                >
                   <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="exportDestination"
                      value="native"
                      checked={settings?.exportDestination === "native" || !settings?.exportDestination}
                      onChange={(e) => setSettings({ ...settings, exportDestination: e.target.value })}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold">Native UI</span>
                      <span className="text-xs text-muted-foreground">Built-in tracking with charts.</span>
                    </div>
                  </div>
                </div>
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    settings?.exportDestination === "google_sheets"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setSettings({ ...settings, exportDestination: "google_sheets" })}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="exportDestination"
                      value="google_sheets"
                      checked={settings?.exportDestination === "google_sheets"}
                      onChange={(e) => setSettings({ ...settings, exportDestination: e.target.value })}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold">Google Sheets</span>
                      <span className="text-xs text-muted-foreground">Sync to your own spreadsheet.</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Automation</CardTitle>
                </div>
                <CardDescription>Keep your data fresh with automatic updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                  <input
                    type="checkbox"
                    id="autoSync"
                    checked={(settings?.autoSyncEnabled as boolean) || false}
                    onChange={(e) => setSettings({ ...settings, autoSyncEnabled: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <div className="flex-1 space-y-3">
                    <label htmlFor="autoSync" className="text-sm font-bold leading-none cursor-pointer">Daily Bank Sync</label>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Automatically pull latest transactions from your bank every day.
                    </p>
                    {settings?.autoSyncEnabled && (
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Cron Schedule</label>
                        <Input 
                          value={(settings?.autoSyncCron as string) || "0 9 * * *"}
                          onChange={(e) => setSettings({ ...settings, autoSyncCron: e.target.value })}
                          placeholder="0 9 * * *"
                          className="h-8 max-w-[200px]"
                        />
                        <p className="text-[10px] text-muted-foreground italic">Default: Every day at 9:00 AM (UTC)</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                  <input
                    type="checkbox"
                    id="autoPush"
                    checked={(settings?.autoPushToSheets as boolean) || false}
                    onChange={(e) => setSettings({ ...settings, autoPushToSheets: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <div className="flex-1 space-y-1.5">
                    <label htmlFor="autoPush" className="text-sm font-bold leading-none cursor-pointer">Auto-push to Sheets</label>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Push categorized data to Google Sheets immediately after sync.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === "accounts" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Plaid Connection</CardTitle>
                  </div>
                  <CardDescription>Manage your secure bank link.</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                   {isPlaidConnected ? (
                    <Badge variant="success" className="flex gap-1 items-center">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex gap-1 items-center">
                      <AlertCircle className="h-3 w-3" /> Disconnected
                    </Badge>
                  )}
                  {isPlaidConnected && (
                    <Button variant="ghost" size="sm" onClick={testPlaid} isLoading={isTestingPlaid} className="h-6 text-[10px] uppercase font-bold tracking-wider">
                      Test Link
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Securely link your bank accounts. Your credentials are never stored by AutoBudgeter.
                </p>
                {linkToken ? (
                  <Button 
                    variant="primary" 
                    onClick={() => open()} 
                    disabled={!ready}
                    leftIcon={RefreshCcw}
                  >
                    {isPlaidConnected ? "Connect Another Institution" : "Connect with Plaid"}
                  </Button>
                ) : (
                  <Skeleton className="h-10 w-48" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Account Mapping</CardTitle>
                <CardDescription>Assign roles to your bank accounts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accounts.length > 0 ? (
                  accounts.map((a) => (
                    <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 bg-muted/20">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm">{a.name}</span>
                        <p className="text-[10px] text-muted-foreground font-mono">{a.id}</p>
                      </div>
                      <select
                        value={a.mappedBalanceRole || ""}
                        onChange={(e) =>
                          setAccounts((prev) =>
                            prev.map((acc) =>
                              acc.id === a.id ? { ...acc, mappedBalanceRole: e.target.value } : acc,
                            ),
                          )
                        }
                        className="flex h-9 w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Unmapped</option>
                        {BALANCE_ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-lg">
                    <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">No accounts connected.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* LLM Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">AI Categorization</CardTitle>
                  </div>
                  <CardDescription>Automate categorization using Large Language Models.</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    id="llm-toggle"
                    checked={(settings?.llmEnabled as boolean) || false}
                    onChange={(e) => setSettings({ ...settings, llmEnabled: e.target.checked })}
                  />
                  <label htmlFor="llm-toggle" className="relative inline-flex items-center cursor-pointer">
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                  {settings?.llmEnabled && (
                    <Button variant="ghost" size="sm" onClick={testLLM} isLoading={isTestingLLM} className="h-6 text-[10px] uppercase font-bold tracking-wider">
                      Test AI
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {settings?.llmEnabled ? (
                  <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/20 border">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Provider</label>
                      <select
                        value={(settings?.llmProvider as string) || ""}
                        onChange={(e) => setSettings({ ...settings, llmProvider: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select provider</option>
                        <option value="openrouter">OpenRouter (Multiple models)</option>
                        <option value="gemini">Google Gemini</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Model Identifier</label>
                      <Input 
                        value={(settings?.llmModel as string) || ""}
                        onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                        placeholder="e.g. gpt-4o-mini"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Confidence Threshold</label>
                        <span className="text-xs font-black">{(settings?.confidenceThreshold as number || 0.8).toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={(settings?.confidenceThreshold as number) || 0.8}
                        onChange={(e) =>
                          setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })
                        }
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Experimental (0.0)</span>
                        <span>Conservative (1.0)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Enable smart categorization to automatically organize your spending.</p>
                )}
              </CardContent>
            </Card>

            {/* Google Sheets Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Google Sheets</CardTitle>
                  </div>
                  <CardDescription>Export your financial data to a cloud spreadsheet.</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                   {isGoogleConnected ? (
                    <Badge variant="success" className="flex gap-1 items-center">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex gap-1 items-center">
                      <AlertCircle className="h-3 w-3" /> Disconnected
                    </Badge>
                  )}
                  {isGoogleConnected && (
                    <Button variant="ghost" size="sm" onClick={testSheets} isLoading={isTestingSheets} className="h-6 text-[10px] uppercase font-bold tracking-wider">
                      Test Push
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Spreadsheet ID</label>
                  <Input 
                    value={(sheet?.spreadsheetId as string) || ""}
                    onChange={(e) => setSheet({ ...sheet, spreadsheetId: e.target.value })}
                    placeholder="Enter spreadsheet ID from URL"
                  />
                  <p className="text-[10px] text-muted-foreground">Found in the URL: .../spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit</p>
                </div>

                <div className="pt-2 border-t flex flex-col sm:flex-row gap-3">
                  {googleUrl && (
                    <a
                      href={googleUrl}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted transition-colors text-sm font-medium"
                    >
                      <Globe className="h-4 w-4" />
                      {isGoogleConnected ? "Change Google Account" : "Link Google Account"}
                    </a>
                  )}
                  {isGoogleConnected && (
                    <Button variant="outline" size="md" className="gap-2">
                      <ExternalLink className="h-4 w-4" /> Open Spreadsheet
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
