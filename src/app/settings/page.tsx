"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Nav } from "@/components/Nav";
import { useToast } from "@/components/ToastContext";
import { BALANCE_ROLES } from "@/lib/constants";

type Account = { id: string; name: string; mappedBalanceRole: string | null };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [sheet, setSheet] = useState<Record<string, unknown> | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [googleUrl, setGoogleUrl] = useState("");
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const { success, error } = useToast();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="bg-white border rounded p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">LLM</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(settings?.llmEnabled as boolean) || false}
              onChange={(e) => setSettings({ ...settings, llmEnabled: e.target.checked })}
            />
            Enable LLM
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              value={(settings?.llmProvider as string) || ""}
              onChange={(e) => setSettings({ ...settings, llmProvider: e.target.value })}
              className="border rounded px-2 py-1"
            >
              <option value="">Select provider</option>
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Gemini</option>
            </select>
            <input
              value={(settings?.llmModel as string) || ""}
              onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
              placeholder="Model"
              className="border rounded px-2 py-1"
            />
            <input
              type="number"
              step="0.01"
              value={(settings?.confidenceThreshold as number) || 0.8}
              onChange={(e) =>
                setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })
              }
              placeholder="Confidence threshold"
              className="border rounded px-2 py-1"
            />
          </div>
        </div>

        <div className="bg-white border rounded p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Export Destination</h2>
          <p className="text-sm text-gray-600">Choose where to view your budget data</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exportDestination"
                value="native"
                checked={settings?.exportDestination === "native" || !settings?.exportDestination}
                onChange={(e) => setSettings({ ...settings, exportDestination: e.target.value })}
              />
              <span className="text-sm">Native UI (Built-in Budget page)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exportDestination"
                value="google_sheets"
                checked={settings?.exportDestination === "google_sheets"}
                onChange={(e) => setSettings({ ...settings, exportDestination: e.target.value })}
              />
              <span className="text-sm">Google Sheets (External spreadsheet)</span>
            </label>
          </div>
          {settings?.exportDestination === "google_sheets" && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Google Sheets Configuration</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${isGoogleConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {isGoogleConnected ? "Connected" : "Not Connected"}
                </span>
              </div>
              <input
                value={(sheet?.spreadsheetId as string) || ""}
                onChange={(e) => setSheet({ ...sheet, spreadsheetId: e.target.value })}
                placeholder="Spreadsheet ID"
                className="border rounded px-2 py-1 w-full"
              />
              {googleUrl && (
                <a href={googleUrl} className="text-blue-600 text-sm underline">
                  {isGoogleConnected ? "Reconnect Google" : "Connect Google"}
                </a>
              )}
            </div>
          )}
          {settings?.exportDestination === "native" && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                View your budget on the{" "}
                <a href="/budget" className="text-blue-600 underline">
                  Budget page
                </a>
                . All data is automatically displayed there.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border rounded p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Plaid</h2>
            <span className={`text-xs px-2 py-0.5 rounded ${isPlaidConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {isPlaidConnected ? "Connected" : "Not Connected"}
            </span>
          </div>
          <p className="text-sm text-gray-600">Connect your bank accounts via Plaid Link</p>
          {linkToken ? (
            <button
              onClick={() => open()}
              disabled={!ready}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ready ? "Connect Bank Account" : "Loading..."}
            </button>
          ) : (
            <p className="text-sm text-gray-500">Loading Plaid Link...</p>
          )}
        </div>

        <div className="bg-white border rounded p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Account role mapping</h2>
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="w-48">{a.name}</span>
                <select
                  value={a.mappedBalanceRole || ""}
                  onChange={(e) =>
                    setAccounts((prev) =>
                      prev.map((acc) =>
                        acc.id === a.id ? { ...acc, mappedBalanceRole: e.target.value } : acc,
                      ),
                    )
                  }
                  className="border rounded px-2 py-1"
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
            {accounts.length === 0 && <p className="text-sm text-gray-600">No accounts yet.</p>}
          </div>
        </div>

        <div className="bg-white border rounded p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Automation</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(settings?.autoSyncEnabled as boolean) || false}
              onChange={(e) => setSettings({ ...settings, autoSyncEnabled: e.target.checked })}
            />
            Auto-sync daily
          </label>
          <input
            value={(settings?.autoSyncCron as string) || "0 9 * * *"}
            onChange={(e) => setSettings({ ...settings, autoSyncCron: e.target.value })}
            className="border rounded px-2 py-1"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(settings?.autoPushToSheets as boolean) || false}
              onChange={(e) => setSettings({ ...settings, autoPushToSheets: e.target.checked })}
            />
            Auto-push to Sheets after sync
          </label>
        </div>

        <button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded">
          Save all
        </button>
      </div>
    </div>
  );
}
