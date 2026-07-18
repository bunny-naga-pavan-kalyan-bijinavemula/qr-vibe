import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QR_TYPES, QR_TYPE_MAP, DEFAULT_DESIGN, type QRType, type QRDesign } from "@/lib/qr-types";
import { buildQRValue, generateShortCode } from "@/lib/qr-content";
import { QRPreview } from "@/components/qr/QRPreview";
import { QRTypeForm } from "@/components/qr/QRTypeForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/qr/new")({
  head: () => ({ meta: [{ title: "Create QR — QRSync" }] }),
  component: NewQR,
});

function NewQR() {
  const router = useRouter();
  const [name, setName] = useState("Untitled QR");
  const [type, setType] = useState<QRType>("url");
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [design, setDesign] = useState<QRDesign>(DEFAULT_DESIGN);
  const [isDynamic, setIsDynamic] = useState(false);
  const [expiry, setExpiry] = useState<string>("never");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const meta = QR_TYPE_MAP[type];

  const shortCode = useMemo(() => generateShortCode(), []);
  const dynamicRedirectUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/r/${shortCode}`;
  const value = useMemo(() => {
    if (isDynamic && meta.supportsDynamic) return dynamicRedirectUrl;
    return buildQRValue(type, content);
  }, [type, content, isDynamic, meta.supportsDynamic, dynamicRedirectUrl]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const expiresAt =
        expiry === "never" ? null :
        expiry === "1d" ? new Date(Date.now() + 86400000).toISOString() :
        expiry === "7d" ? new Date(Date.now() + 7 * 86400000).toISOString() :
        new Date(Date.now() + 30 * 86400000).toISOString();

      const { data, error } = await supabase.from("qr_codes").insert({
        user_id: userData.user.id,
        name,
        type,
        content: content as never,
        design: design as never,
        is_dynamic: isDynamic && meta.supportsDynamic,
        short_code: isDynamic && meta.supportsDynamic ? shortCode : null,
        expires_at: expiresAt,
        password_hash: password ? btoa(password) : null,
      }).select().single();

      if (error) throw error;
      toast.success("QR code created");
      router.navigate({ to: "/qr/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-16 border-b bg-card flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()}><ArrowLeft className="size-4" /></Button>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs font-semibold" />
        </div>
        <Button onClick={save} disabled={saving}><Save className="size-4 mr-1.5" />{saving ? "Saving..." : "Save QR"}</Button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-auto">
        <div className="lg:col-span-3 p-8 space-y-6 border-r">
          <section>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">1. QR Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {QR_TYPES.map((t) => {
                const Icon = t.icon;
                const active = t.id === type;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setType(t.id); setContent({}); }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${active ? "border-primary bg-accent/50" : "border-border hover:border-muted-foreground/40"}`}
                  >
                    <Icon className={`size-5 mb-1.5 ${active ? "text-primary" : t.color}`} />
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{t.description}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">2. Content</Label>
            <QRTypeForm type={type} content={content} onChange={setContent} />
          </section>

          <section className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">3. Design</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Foreground</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input type="color" value={design.fg} onChange={(e) => setDesign({ ...design, fg: e.target.value })} className="w-14 h-9 p-1" />
                  <Input value={design.fg} onChange={(e) => setDesign({ ...design, fg: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Background</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input type="color" value={design.bg} onChange={(e) => setDesign({ ...design, bg: e.target.value })} className="w-14 h-9 p-1" />
                  <Input value={design.bg} onChange={(e) => setDesign({ ...design, bg: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Error correction</Label>
                <Select value={design.level} onValueChange={(v) => setDesign({ ...design, level: v as "L" | "M" | "Q" | "H" })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Low (7%)</SelectItem>
                    <SelectItem value="M">Medium (15%)</SelectItem>
                    <SelectItem value="Q">Quartile (25%)</SelectItem>
                    <SelectItem value="H">High (30%) — recommended with logo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Logo URL (optional)</Label>
                <Input value={design.logo || ""} onChange={(e) => setDesign({ ...design, logo: e.target.value })} className="mt-1" placeholder="https://..." />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">4. Advanced</Label>
            {meta.supportsDynamic && (
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="font-semibold">Dynamic QR</Label>
                  <p className="text-xs text-muted-foreground">Edit destination later without reprinting.</p>
                </div>
                <Switch checked={isDynamic} onCheckedChange={setIsDynamic} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Expiry</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="1d">1 day</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Password (optional)</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" placeholder="Leave empty for none" />
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 p-8 bg-surface flex flex-col items-center justify-start sticky top-16">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Live Preview</div>
          <QRPreview value={value} design={design} name={name} size={280} />
          <div className="mt-6 text-xs text-muted-foreground text-center max-w-xs break-all font-mono bg-card p-3 rounded-lg border">
            {value || "Fill in content to preview"}
          </div>
        </div>
      </div>
    </div>
  );
}
