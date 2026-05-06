"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Repeat, Wand2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Input } from "@/components/Input";
import { Badge } from "@/components/Badge";
import { useToast } from "@/components/ToastContext";

type Frequency = "monthly" | "yearly" | "weekly";

interface Subscription {
  id: string;
  name: string;
  merchant: string | null;
  amount: number;
  frequency: Frequency;
  category: string | null;
  active: boolean;
  nextDueDate: string | null;
}

export function SubscriptionsClient() {
  const { success, error: showError, info } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentSub, setCurrentSub] = useState<Partial<Subscription> | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch {
      showError("Could not load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSub?.name || !currentSub?.amount) return;

    try {
      const isUpdate = !!currentSub.id;
      const url = isUpdate ? `/api/subscriptions/${currentSub.id}` : "/api/subscriptions";
      const method = isUpdate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentSub.name,
          merchant: currentSub.merchant,
          amount: Number(currentSub.amount),
          frequency: currentSub.frequency || "monthly",
          category: currentSub.category,
          active: currentSub.active !== undefined ? currentSub.active : true,
          nextDueDate: currentSub.nextDueDate || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      success(isUpdate ? "Subscription updated" : "Subscription added");
      setIsEditing(false);
      setCurrentSub(null);
      fetchSubscriptions();
    } catch {
      showError("Failed to save subscription");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subscription?")) return;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      success("Subscription deleted");
      fetchSubscriptions();
    } catch {
      showError("Failed to delete subscription");
    }
  };

  const handleDetect = async () => {
    try {
      setDetecting(true);
      info("Scanning transactions for recurring charges...");
      const res = await fetch("/api/subscriptions/detect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to detect");
      const data = await res.json();
      if (data.detectedCount > 0) {
        success(`Found ${data.detectedCount} new recurring charges!`);
        fetchSubscriptions();
      } else {
        info("No new recurring charges found.");
      }
    } catch {
      showError("Error detecting subscriptions");
    } finally {
      setDetecting(false);
    }
  };

  if (loading && subscriptions.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>{currentSub?.id ? "Edit Subscription" : "New Subscription"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  required
                  value={currentSub?.name || ""}
                  onChange={(e) => setCurrentSub({ ...currentSub, name: e.target.value })}
                  placeholder="Netflix, Spotify..."
                />
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  required
                  value={currentSub?.amount || ""}
                  onChange={(e) => setCurrentSub({ ...currentSub, amount: parseFloat(e.target.value) })}
                  placeholder="9.99"
                />
                <Input
                  label="Merchant (optional)"
                  value={currentSub?.merchant || ""}
                  onChange={(e) => setCurrentSub({ ...currentSub, merchant: e.target.value })}
                />
                <Input
                  label="Category (optional)"
                  value={currentSub?.category || ""}
                  onChange={(e) => setCurrentSub({ ...currentSub, category: e.target.value })}
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium leading-none">Frequency</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={currentSub?.frequency || "monthly"}
                    onChange={(e) => setCurrentSub({ ...currentSub, frequency: e.target.value as Frequency })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <Input
                  label="Next Due Date (optional)"
                  type="date"
                  value={currentSub?.nextDueDate ? currentSub.nextDueDate.split("T")[0] : ""}
                  onChange={(e) => setCurrentSub({ ...currentSub, nextDueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="active"
                    checked={currentSub?.active !== false}
                    onChange={(e) => setCurrentSub({ ...currentSub, active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="active" className="text-sm font-medium">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Your Subscriptions</h2>
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={handleDetect} disabled={detecting}>
              <Wand2 className={`mr-2 h-4 w-4 ${detecting ? 'animate-spin' : ''}`} /> 
              {detecting ? 'Scanning...' : 'Auto-Detect'}
            </Button>
            <Button onClick={() => { setCurrentSub({ active: true, frequency: "monthly" }); setIsEditing(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Manual
            </Button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg border-dashed">
              No subscriptions found. Add one or try auto-detect.
            </div>
          ) : (
            subscriptions.map((sub) => (
              <Card key={sub.id} className={!sub.active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{sub.name}</CardTitle>
                      <CardDescription>{sub.merchant || sub.category || "Uncategorized"}</CardDescription>
                    </div>
                    <Badge variant={sub.active ? "success" : "secondary"}>
                      {sub.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">${sub.amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Repeat className="h-3 w-3 mr-1" />
                        {sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentSub(sub); setIsEditing(true); }}>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {sub.nextDueDate && (
                    <p className="text-xs text-muted-foreground mt-4">
                      Next due: {new Date(sub.nextDueDate).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
