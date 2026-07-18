import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { QR_TYPES, QR_TYPE_MAP } from "@/lib/qr-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Star, QrCode, Copy, Trash2, MoreHorizontal } from "lucide-react";
import { StatusBadge } from "./dashboard";
import { toast } from "sonner";
import { z } from "zod";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const search = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  favorite: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/qr-codes")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "My QR Codes — QRSync" }] }),
  component: List,
});

function List() {
  const sp = Route.useSearch();
  const router = useRouter();
  const [q, setQ] = useState(sp.q || "");
  const [type, setType] = useState(sp.type || "all");
  const [status, setStatus] = useState(sp.status || "all");

  const query = useQuery({
    queryKey: ["qr-codes-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qr_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const codes = query.data ?? [];

  const filtered = useMemo(() => {
    return codes.filter((c) => {
      if (sp.favorite === "1" && !c.is_favorite) return false;
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (type !== "all" && c.type !== type) return false;
      if (status !== "all" && c.status !== status) return false;
      return true;
    });
  }, [codes, q, type, status, sp.favorite]);

  const toggleFavorite = async (id: string, current: boolean) => {
    await supabase.from("qr_codes").update({ is_favorite: !current }).eq("id", id);
    query.refetch();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this QR code? This cannot be undone.")) return;
    const { error } = await supabase.from("qr_codes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); query.refetch(); }
  };

  const duplicate = async (id: string) => {
    const orig = codes.find((c) => c.id === id);
    if (!orig) return;
    const { id: _id, created_at, updated_at, scan_count, short_code, ...rest } = orig;
    const { error } = await supabase.from("qr_codes").insert({
      ...rest,
      name: `${orig.name} (copy)`,
      scan_count: 0,
    });
    if (error) toast.error(error.message);
    else { toast.success("Duplicated"); query.refetch(); }
  };

  return (
    <div className="flex-1">
      <header className="h-16 border-b bg-card flex items-center justify-between px-8">
        <h1 className="text-lg font-bold">{sp.favorite === "1" ? "Favorites" : "My QR Codes"}</h1>
        <Link to="/qr/new"><Button size="sm"><Plus className="size-4 mr-1.5" />Create QR</Button></Link>
      </header>

      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name..." className="pl-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {QR_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {query.isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border rounded-2xl p-16 text-center">
            <QrCode className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold">No QR codes match</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or create your first code.</p>
            <Link to="/qr/new" className="inline-block mt-4"><Button size="sm"><Plus className="size-4 mr-1.5" />Create QR</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const meta = QR_TYPE_MAP[c.type as keyof typeof QR_TYPE_MAP];
              const Icon = meta?.icon || QrCode;
              return (
                <div key={c.id} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="size-10 rounded-lg bg-accent grid place-items-center">
                      <Icon className="size-5 text-accent-foreground" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleFavorite(c.id, c.is_favorite)} className="p-1.5 hover:bg-accent rounded">
                        <Star className={`size-4 ${c.is_favorite ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 hover:bg-accent rounded"><MoreHorizontal className="size-4 text-muted-foreground" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => duplicate(c.id)}><Copy className="size-4 mr-2" />Duplicate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => remove(c.id)} className="text-destructive"><Trash2 className="size-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <Link to="/qr/$id" params={{ id: c.id }}>
                    <h3 className="font-bold truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta?.label} · {c.is_dynamic ? "Dynamic" : "Static"}</p>
                  </Link>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div>
                      <div className="text-xl font-mono font-bold">{c.scan_count}</div>
                      <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Scans</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
