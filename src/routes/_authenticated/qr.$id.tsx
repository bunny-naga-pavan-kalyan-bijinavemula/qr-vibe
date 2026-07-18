import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { QR_TYPE_MAP, type QRDesign } from "@/lib/qr-types";
import { buildQRValue } from "@/lib/qr-content";
import { QRPreview } from "@/components/qr/QRPreview";
import { QRTypeForm } from "@/components/qr/QRTypeForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Star, Copy } from "lucide-react";
import { StatusBadge } from "./dashboard";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { parseUA } from "@/lib/parse-ua";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/qr/$id")({
  head: () => ({ meta: [{ title: "Edit QR — QRSync" }] }),
  component: QRDetail,
});

function QRDetail() {
  const { id } = Route.useParams();
  const router = useRouter();

  const query = useQuery({
    queryKey: ["qr", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("qr_codes").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const scansQuery = useQuery({
    queryKey: ["qr-scans", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("qr_scans").select("*").eq("qr_id", id).order("scanned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [design, setDesign] = useState<QRDesign>({});

  useEffect(() => {
    if (query.data) {
      setName(query.data.name);
      setContent((query.data.content as Record<string, unknown>) || {});
      setDesign((query.data.design as QRDesign) || {});
    }
  }, [query.data]);

  if (query.isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!query.data) return <div className="p-8 text-muted-foreground">Not found</div>;

  const c = query.data;
  const meta = QR_TYPE_MAP[c.type as keyof typeof QR_TYPE_MAP];
  const scans = scansQuery.data ?? [];

  const value = c.is_dynamic
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${c.short_code}`
    : buildQRValue(c.type, content);

  const save = async () => {
    const { error } = await supabase.from("qr_codes").update({ name, content: content as never, design: design as never }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); query.refetch(); }
  };

  const toggleFavorite = async () => {
    await supabase.from("qr_codes").update({ is_favorite: !c.is_favorite }).eq("id", id);
    query.refetch();
  };

  const remove = async () => {
    if (!confirm("Delete this QR code?")) return;
    await supabase.from("qr_codes").delete().eq("id", id);
    router.navigate({ to: "/qr-codes" });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(value);
    toast.success("Link copied");
  };

  // Analytics
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  scans.forEach((s) => {
    deviceCounts[s.device || "Unknown"] = (deviceCounts[s.device || "Unknown"] || 0) + 1;
    browserCounts[s.browser || "Unknown"] = (browserCounts[s.browser || "Unknown"] || 0) + 1;
  });
  const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }));
  const browserData = Object.entries(browserCounts).map(([name, value]) => ({ name, value }));

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    return {
      date: format(d, "MMM d"),
      scans: scans.filter((s) => format(new Date(s.scanned_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd")).length,
    };
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-16 border-b bg-card flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()}><ArrowLeft className="size-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{c.name}</span>
              <StatusBadge status={c.status} />
              {c.is_dynamic && <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">Dynamic</span>}
            </div>
            <p className="text-xs text-muted-foreground">{meta?.label} · {c.scan_count} scans</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={toggleFavorite}>
            <Star className={`size-4 ${c.is_favorite ? "fill-warning text-warning" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={copyLink}><Copy className="size-4" /></Button>
          <Button variant="outline" size="icon" onClick={remove}><Trash2 className="size-4 text-destructive" /></Button>
          <Button onClick={save}><Save className="size-4 mr-1.5" />Save</Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="edit" className="p-8">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="analytics">Analytics ({scans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
                </div>
                <QRTypeForm type={c.type as never} content={content} onChange={setContent} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Foreground</Label>
                    <Input type="color" value={design.fg || "#0f172a"} onChange={(e) => setDesign({ ...design, fg: e.target.value })} className="mt-1 h-10" />
                  </div>
                  <div>
                    <Label className="text-xs">Background</Label>
                    <Input type="color" value={design.bg || "#ffffff"} onChange={(e) => setDesign({ ...design, bg: e.target.value })} className="mt-1 h-10" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <QRPreview value={value} design={design} name={c.name} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MiniStat label="Total scans" value={c.scan_count} />
              <MiniStat label="Last 7 days" value={days.slice(-7).reduce((s, d) => s + d.scans, 0)} />
              <MiniStat label="Devices" value={Object.keys(deviceCounts).length} />
              <MiniStat label="Browsers" value={Object.keys(browserCounts).length} />
            </div>

            <div className="bg-card border rounded-2xl p-6">
              <h3 className="font-bold mb-4">Scans over time</h3>
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={days}>
                    <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                    <Bar dataKey="scans" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border rounded-2xl p-6">
                <h3 className="font-bold mb-4">By device</h3>
                {deviceData.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : (
                  <div className="space-y-3">
                    {deviceData.map((d) => (
                      <div key={d.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{d.name}</span>
                          <span className="font-mono font-semibold">{d.value}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(d.value / scans.length) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-card border rounded-2xl p-6">
                <h3 className="font-bold mb-4">By browser</h3>
                {browserData.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : (
                  <div className="space-y-3">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-mono font-bold mt-1">{value}</div>
    </div>
  );
}
