"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Nav } from "@/components/Nav";
import { useToast } from "@/components/ToastContext";
import { BALANCE_ROLES } from "@/lib/constants";

type Account = { id: string; name: string; mappedBalanceRole: string | null };

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "accounts" | "integrations">("general");
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [sheet, setSheet] = useState<Record<string, unknown> | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [googleUrl, setGoogleUrl] = useState("");
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isTestingLLM, setIsTestingLLM] = useState(false);
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [isTestingPlaid, setIsTestingPlaid] = useState(false);
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Nav />
      <div className="max-w-4xl mx-auto p-6 space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <button
            onClick={save}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-sm transition-all active:scale-95"
          >
            Save all changes
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {(["general", "accounts", "integrations"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold">Export Destination</h2>
                <p className="text-sm text-gray-500">Choose where you want your budget data to be primarily stored and viewed.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${
                      settings?.exportDestination === "native" || !settings?.exportDestination
                        ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="exportDestination"
                        value="native"
                        checked={settings?.exportDestination === "native" || !settings?.exportDestination}
                        onChange={(e) => setSettings({ ...settings, exportDestination: e.target.value })}
                        className="text-green-600 focus:ring-green-600"
                      />
                      <span className="font-medium">Native UI</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Built-in budget tracking with charts and tables.</p>
                  </label>
                  <label
                    className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${
                      settings?.exportDestination === "google_sheets"
                        ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="exportDestination"
                        value="google_sheets"
                        checked={settings?.exportDestination === "google_sheets"}
                        onChange={(e) => setSettings({ ...settings, exportDestination: e.target.value })}
                        className="text-green-600 focus:ring-green-600"
                      />
                      <span className="font-medium">Google Sheets</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Sync data to your own customizable spreadsheet.</p>
                  </label>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold">Automation</h2>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 group cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings?.autoSyncEnabled as boolean) || false}
                      onChange={(e) => setSettings({ ...settings, autoSyncEnabled: e.target.checked })}
                      className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-600"
                    />
                    <div>
                      <span className="text-sm font-medium group-hover:text-gray-700 transition-colors">Auto-sync daily</span>
                      <p className="text-xs text-gray-500">Automatically pull latest transactions from your bank.</p>
                    </div>
                  </label>
                  {settings?.autoSyncEnabled as boolean && (
                    <div className="ml-7 space-y-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cron Schedule</label>
                      <input
                        value={(settings?.autoSyncCron as string) || "0 9 * * *"}
                        onChange={(e) => setSettings({ ...settings, autoSyncCron: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                        placeholder="0 9 * * *"
                      />
                      <p className="text-[10px] text-gray-400">Default: Every day at 9:00 AM (UTC)</p>
                    </div>
                  )}
                  <label className="flex items-start gap-3 group cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings?.autoPushToSheets as boolean) || false}
                      onChange={(e) => setSettings({ ...settings, autoPushToSheets: e.target.checked })}
                      className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-600"
                    />
                    <div>
                      <span className="text-sm font-medium group-hover:text-gray-700 transition-colors">Auto-push to Sheets</span>
                      <p className="text-xs text-gray-500">Push categorized data to Google Sheets immediately after sync.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Plaid Connection</h2>
                  <div className="flex items-center gap-3">
                    {isPlaidConnected && (
                      <button
                        onClick={testPlaid}
                        disabled={isTestingPlaid}
                        className="text-xs px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full border border-gray-200 transition-all disabled:opacity-50"
                      >
                        {isTestingPlaid ? "Testing..." : "Test Connection"}
                      </button>
                    )}
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        isPlaidConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isPlaidConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">Connect and manage your bank accounts securely through Plaid.</p>
                {linkToken ? (
                  <button
                    onClick={() => open()}
                    disabled={!ready}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {ready ? "Connect New Institution" : "Loading Plaid..."}
                  </button>
                ) : (
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                )}
              </div>

              <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold">Account Mapping</h2>
                <p className="text-sm text-gray-500">Map your bank accounts to specific roles to ensure balances are tracked correctly.</p>
                <div className="space-y-3">
                  {accounts.map((a) => (
                    <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3">
                      <div>
                        <span className="text-sm font-medium">{a.name}</span>
                        <p className="text-[10px] text-gray-400 font-mono">{a.id}</p>
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
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      >
                        <option value="">Unmapped</option>
                        {BALANCE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {accounts.length === 0 && (
                    <div className="text-center py-6 border border-dashed rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-500">No accounts connected yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">AI Categorization (LLM)</h2>
                  {settings?.llmEnabled as boolean && (
                    <button
                      onClick={testLLM}
                      disabled={isTestingLLM}
                      className="text-xs px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full border border-gray-200 transition-all disabled:opacity-50"
                    >
                      {isTestingLLM ? "Testing..." : "Test Connection"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings?.llmEnabled as boolean) || false}
                      onChange={(e) => setSettings({ ...settings, llmEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">Enable Smart Categorization</span>
                  </label>
                </div>

                {settings?.llmEnabled as boolean && (
                  <div className="grid sm:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase">Provider</label>
                      <select
                        value={(settings?.llmProvider as string) || ""}
                        onChange={(e) => setSettings({ ...settings, llmProvider: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      >
                        <option value="">Select provider</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="gemini">Gemini</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase">Model</label>
                      <input
                        value={(settings?.llmModel as string) || ""}
                        onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                        placeholder="e.g. gpt-4o, gemini-pro"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Confidence Threshold ({(settings?.confidenceThreshold as number) || 0.8})</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={(settings?.confidenceThreshold as number) || 0.8}
                        onChange={(e) =>
                          setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Lax (0.0)</span>
                        <span>Strict (1.0)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Google Sheets</h2>
                  <div className="flex items-center gap-3">
                    {isGoogleConnected && (
                      <button
                        onClick={testSheets}
                        disabled={isTestingSheets}
                        className="text-xs px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full border border-gray-200 transition-all disabled:opacity-50"
                      >
                        {isTestingSheets ? "Testing..." : "Test Connection"}
                      </button>
                    )}
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        isGoogleConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isGoogleConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Spreadsheet ID</label>
                    <input
                      value={(sheet?.spreadsheetId as string) || ""}
                      onChange={(e) => setSheet({ ...sheet, spreadsheetId: e.target.value })}
                      placeholder="Enter spreadsheet ID from URL"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-gray-400">Found in the URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit</p>
                  </div>

                  <div className="pt-2">
                    {googleUrl && (
                      <a
                        href={googleUrl}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        {isGoogleConnected ? "Reconnect Google Account" : "Connect Google Account"}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
