"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Nav } from "@/components/Nav";
import { Skeleton } from "@/components/Skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { DateTime } from "luxon";
import dynamic from "next/dynamic";
import { 
  CreditCard, 
  Banknote, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3 as BarChartIcon,
  Table as TableIcon
} from "lucide-react";

// Dynamic imports for recharts components to avoid SSR/prerendering issues in Next.js 15 / React 19
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), {
  ssr: false,
});

type CategoryItem = {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
};

type BudgetData = {
  month: { month: number; year: number; label: string };
  balances: { bank: number; cc1: number; cc2: number };
  categories: CategoryItem[];
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

export default function BudgetPage() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const loadBudget = useCallback(async () => {
    setLoading(true);
    try {
      const monthParam = DateTime.fromJSDate(selectedMonth).toFormat("yyyy-MM");
      const response = await fetch(`/api/budget?month=${monthParam}`);
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error("Failed to load budget:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return data.categories
      .filter((c) => c.spent > 0)
      .map((c) => ({
        name: c.category,
        value: c.spent,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const barData = useMemo(() => {
    if (!data) return [];
    return data.categories.map((c) => ({
      name: c.category,
      spent: c.spent,
      budget: c.budget,
    }));
  }, [data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPercentageUsed = (spent: number, budget: number) => {
    if (budget === 0) return 0;
    return Math.min(100, (spent / budget) * 100);
  };

  const changeMonth = (offset: number) => {
    setSelectedMonth(prev => DateTime.fromJSDate(prev).plus({ months: offset }).toJSDate());
  };

  const totalBudget = data?.categories.reduce((sum, c) => sum + c.budget, 0) ?? 0;
  const totalSpent = data?.categories.reduce((sum, c) => sum + c.spent, 0) ?? 0;
  const totalRemaining = totalBudget - totalSpent;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Overview</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {data?.month.label || DateTime.fromJSDate(selectedMonth).toFormat("LLLL yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-[120px] text-center">
              {DateTime.fromJSDate(selectedMonth).toFormat("MMM yyyy")}
            </span>
            <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Running Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(data?.balances.bank ?? 0)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CC 1 Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(data?.balances.cc1 ?? 0)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CC 2 Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(data?.balances.cc2 ?? 0)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                <CardTitle>Spending Distribution</CardTitle>
              </div>
              <CardDescription>How your money is distributed across categories.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No spending data for this month.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5 text-primary" />
                <CardTitle>Budget vs. Actual</CardTitle>
              </div>
              <CardDescription>Compare your set budget with actual spending.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <div className="space-y-4 h-full flex flex-col justify-end">
                   {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className={`w-full h-${i*4}`} />
                  ))}
                </div>
              ) : barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={100}
                      style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Spent" />
                    <Bar dataKey="budget" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} name="Budget" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No budget data for this month.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-primary" />
                <CardTitle>Category Breakdown</CardTitle>
              </div>
              <CardDescription>A detailed look at your spending per category.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b bg-muted/50">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Budget</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Spent</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Remaining</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[150px]">Progress</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="p-4"><Skeleton className="h-2 w-full" /></td>
                      </tr>
                    ))
                  ) : (
                    <>
                      {data?.categories.map((item) => {
                        const percentage = getPercentageUsed(item.spent, item.budget);
                        const isOver = item.spent > item.budget;
                        return (
                          <tr key={item.category} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle font-medium">{item.category}</td>
                            <td className="p-4 align-middle text-right">{formatCurrency(item.budget)}</td>
                            <td className="p-4 align-middle text-right font-semibold">{formatCurrency(item.spent)}</td>
                            <td className={`p-4 align-middle text-right font-bold ${isOver ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                              {formatCurrency(item.remaining)}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${
                                      isOver ? 'bg-destructive' : percentage > 80 ? 'bg-yellow-500' : 'bg-primary'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold min-w-[30px]">{percentage.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-muted/30 font-bold border-t-2">
                        <td className="p-4 align-middle">Total</td>
                        <td className="p-4 align-middle text-right">{formatCurrency(totalBudget)}</td>
                        <td className="p-4 align-middle text-right">{formatCurrency(totalSpent)}</td>
                        <td className={`p-4 align-middle text-right font-black ${totalRemaining < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                          {formatCurrency(totalRemaining)}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  totalSpent > totalBudget ? 'bg-destructive' : (totalSpent/totalBudget) > 0.8 ? 'bg-yellow-500' : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(100, (totalSpent/totalBudget)*100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black min-w-[30px]">{((totalSpent/totalBudget)*100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardDescription>Budget Limit</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(totalBudget)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mt-1">Total planned expenses for this month.</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardDescription>Actual Spending</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(totalSpent)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mt-1">Total money spent so far.</p>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${totalRemaining < 0 ? 'border-l-destructive' : 'border-l-green-500'}`}>
            <CardHeader className="pb-2">
              <CardDescription>Remaining</CardDescription>
              <CardTitle className={`text-2xl ${totalRemaining < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(totalRemaining)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mt-1">
                {totalRemaining < 0 ? 'You are over budget!' : 'Available to spend before month end.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
