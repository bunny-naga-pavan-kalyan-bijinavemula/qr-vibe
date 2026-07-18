import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({ meta: [{ title: "Categories — QRSync" }] }),
  component: Categories,
});

function Categories() {
  const { user } = Route.useRouteContext();
  const query = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qr_categories").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [color, setColor] = useState("#4f46e5");

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("qr_categories").insert({ user_id: user.id, name, color });
    if (error) toast.error(error.message);
    else { setName(""); query.refetch(); }
  };

  const remove = async (id: string) => {
    await supabase.from("qr_categories").delete().eq("id", id);
    query.refetch();
  };

  return (
    <div className="flex-1">
      <header className="h-16 border-b bg-card flex items-center px-8">
        <h1 className="text-lg font-bold">Categories</h1>
      </header>
      <div className="p-8 max-w-3xl space-y-6">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add category</Label>
          <div className="flex gap-2 mt-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Business" onKeyDown={(e) => e.key === "Enter" && add()} />
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-14 h-9 p-1" />
            <Button onClick={add}><Plus className="size-4 mr-1.5" />Add</Button>
          </div>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm">
          {(query.data ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No categories yet. Add one above.</p>
            </div>
          ) : (
            <div className="divide-y">
              {(query.data ?? []).map((cat) => (
                <div key={cat.id} className="p-4 flex items-center gap-3">
                  <div className="size-8 rounded-lg" style={{ background: cat.color || "#4f46e5" }} />
                  <span className="font-semibold flex-1">{cat.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => remove(cat.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
