"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Nav } from "@/components/Nav";
import { BALANCE_ROLES } from "@/lib/constants";

type Account = { id: string; name: string; mappedBalanceRole: string | null };

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [sheet, setSheet] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [googleUrl, setGoogleUrl] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const data = await fetch("/api/settings").then((r) => r.json());
    setSettings(data.settings || {});
    setSheet(data.sheet || {});
    setAccounts(data.accounts || []);
  }

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
  }, []);

  async function save() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        sheet,
        accountRoles: accounts.map((a) => ({ id: a.id, role: a.mappedBalanceRole })),
      }),
    });
    setMessage("Saved settings");
  }

  const onSuccess = useCallback(async (publicToken: string, metadata: any) => {
    const resp = await fetch("/api/plaid/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        public_token: publicToken,
        institution: metadata.institution?.name || "Unknown"
      }),
    });
    if (resp.ok) {
      setMessage("Plaid connected successfully");
      await load(); // Reload to show new accounts
    } else {
      setMessage("Plaid connection failed");
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {message && <p className="text-sm text-green-700">{message}</p>}
        <div className="bg-white border rounded p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">LLM</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings?.llmEnabled || false}
              onChange={(e) => setSettings({ ...settings, llmEnabled: e.target.checked })}
            />
            Enable LLM
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              value={settings?.llmProvider || ""}
              onChange={(e) => setSettings({ ...settings, llmProvider: e.target.value })}
              className="border rounded px-2 py-1"
            >
              <option value="">Select provider</option>
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Gemini</option>
            </select>
            <input
              value={settings?.llmModel || ""}
              onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
              placeholder="Model"
              className="border rounded px-2 py-1"
            />
            <input
              type="number"
              step="0.01"
              value={settings?.confidenceThreshold || 0.8}
              onChange={(e) => setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })}
              placeholder="Confidence threshold"
              className="border rounded px-2 py-1"
            />
          </div>
        </div>

        <div className="bg-white border rounded p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Google Sheets</h2>
          <p className="text-sm text-gray-600">Connect and set Spreadsheet ID</p>
          <input
            value={sheet?.spreadsheetId || ""}
            onChange={(e) => setSheet({ ...sheet, spreadsheetId: e.target.value })}
            placeholder="Spreadsheet ID"
            className="border rounded px-2 py-1 w-full"
          />
          {googleUrl && (
            <a href={googleUrl} className="text-blue-600 text-sm underline">
              Connect Google
            </a>
          )}
        </div>

        <div className="bg-white border rounded p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Plaid</h2>
          <p className="text-sm text-gray-600">
            Connect your bank accounts via Plaid Link
          </p>
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
              checked={settings?.autoSyncEnabled || false}
              onChange={(e) => setSettings({ ...settings, autoSyncEnabled: e.target.checked })}
            />
            Auto-sync daily
          </label>
          <input
            value={settings?.autoSyncCron || "0 9 * * *"}
            onChange={(e) => setSettings({ ...settings, autoSyncCron: e.target.value })}
            className="border rounded px-2 py-1"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings?.autoPushToSheets || false}
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

