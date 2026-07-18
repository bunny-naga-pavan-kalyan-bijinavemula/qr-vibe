import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { QR_TYPE_MAP } from "@/lib/qr-types";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — QRSync" }] }),
  component: Analytics,
});

function Analytics() {
  const codesQ = useQuery({
    queryKey: ["analytics-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qr_codes").select("id, name, type, scan_count");
      if (error) throw error;
      return data;
    },
  });
  const scansQ = useQuery({
    queryKey: ["analytics-scans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qr_scans").select("device, browser, os, scanned_at").gte("scanned_at", subDays(new Date(), 60).toISOString());
      if (error) throw error;
      return data;
    },
  });

  const codes = codesQ.data ?? [];
  const scans = scansQ.data ?? [];

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    return {
      date: format(d, "MMM d"),
      scans: scans.filter((s) => format(new Date(s.scanned_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd")).length,
    };
  });

  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  scans.forEach((s) => {
    deviceCounts[s.device || "Unknown"] = (deviceCounts[s.device || "Unknown"] || 0) + 1;
    browserCounts[s.browser || "Unknown"] = (browserCounts[s.browser || "Unknown"] || 0) + 1;
  });
  const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }));
  const browserData = Object.entries(browserCounts).map(([name, value]) => ({ name, value }));
  const topCodes = [...codes].sort((a, b) => b.scan_count - a.scan_count).slice(0, 8);
  const colors = ["#4f46e5", "#059669", "#f59e0b", "#e11d48", "#0891b2"];

  return (
    <div className="flex-1">
      <header className="h-16 border-b bg-card flex items-center px-8">
        <h1 className="text-lg font-bold">Analytics</h1>
      </header>
      <div className="p-8 space-y-6">
        <div className="bg-card border rounded-2xl p-6">
          <h3 className="font-bold mb-4">Scans over 30 days</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={days}>
                <XAxis dataKey="date" fontSize={10} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} interval={2} />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                <Bar dataKey="scans" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border rounded-2xl p-6">
            <h3 className="font-bold mb-4">Devices</h3>
            {deviceData.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : (
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={deviceData} innerRadius={50} outerRadius={80} dataKey="value" label>
                      {deviceData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="bg-card border rounded-2xl p-6">
            <h3 className="font-bold mb-4">Browsers</h3>
            {browserData.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : (
              <div className="space-y-3 pt-2">
                {browserData.map((d) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{d.name}</span>
                      <span className="font-mono font-semibold">{d.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-success" style={{ width: `${(d.value / scans.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6">
          <h3 className="font-bold mb-4">Top QR Codes</h3>
          {topCodes.length === 0 ? <p className="text-sm text-muted-foreground">No QR codes yet</p> : (
            <div className="space-y-2">
              {topCodes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-2">
                  <div className="text-sm flex-1">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{QR_TYPE_MAP[c.type as keyof typeof QR_TYPE_MAP]?.label}</div>
                  </div>
                  <div className="text-lg font-mono font-bold">{c.scan_count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
