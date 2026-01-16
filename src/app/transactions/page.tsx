"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

type Tx = {
  id: string;
  date: string;
  merchant: string | null;
  description: string;
  amountSpendNormalized: number;
  category: string | null;
  status: string;
  confidence: number | null;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const data = await fetch(`/api/transactions?${params.toString()}`).then((r) => r.json());
    setTransactions(data.transactions || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateCategory(id: string, category: string) {
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, status: "categorized" }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">All statuses</option>
            <option value="categorized">Categorized</option>
            <option value="needs_review">Needs Review</option>
            <option value="uncategorized">Uncategorized</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant/description"
            className="border rounded px-2 py-1"
          />
          <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded">
            Apply
          </button>
        </div>
        <div className="overflow-auto bg-white border rounded shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Merchant</th>
                <th className="text-left p-2">Description</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="p-2">{t.merchant || "-"}</td>
                  <td className="p-2">{t.description}</td>
                  <td className="p-2">${t.amountSpendNormalized.toFixed(2)}</td>
                  <td className="p-2">
                    <input
                      className="border rounded px-2 py-1 w-40"
                      defaultValue={t.category || ""}
                      onBlur={(e) => updateCategory(t.id, e.target.value)}
                    />
                  </td>
                  <td className="p-2">{t.status}</td>
                  <td className="p-2">{t.confidence ? (t.confidence * 100).toFixed(0) + "%" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

