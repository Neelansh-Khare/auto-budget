"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

type Log = { id: string; eventType: string; payload: any; createdAt: string };

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <div className="space-y-2">
          {logs.map((log) => (
            <details key={log.id} className="bg-white border rounded px-3 py-2 shadow-sm">
              <summary className="flex justify-between cursor-pointer">
                <span className="font-medium">{log.eventType}</span>
                <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
              </summary>
              <pre className="text-xs bg-gray-50 border rounded mt-2 p-2 overflow-auto">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </details>
          ))}
          {logs.length === 0 && <p className="text-sm text-gray-600">No audit entries yet.</p>}
        </div>
      </div>
    </div>
  );
}

