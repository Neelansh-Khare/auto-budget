"use client";

import { useEffect, useState, useMemo } from "react";
import { Nav } from "@/components/Nav";
import { useToast } from "@/components/ToastContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { Button, buttonVariants } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { Badge } from "@/components/Badge";
import { 
  RefreshCcw, 
  Send, 
  Wallet, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  BarChart3,
  CalendarDays
} from "lucide-react";
import Link from "next/link";

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
  const [exportDestination, setExportDestination] = useState<string>("native");
  const { success, error, info } = useToast();

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

  const totals = useMemo(() => {
    return summary.reduce((acc, item) => ({
      budget: acc.budget + item.budget,
      spent: acc.spent + item.spent,
      remaining: acc.remaining + item.remaining
    }), { budget: 0, spent: 0, remaining: 0 });
  }, [summary]);

  async function sync(pushToSheets = false) {
    setSyncing(true);
    info("Starting sync...");
    try {
      const resp = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushToSheets }),
      });
      const data = await resp.json();
      if (resp.ok) {
        success(
          `Sync complete. Ingested ${data.ingested}, categorized ${data.categorized}, needs review ${data.needs_review}`,
        );
        const refreshed = await fetch("/api/categories/summary").then((r) => r.json());
        setSummary(refreshed.summary || []);
      } else {
        error(data.error || "Sync failed");
      }
    } catch {
      error("An error occurred during sync");
    } finally {
      setSyncing(false);
    }
  }

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
              <CalendarDays className="h-4 w-4" />
              Overview for {currentMonth}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => sync(false)}
              isLoading={syncing}
              leftIcon={RefreshCcw}
            >
              Sync Now
            </Button>
            {exportDestination === "google_sheets" ? (
              <Button
                variant="primary"
                onClick={() => sync(true)}
                isLoading={syncing}
                leftIcon={Send}
              >
                Push to Sheets
              </Button>
            ) : (
              <Link 
                href="/budget" 
                className={`${buttonVariants.base} ${buttonVariants.variant.primary} ${buttonVariants.size.md}`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Budget
              </Link>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">${totals.budget.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Combined monthly limit</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-destructive">${totals.spent.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((totals.spent / totals.budget) * 100).toFixed(1)}% of total budget used
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${totals.remaining < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                    ${totals.remaining.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totals.remaining < 0 ? 'Over budget!' : 'Available to spend'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="md:col-span-1 lg:col-span-4">
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>
                Detailed breakdown of your expenses for the current month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {summary.map((item) => {
                    const percentage = Math.min((item.spent / item.budget) * 100, 100);
                    const isOverBudget = item.spent > item.budget;
                    return (
                      <div key={item.category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.category}</span>
                            {isOverBudget && (
                              <Badge variant="destructive" className="h-5">Over Limit</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            <span className="font-medium text-foreground">${item.spent.toFixed(2)}</span> / ${item.budget}
                          </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              isOverBudget ? 'bg-destructive' : percentage > 90 ? 'bg-yellow-500' : 'bg-primary'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-1 lg:col-span-3">
            <CardHeader>
              <CardTitle>Quick Insights</CardTitle>
              <CardDescription>Automated spending observations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  {summary.some(s => s.spent > s.budget) ? (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive flex gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Spending Alert</p>
                        <p className="text-xs opacity-90">You have exceeded your budget in {summary.filter(s => s.spent > s.budget).length} categories.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-700 dark:text-green-400 flex gap-3">
                      <TrendingUp className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">On Track</p>
                        <p className="text-xs opacity-90">You are currently under budget in all categories. Keep it up!</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Top Spending Category</p>
                    {summary.length > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                        <span className="text-sm">{[...summary].sort((a, b) => b.spent - a.spent)[0].category}</span>
                        <span className="text-sm font-bold">${[...summary].sort((a, b) => b.spent - a.spent)[0].spent.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t flex flex-col gap-2">
                    <Link 
                      href="/review"
                      className={`${buttonVariants.base} ${buttonVariants.variant.outline} ${buttonVariants.size.sm} justify-start`}
                    >
                      Review Recent Transactions
                    </Link>
                    <Link 
                      href="/settings"
                      className={`${buttonVariants.base} ${buttonVariants.variant.outline} ${buttonVariants.size.sm} justify-start`}
                    >
                      Configure Connections
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
