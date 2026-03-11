"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/ToastContext";

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

export default function ReviewPage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkCategory, setBulkCategory] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createRuleMap, setCreateRuleMap] = useState<Map<string, boolean>>(new Map());
  const { success, error } = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/transactions?status=needs_review").then((r) => r.json());
      setItems(data.transactions || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function update(id: string, category: string, status = "categorized", createRule = false) {
    try {
      const resp = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, status, create_rule: createRule }),
      });
      if (resp.ok) {
        success("Transaction categorized");
        load();
      } else {
        error("Failed to categorize transaction");
      }
    } catch (err) {
      error("An error occurred");
    }
  }

  async function markTransfer(id: string) {
    try {
      const resp = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "transfer" }),
      });
      if (resp.ok) {
        success("Marked as transfer");
        load();
      } else {
        error("Failed to mark as transfer");
      }
    } catch (err) {
      error("An error occurred");
    }
  }

  async function markIgnored(id: string) {
    try {
      const resp = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ignored" }),
      });
      if (resp.ok) {
        success("Transaction ignored");
        load();
      } else {
        error("Failed to ignore transaction");
      }
    } catch (err) {
      error("An error occurred");
    }
  }

  async function applyBulk() {
    try {
      for (const id of selected) {
        await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            category: bulkCategory, 
            status: "categorized", 
            create_rule: createRuleMap.get(id) || false 
          }),
        });
      }
      success(`Bulk categorized ${selected.size} items`);
      setSelected(new Set());
      load();
    } catch (err) {
      error("An error occurred during bulk action");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Needs Review</h1>
          <div className="flex gap-2 items-center">
            <input
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              placeholder="Bulk category"
              className="border rounded px-2 py-1"
              disabled={loading}
            />
            <button 
              onClick={applyBulk} 
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              disabled={loading || selected.size === 0}
            >
              Apply to selected
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white border rounded shadow-sm p-4 flex gap-4 items-center">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="w-48 h-5" />
                    <Skeleton className="w-20 h-5" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="w-32 h-8" />
                    <Skeleton className="w-24 h-8" />
                    <Skeleton className="w-24 h-8" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {items.map((t) => (
                <div key={t.id} className="bg-white border rounded shadow-sm p-3 flex gap-3 items-center">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(t.id);
                      else next.delete(t.id);
                      setSelected(next);
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold">{t.merchant || t.description}</p>
                        <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${t.amountSpendNormalized.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          Confidence {t.confidence ? (t.confidence * 100).toFixed(0) + "%" : "n/a"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <input
                        key={t.id}
                        defaultValue={t.category || ""}
                        placeholder="Category"
                        className="border rounded px-2 py-1"
                        onBlur={(e) => {
                          const createRule = createRuleMap.get(t.id) || false;
                          update(t.id, e.target.value, "categorized", createRule);
                        }}
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={createRuleMap.get(t.id) || false}
                          onChange={(e) => {
                            const next = new Map(createRuleMap);
                            next.set(t.id, e.target.checked);
                            setCreateRuleMap(next);
                          }}
                        />
                        <span className="text-xs">Create rule</span>
                      </label>
                      <button
                        onClick={() => markTransfer(t.id)}
                        className="px-2 py-1 border rounded hover:bg-gray-100 text-sm"
                      >
                        Mark transfer
                      </button>
                      <button
                        onClick={() => markIgnored(t.id)}
                        className="px-2 py-1 border rounded hover:bg-gray-100 text-sm"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-gray-600">No items needing review.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
