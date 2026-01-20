"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { DateTime } from "luxon";

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

export default function BudgetPage() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    loadBudget();
  }, [selectedMonth]);

  async function loadBudget() {
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
  }

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

  function getStatusColor(remaining: number, budget: number) {
    const percentage = getPercentageUsed(budget - remaining, budget);
    if (percentage >= 100) return "bg-red-100 text-red-800 border-red-300";
    if (percentage >= 80) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
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
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budget Overview</h1>
            <p className="text-sm text-gray-600 mt-1">
              {data?.month.label || "Loading..."}
            </p>
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
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Bank Account</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : formatCurrency(data?.balances.bank ?? 0)}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Credit Card 1</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : formatCurrency(data?.balances.cc1 ?? 0)}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Credit Card 2</div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? "..." : formatCurrency(data?.balances.cc2 ?? 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold">Monthly Category Breakdown</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
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
                  {data?.categories.map((item) => {
                    const percentage = getPercentageUsed(item.spent, item.budget);
                    return (
                      <tr key={item.category} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(item.budget)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(item.spent)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${item.remaining < 0 ? "text-red-600" : "text-gray-900"}`}
                        >
                          {formatCurrency(item.remaining)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  percentage >= 100
                                    ? "bg-red-500"
                                    : percentage >= 80
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-12 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      {formatCurrency(totalBudget)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      {formatCurrency(totalSpent)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${totalRemaining < 0 ? "text-red-600" : "text-gray-900"}`}
                    >
                      {formatCurrency(totalRemaining)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
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
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {getPercentageUsed(totalSpent, totalBudget).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Total Budget</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(totalBudget)}
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-700 mb-1">Total Spent</div>
            <div className="text-2xl font-bold text-orange-900">
              {formatCurrency(totalSpent)}
            </div>
          </div>
          <div
            className={`border rounded-lg p-4 ${totalRemaining < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
          >
            <div
              className={`text-sm mb-1 ${totalRemaining < 0 ? "text-red-700" : "text-green-700"}`}
            >
              Remaining Budget
            </div>
            <div
              className={`text-2xl font-bold ${totalRemaining < 0 ? "text-red-900" : "text-green-900"}`}
            >
              {formatCurrency(totalRemaining)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}