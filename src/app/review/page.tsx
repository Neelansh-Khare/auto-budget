"use client";

import { useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/Nav";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/ToastContext";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Badge } from "@/components/Badge";
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  Search,
  CheckSquare,
  Square,
  Clock
} from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { success, error, info } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/transactions?status=needs_review").then((r) => r.json());
      const txs = data.transactions || [];
      setItems(txs);
      
      if (txs.length > 0) {
        // Fetch suggestions
        const suggResp = await fetch("/api/transactions/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: txs.map((t: any) => ({ id: t.id, merchant: t.merchant, description: t.description })) }),
        });
        if (suggResp.ok) {
          const { suggestions } = await suggResp.json();
          setSuggestions(suggestions);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "j") {
        setFocusedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === "k") {
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "x") {
        const item = filteredItems[focusedIndex];
        if (item) toggleSelect(item.id);
      } else if (e.key === "i") {
        const item = filteredItems[focusedIndex];
        if (item) markIgnored(item.id);
      } else if (e.key === "t") {
        const item = filteredItems[focusedIndex];
        if (item) markTransfer(item.id);
      } else if (e.key === "Enter") {
        const item = filteredItems[focusedIndex];
        if (item && item.category) {
          update(item.id, item.category, "categorized", createRuleMap.get(item.id) || false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, items, searchQuery, createRuleMap]);

  async function update(id: string, category: string, status = "categorized", createRule = false) {
    if (!category) return;
    try {
      const resp = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, status, create_rule: createRule }),
      });
      if (resp.ok) {
        success("Transaction categorized");
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        error("Failed to categorize transaction");
      }
    } catch {
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
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        error("Failed to mark as transfer");
      }
    } catch {
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
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        error("Failed to ignore transaction");
      }
    } catch {
      error("An error occurred");
    }
  }

  async function applyBulk() {
    if (!bulkCategory) {
      error("Please specify a category for bulk action");
      return;
    }
    info(`Applying bulk category to ${selected.size} items...`);
    try {
      let count = 0;
      for (const id of selected) {
        const resp = await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            category: bulkCategory, 
            status: "categorized", 
            create_rule: createRuleMap.get(id) || false 
          }),
        });
        if (resp.ok) count++;
      }
      success(`Bulk categorized ${count} items`);
      setSelected(new Set());
      setBulkCategory("");
      load();
    } catch {
      error("An error occurred during bulk action");
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === filteredItems.length) setSelected(new Set());
    else setSelected(new Set(filteredItems.map(i => i.id)));
  };

  const filteredItems = items.filter(item => 
    (item.merchant || item.description).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getConfidenceColor = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground";
    if (score >= 0.8) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 0.5) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
            <p className="text-muted-foreground mt-1">
              Categorize pending transactions to keep your budget accurate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              {items.length} Pending
            </Badge>
          </div>
        </div>

        {/* Bulk Actions & Search */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter transactions..." 
                  className="pl-8" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-sm font-medium">Bulk Category</label>
              <Input 
                placeholder="Assign category to selected..." 
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="primary" 
                onClick={applyBulk}
                disabled={selected.size === 0 || !bulkCategory}
                className="flex-1 md:flex-none"
              >
                Apply to {selected.size || "selected"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List Header */}
        <div className="flex items-center justify-between px-2">
           <button 
            onClick={selectAll}
            className="text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-primary transition-colors"
          >
            {selected.size === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Select All {filteredItems.length !== items.length ? `(${filteredItems.length} filtered)` : ''}
          </button>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="hidden md:block">Confidence</span>
            <span className="hidden md:block text-right w-20">Amount</span>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex gap-4 items-center">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {filteredItems.map((t, index) => (
                <Card key={t.id} className={`transition-all ${index === focusedIndex ? 'ring-2 ring-primary border-primary shadow-lg shadow-primary/10' : ''} ${selected.has(t.id) ? 'bg-primary/5' : 'hover:border-primary/50'}`}>
                  <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <button 
                        onClick={() => toggleSelect(t.id)}
                        className="mt-1 transition-colors hover:text-primary"
                      >
                        {selected.has(t.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                          <p className="font-bold truncate text-lg">
                            {t.merchant || t.description}
                          </p>
                          <div className="flex items-center gap-3">
                            {t.confidence !== null && (
                              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getConfidenceColor(t.confidence)}`}>
                                {(t.confidence * 100).toFixed(0)}% Match
                              </div>
                            )}
                            <p className="font-bold text-lg md:text-xl text-right">
                              ${t.amountSpendNormalized.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(t.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          {t.merchant && t.description && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="truncate max-w-[200px]">{t.description}</span>
                            </>
                          )}
                        </div>

                        {/* Suggestions */}
                        {suggestions[t.id] && suggestions[t.id].length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Suggested:</span>
                            <div className="flex flex-wrap gap-1">
                              {suggestions[t.id].map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => update(t.id, cat, "categorized", createRuleMap.get(t.id) || false)}
                                  className="px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-colors"
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                          <div className="flex-1 min-w-[200px] max-w-sm relative">
                            <Input 
                              placeholder="Type category..." 
                              defaultValue={t.category || ""}
                              className="h-8 text-sm pr-12"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  update(t.id, (e.target as HTMLInputElement).value, "categorized", createRuleMap.get(t.id) || false);
                                }
                              }}
                            />
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="absolute right-0 top-0 h-8 px-2 text-primary"
                              onClick={(e) => {
                                const input = e.currentTarget.previousSibling as HTMLInputElement;
                                update(t.id, input.value, "categorized", createRuleMap.get(t.id) || false);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="rounded border-input text-primary focus:ring-primary"
                              checked={createRuleMap.get(t.id) || false}
                              onChange={(e) => {
                                const next = new Map(createRuleMap);
                                next.set(t.id, e.target.checked);
                                setCreateRuleMap(next);
                              }}
                            />
                            <span className="text-xs font-medium">Auto-rule</span>
                          </label>

                          <div className="flex gap-1 ml-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Mark as Transfer"
                              onClick={() => markTransfer(t.id)}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                              <span className="hidden lg:inline ml-2">Transfer</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Ignore Transaction"
                              onClick={() => markIgnored(t.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="hidden lg:inline ml-2">Ignore</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">All caught up!</h3>
                    <p className="text-muted-foreground">No transactions need review at this time.</p>
                  </div>
                  <Button variant="outline" onClick={() => load()}>
                    Refresh Queue
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
