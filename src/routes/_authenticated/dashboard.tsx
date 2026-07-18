import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Eye, TrendingUp, Zap, Plus, Star } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { QR_TYPE_MAP } from "@/lib/qr-types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — QRSync" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  const codesQuery = useQuery({
    queryKey: ["qr-codes", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const scansQuery = useQuery({
    queryKey: ["scans", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_scans")
        .select("scanned_at, device, browser, qr_id")
        .gte("scanned_at", subDays(new Date(), 30).toISOString());
      if (error) throw error;
      return data;
    },
  });

  const codes = codesQuery.data ?? [];
  const scans = scansQuery.data ?? [];

  const totalScans = codes.reduce((s, c) => s + (c.scan_count || 0), 0);
  const activeCodes = codes.filter((c) => c.status === "active").length;
  const today = startOfDay(new Date());
  const todayScans = scans.filter((s) => new Date(s.scanned_at) >= today).length;
  const weekAgo = subDays(new Date(), 7);
  const weeklyScans = scans.filter((s) => new Date(s.scanned_at) >= weekAgo).length;

  // Scans per day (last 14 days)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    return {
      date: format(d, "MMM d"),
      day: format(d, "yyyy-MM-dd"),
      scans: scans.filter((s) => format(new Date(s.scanned_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd")).length,
    };
  });

  // QR type distribution
  const typeCounts: Record<string, number> = {};
  codes.forEach((c) => { typeCounts[c.type] = (typeCounts[c.type] || 0) + 1; });
  const pieData = Object.entries(typeCounts).map(([type, count]) => ({
    name: QR_TYPE_MAP[type as keyof typeof QR_TYPE_MAP]?.label || type,
    value: count,
  }));
  const pieColors = ["#4f46e5", "#059669", "#f59e0b", "#e11d48", "#0891b2", "#7c3aed", "#db2777", "#65a30d"];

  return (
    <div className="flex-1">
      <header className="h-16 border-b bg-card flex items-center justify-between px-8">
        <div>
          <h1 className="text-lg font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Real-time overview of your QR codes</p>
        </div>
        <Link to="/qr/new"><Button size="sm"><Plus className="size-4 mr-1.5" />Create QR</Button></Link>
      </header>
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total QR Codes" value={codes.length} icon={QrCode} />
          <StatCard label="Total Scans" value={totalScans.toLocaleString()} icon={Eye} accent />
          <StatCard label="Today's Scans" value={todayScans} icon={TrendingUp} />
          <StatCard label="Active" value={`${activeCodes} / ${codes.length}`} icon={Zap} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold">Scan Activity (14 days)</h3>
              <span className="text-xs text-muted-foreground font-mono">{weeklyScans} this week</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={days}>
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="scans" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold mb-6">Type Distribution</h3>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No QR codes yet</p>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} innerRadius={40} outerRadius={70} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-1.5">
                  {pieData.slice(0, 4).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                        <span>{d.name}</span>
                      </div>
                      <span className="text-muted-foreground font-mono">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="font-bold">Recent QR Codes</h3>
            <Link to="/qr-codes" className="text-xs font-semibold text-primary">View all →</Link>
          </div>
          {codes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="size-16 mx-auto rounded-2xl bg-accent grid place-items-center mb-4">
                <QrCode className="size-8 text-accent-foreground" />
              </div>
              <h4 className="font-semibold">No QR codes yet</h4>
              <p className="text-sm text-muted-foreground mt-1">Create your first QR to get started.</p>
              <Link to="/qr/new" className="inline-block mt-4"><Button size="sm"><Plus className="size-4 mr-1.5" />Create QR</Button></Link>
            </div>
          ) : (
            <div className="divide-y">
              {codes.slice(0, 6).map((c) => {
                const meta = QR_TYPE_MAP[c.type as keyof typeof QR_TYPE_MAP];
                const Icon = meta?.icon || QrCode;
                return (
                  <Link
                    key={c.id}
                    to="/qr/$id"
                    params={{ id: c.id }}
                    className="p-4 hover:bg-accent/30 flex items-center gap-4 transition-colors"
                  >
                    <div className="size-10 rounded-lg bg-accent grid place-items-center shrink-0">
                      <Icon className="size-4 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{c.name}</span>
                        {c.is_favorite && <Star className="size-3.5 fill-warning text-warning" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{meta?.label} · {c.is_dynamic ? "Dynamic" : "Static"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-semibold">{c.scan_count}</div>
                      <StatusBadge status={c.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: typeof QrCode; accent?: boolean }) {
  return (
    <div className={`p-5 rounded-2xl border shadow-sm ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wider ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</span>
        <Icon className={`size-4 ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`} />
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-success/10 text-success",
    inactive: "bg-muted text-muted-foreground",
    expired: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styles[status] || styles.inactive}`}>
      {status}
    </span>
  );
}
