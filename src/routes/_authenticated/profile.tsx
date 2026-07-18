import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — QRSync" }] }),
  component: Profile,
});

function Profile() {
  const { user } = Route.useRouteContext();
  const query = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data) {
      setDisplayName(query.data.display_name || "");
      setAvatarUrl(query.data.avatar_url || "");
      setPhone(query.data.phone || "");
    }
  }, [query.data]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl || null,
      phone: phone || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Profile saved"); query.refetch(); }
  };

  return (
    <div className="flex-1">
      <header className="h-16 border-b bg-card flex items-center px-8">
        <h1 className="text-lg font-bold">Profile</h1>
      </header>
      <div className="p-8 max-w-2xl">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="size-16 rounded-2xl bg-accent grid place-items-center overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} className="size-full object-cover" alt="" /> : <User className="size-8 text-accent-foreground" />}
            </div>
            <div>
              <div className="font-bold">{displayName || "User"}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Avatar URL</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="mt-1.5" placeholder="https://..." />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" placeholder="+91..." />
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
