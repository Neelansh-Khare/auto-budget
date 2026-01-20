"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

type SummaryItem = {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
};

export default function Home() {
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [exportDestination, setExportDestination] = useState<string>("native");

  useEffect(() => {
    fetch("/api/categories/summary")
      .then((r) => r.json())
      .then((data) => setSummary(data.summary || []))
      .finally(() => setLoading(false));
    
    // Get export destination from settings
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setExportDestination(data.settings?.exportDestination || "native"));
  }, []);

  async function sync(pushToSheets = false) {
    setSyncing(true);
    setMessage("");
    const resp = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pushToSheets }),
    });
    const data = await resp.json();
    if (resp.ok) {
      setMessage(
        `Synced. Ingested ${data.ingested}, categorized ${data.categorized}, needs review ${data.needs_review}`,
      );
      const refreshed = await fetch("/api/categories/summary").then((r) => r.json());
      setSummary(refreshed.summary || []);
    } else {
      setMessage(data.error || "Sync failed");
    }
    setSyncing(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-gray-600">Month-to-date by category</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => sync(false)}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Sync Now
            </button>
            {exportDestination === "google_sheets" && (
              <button
                onClick={() => sync(true)}
                disabled={syncing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Push to Sheets
              </button>
            )}
            {exportDestination === "native" && (
              <a
                href="/budget"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-block text-center"
              >
                View Budget
              </a>
            )}
          </div>
        </div>
        {message && <div className="text-sm text-gray-800">{message}</div>}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.map((item) => (
              <div key={item.category} className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <div className="flex justify-between">
                  <h2 className="font-semibold">{item.category}</h2>
                  <span className="text-xs text-gray-500">Budget ${item.budget}</span>
                </div>
                <p className="text-sm text-gray-700 mt-2">Spent: ${item.spent.toFixed(2)}</p>
                <p className="text-sm text-gray-700">
                  Remaining: ${item.remaining.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
