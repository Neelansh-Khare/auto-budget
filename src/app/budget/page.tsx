"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Nav } from "@/components/Nav";
import { Skeleton } from "@/components/Skeleton";
import { DateTime } from "luxon";
import dynamic from "next/dynamic";

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
  "#3b82f6", // Blue-500
  "#10b981", // Emerald-500
  "#f59e0b", // Amber-500
  "#ef4444", // Red-500
  "#8b5cf6", // Violet-500
  "#ec4899", // Pink-500
  "#06b6d4", // Cyan-500
  "#f97316", // Orange-500
  "#14b8a6", // Teal-500
  "#6366f1", // Indigo-500
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

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  function getPercentageUsed(spent: number, budget: number) {
    if (budget === 0) return 0;
    return Math.min(100, (spent / budget) * 100);
  }

  function getMonthOptions() {
    const months = [];
    const now = DateTime.now();
    for (let i = -6; i <= 6; i++) {
      const month = now.plus({ months: i });
      months.push(month.toJSDate());
    }
    return months;
  }

  const totalBudget = data?.categories.reduce((sum, c) => sum + c.budget, 0) ?? 0;
  const totalSpent = data?.categories.reduce((sum, c) => sum + c.spent, 0) ?? 0;
  const totalRemaining = totalBudget - totalSpent;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Nav />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budget Overview</h1>
            <div className="h-5 mt-1">
              {loading ? (
                <Skeleton className="w-32 h-4" />
              ) : (
                <p className="text-sm text-gray-600">{data?.month.label}</p>
              )}
            </div>
          </div>
          <div>
            <select
              value={DateTime.fromJSDate(selectedMonth).toFormat("yyyy-MM")}
              onChange={(e) => setSelectedMonth(new Date(e.target.value + "-01"))}
              className="border rounded px-3 py-2 bg-white"
            >
              {getMonthOptions().map((month) => {
                const dt = DateTime.fromJSDate(month);
                return (
                  <option key={dt.toFormat("yyyy-MM")} value={dt.toFormat("yyyy-MM")}>
                    {dt.toFormat("LLLL yyyy")}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Running Balances */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Running Balances</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-gray-50/50">
              <div className="text-sm text-gray-600 mb-1">Bank Account</div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="w-24 h-8" />
                ) : (
                  formatCurrency(data?.balances.bank ?? 0)
                )}
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50/50">
              <div className="text-sm text-gray-600 mb-1">Credit Card 1</div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="w-24 h-8" />
                ) : (
                  formatCurrency(data?.balances.cc1 ?? 0)
                )}
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50/50">
              <div className="text-sm text-gray-600 mb-1">Credit Card 2</div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="w-24 h-8" />
                ) : (
                  formatCurrency(data?.balances.cc2 ?? 0)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Spending by Category</h2>
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-8 border-gray-100 border-t-blue-500 animate-spin" />
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
                      formatter={(value: unknown) => formatCurrency(Number(value))}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  No spending data for this month
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Budget vs. Actual</h2>
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="w-full h-full space-y-4">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                      stroke="#f3f4f6"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#4b5563" }}
                      width={100}
                    />
                    <Tooltip
                      formatter={(value: unknown) => formatCurrency(Number(value))}
                      cursor={{ fill: "#f9fafb" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="spent" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Spent" />
                    <Bar dataKey="budget" fill="#e5e7eb" radius={[0, 4, 4, 0]} name="Budget" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  No budget data for this month
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Breakdown Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Monthly Category Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-48">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <Skeleton className="w-24 h-4" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="w-16 h-4 ml-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="w-16 h-4 ml-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="w-16 h-4 ml-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="w-full h-2" />
                      </td>
                    </tr>
                  ))
                ) : (
                  data?.categories.map((item) => {
                    const percentage = getPercentageUsed(item.spent, item.budget);
                    return (
                      <tr key={item.category} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(item.budget)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                          {formatCurrency(item.spent)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${item.remaining < 0 ? "text-red-600" : "text-gray-900"}`}
                        >
                          {formatCurrency(item.remaining)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                              <div
                                className={`h-full transition-all duration-500 ease-out ${
                                  percentage >= 100
                                    ? "bg-red-500"
                                    : percentage >= 80
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-12 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {!loading && (
                <tfoot className="bg-gray-50 border-t-2">
                  <tr className="font-bold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(totalBudget)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(totalSpent)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-right text-sm ${totalRemaining < 0 ? "text-red-600" : "text-gray-900"}`}
                    >
                      {formatCurrency(totalRemaining)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-500 ease-out ${
                              getPercentageUsed(totalSpent, totalBudget) >= 100
                                ? "bg-red-500"
                                : getPercentageUsed(totalSpent, totalBudget) >= 80
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(100, getPercentageUsed(totalSpent, totalBudget))}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-12 text-right">
                          {getPercentageUsed(totalSpent, totalBudget).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border-l-4 border-l-blue-500 border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="text-sm font-medium text-blue-600 mb-1">Total Monthly Budget</div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? <Skeleton className="w-24 h-9" /> : formatCurrency(totalBudget)}
            </div>
          </div>
          <div className="bg-white border-l-4 border-l-orange-500 border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="text-sm font-medium text-orange-600 mb-1">Total Month Spending</div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? <Skeleton className="w-24 h-9" /> : formatCurrency(totalSpent)}
            </div>
          </div>
          <div
            className={`border rounded-lg p-5 shadow-sm border-l-4 ${
              loading
                ? "bg-white border-gray-200 border-l-gray-400"
                : totalRemaining < 0
                  ? "bg-white border-red-200 border-l-red-500"
                  : "bg-white border-green-200 border-l-green-500"
            }`}
          >
            <div
              className={`text-sm font-medium mb-1 ${
                loading ? "text-gray-600" : totalRemaining < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              Remaining Budget
            </div>
            <div
              className={`text-3xl font-bold ${
                loading ? "text-gray-900" : totalRemaining < 0 ? "text-red-700" : "text-green-700"
              }`}
            >
              {loading ? <Skeleton className="w-24 h-9" /> : formatCurrency(totalRemaining)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
