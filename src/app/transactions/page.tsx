"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Nav } from "@/components/Nav";
import { Skeleton } from "@/components/Skeleton";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Badge } from "@/components/Badge";
import { 
  Download, 
  Search, 
  Filter, 
  ArrowUpDown, 
  LayoutList
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

type SortConfig = {
  key: keyof Tx | 'date';
  direction: 'asc' | 'desc';
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const data = await fetch(`/api/transactions?${params.toString()}`).then((r) => r.json());
      setTransactions(data.transactions || []);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedTransactions = useMemo(() => {
    const items = [...transactions];
    items.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'date') {
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
      }

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [transactions, sortConfig]);

  const requestSort = (key: keyof Tx | 'date') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  async function updateCategory(id: string, category: string) {
    if (!category) return;
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, status: "categorized" }),
    });
    // Update local state to avoid full reload
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category, status: "categorized" } : t));
  }

  function handleExportCsv() {
    if (transactions.length === 0) return;

    const headers = ["Date", "Merchant", "Description", "Amount", "Category", "Status", "Confidence"];
    const rows = sortedTransactions.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.merchant || "",
      `"${t.description.replace(/"/g, '""')}"`,
      t.amountSpendNormalized.toFixed(2),
      t.category || "",
      t.status,
      t.confidence ? (t.confidence * 100).toFixed(0) + "%" : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'categorized': return <Badge variant="success">Categorized</Badge>;
      case 'needs_review': return <Badge variant="warning">Needs Review</Badge>;
      case 'transfer': return <Badge variant="secondary">Transfer</Badge>;
      case 'ignored': return <Badge variant="outline">Ignored</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your synced financial data.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={loading || transactions.length === 0} leftIcon={Download}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> Search
              </label>
              <Input 
                placeholder="Merchant or description..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All statuses</option>
                <option value="categorized">Categorized</option>
                <option value="needs_review">Needs Review</option>
                <option value="transfer">Transfer</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
            <Button 
              variant="primary" 
              onClick={load} 
              isLoading={loading}
              className="w-full md:w-auto"
            >
              Apply Filters
            </Button>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b bg-muted/50">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th 
                      className="h-10 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={() => requestSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date {sortConfig.key === 'date' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th 
                      className="h-10 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={() => requestSort('merchant')}
                    >
                      <div className="flex items-center gap-1">
                        Merchant {sortConfig.key === 'merchant' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">Description</th>
                    <th 
                      className="h-10 px-4 text-right align-middle font-medium text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={() => requestSort('amountSpendNormalized')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Amount {sortConfig.key === 'amountSpendNormalized' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground hidden md:table-cell">Conf.</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-4 hidden lg:table-cell"><Skeleton className="h-4 w-48" /></td>
                        <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="p-4"><Skeleton className="h-8 w-32" /></td>
                        <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                        <td className="p-4 hidden md:table-cell"><Skeleton className="h-4 w-8 mx-auto" /></td>
                      </tr>
                    ))
                  ) : (
                    sortedTransactions.map((t) => (
                      <tr key={t.id} className="border-b transition-colors hover:bg-muted/30 group">
                        <td className="p-4 align-middle whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4 align-middle font-medium max-w-[150px] truncate" title={t.merchant || t.description}>
                          {t.merchant || t.description}
                        </td>
                        <td className="p-4 align-middle text-muted-foreground hidden lg:table-cell max-w-[250px] truncate" title={t.description}>
                          {t.description}
                        </td>
                        <td className="p-4 align-middle text-right font-bold">
                          ${t.amountSpendNormalized.toFixed(2)}
                        </td>
                        <td className="p-4 align-middle">
                          <Input 
                            className="h-8 text-xs w-32 md:w-40" 
                            defaultValue={t.category || ""}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updateCategory(t.id, (e.target as HTMLInputElement).value);
                            }}
                            onBlur={(e) => updateCategory(t.id, e.target.value)}
                          />
                        </td>
                        <td className="p-4 align-middle">
                          {getStatusBadge(t.status)}
                        </td>
                        <td className="p-4 align-middle text-center text-xs text-muted-foreground hidden md:table-cell">
                          {t.confidence ? (t.confidence * 100).toFixed(0) + "%" : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!loading && transactions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                    <LayoutList className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No transactions found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                  </div>
                  <Button variant="outline" onClick={() => { setSearch(""); setStatus(""); }}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
