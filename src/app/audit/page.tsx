"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Card, CardContent } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import { 
  Activity, 
  ChevronDown, 
  Terminal, 
  Clock, 
  Database
} from "lucide-react";

type Log = { id: string; eventType: string; payload: Record<string, unknown>; createdAt: string };

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .finally(() => setLoading(false));
  }, []);

  const getEventBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('error') || t.includes('fail')) return <Badge variant="destructive">{type}</Badge>;
    if (t.includes('sync') || t.includes('push')) return <Badge variant="primary" className="bg-blue-600">{type}</Badge>;
    if (t.includes('create') || t.includes('update')) return <Badge variant="success">{type}</Badge>;
    return <Badge variant="secondary">{type}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Audit</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent events and operation logs.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {logs.length} Entries
          </Badge>
        </div>

        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {logs.map((log) => (
                <Card key={log.id} className="overflow-hidden group hover:border-primary/50 transition-all">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                          <Terminal className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          {getEventBadge(log.eventType)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <CardContent className="p-4 pt-0">
                      <div className="relative">
                         <div className="absolute right-2 top-2">
                           <Database className="h-4 w-4 text-muted-foreground/30" />
                         </div>
                        <pre className="text-[11px] font-mono bg-muted/50 border rounded-lg p-4 overflow-auto max-h-[300px] no-scrollbar">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </details>
                </Card>
              ))}
              
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No logs available</h3>
                    <p className="text-muted-foreground">Audit entries will appear here as the system operates.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
