"use client";

import { useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/Nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Badge } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/ToastContext";
import { 
  Zap, 
  Plus, 
  Trash2, 
  Settings2, 
  ToggleLeft, 
  ToggleRight, 
  Hash,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    pattern: "",
    patternType: "substring",
    category: "",
    priority: 0,
  });
  const { success, error } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/rules").then((r) => r.json());
      setRules(data.rules || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createRule() {
    if (!form.name || !form.pattern || !form.category) {
      error("Please fill in all required fields");
      return;
    }
    setIsSaving(true);
    try {
      const resp = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (resp.ok) {
        success("Rule created successfully");
        setForm({ name: "", pattern: "", patternType: "substring", category: "", priority: 0 });
        load();
      } else {
        error("Failed to create rule");
      }
    } catch {
      error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleRule(id: string, enabled: boolean) {
    try {
      const resp = await fetch(`/api/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (resp.ok) {
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
        success(enabled ? "Rule enabled" : "Rule disabled");
      }
    } catch {
      error("An error occurred");
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      const resp = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (resp.ok) {
        success("Rule deleted");
        setRules(prev => prev.filter(r => r.id !== id));
      }
    } catch {
      error("An error occurred");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" fill="currentColor" />
              Categorization Rules
            </h1>
            <p className="text-muted-foreground mt-1">
              Automate your budget by defining patterns for known transactions.
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {rules.length} Active Rules
          </Badge>
        </div>

        {/* Create Rule Form */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Plus className="h-5 w-5" /> New Rule
            </CardTitle>
            <CardDescription>Rules are applied in order of priority (highest first).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Rule Name</label>
                <Input 
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Starbucks Coffee"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Assign Category</label>
                <Input 
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Food & Drink"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Pattern Type</label>
                <select
                  value={form.patternType}
                  onChange={(e) => setForm({ ...form, patternType: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="substring">Contains Substring</option>
                  <option value="regex">Regular Expression</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Match Pattern</label>
                <Input 
                  value={form.pattern}
                  onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                  placeholder="e.g. STARBUCKS"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                <Input 
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-primary/5 pt-6">
            <Button onClick={createRule} isLoading={isSaving} leftIcon={Plus}>
              Create Automation Rule
            </Button>
          </CardFooter>
        </Card>

        {/* Rules List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Existing Automations
          </h2>
          
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                {rules.sort((a, b) => b.priority - a.priority).map((r) => (
                  <Card key={r.id} className={`group transition-all ${!r.enabled ? 'opacity-60 bg-muted/30' : 'hover:border-primary/50'}`}>
                    <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{r.name}</h3>
                          <Badge variant={r.enabled ? "success" : "outline"} className="h-5">
                            {r.enabled ? "Active" : "Disabled"}
                          </Badge>
                          <Badge variant="secondary" className="h-5 flex gap-1 items-center">
                            <Hash className="h-3 w-3" /> {r.priority}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] border">
                            {r.patternType === 'regex' ? 'REGEX' : 'SUBSTR'}
                          </span>
                          <span className="font-bold text-foreground italic">&quot;{r.pattern}&quot;</span>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline" className="font-bold text-primary border-primary/20 bg-primary/5">
                            {r.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 self-end md:self-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleRule(r.id, !r.enabled)}
                          title={r.enabled ? "Disable Rule" : "Enable Rule"}
                        >
                          {r.enabled ? (
                            <ToggleRight className="h-6 w-6 text-primary" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteRule(r.id)}
                          title="Delete Rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {rules.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed rounded-xl">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                      <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">No rules defined</h3>
                      <p className="text-muted-foreground">Create rules above to auto-categorize incoming transactions.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
