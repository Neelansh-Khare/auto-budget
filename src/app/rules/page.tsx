"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

type Rule = {
  id: string;
  name: string;
  pattern: string;
  patternType: string;
  category: string;
  priority: number;
  enabled: boolean;
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState({
    name: "",
    pattern: "",
    patternType: "substring",
    category: "",
    priority: 0,
  });

  async function load() {
    const data = await fetch("/api/rules").then((r) => r.json());
    setRules(data.rules || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createRule() {
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", pattern: "", patternType: "substring", category: "", priority: 0 });
    load();
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch(`/api/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Rules</h1>
        <div className="bg-white border rounded p-4 shadow-sm space-y-2">
          <h2 className="font-semibold">Create Rule</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              className="border rounded px-2 py-1"
            />
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Category"
              className="border rounded px-2 py-1"
            />
            <input
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              placeholder="Pattern"
              className="border rounded px-2 py-1"
            />
            <select
              value={form.patternType}
              onChange={(e) => setForm({ ...form, patternType: e.target.value })}
              className="border rounded px-2 py-1"
            >
              <option value="substring">Substring</option>
              <option value="regex">Regex</option>
            </select>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              placeholder="Priority"
              className="border rounded px-2 py-1"
            />
          </div>
          <button onClick={createRule} className="px-3 py-1 bg-blue-600 text-white rounded">
            Save rule
          </button>
        </div>
        <div className="bg-white border rounded p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Existing Rules</h2>
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex justify-between items-center border rounded px-3 py-2">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-gray-600">
                    {r.patternType}: {r.pattern} → {r.category} (priority {r.priority})
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => toggleRule(r.id, e.target.checked)}
                  />
                  Enabled
                </label>
              </div>
            ))}
            {rules.length === 0 && <p className="text-sm text-gray-600">No rules yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

