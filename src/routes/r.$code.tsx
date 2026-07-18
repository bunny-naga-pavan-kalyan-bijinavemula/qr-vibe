import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildQRValue } from "@/lib/qr-content";
import { parseUA } from "@/lib/parse-ua";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/r/$code")({
  ssr: false,
  head: () => ({ meta: [{ title: "Redirecting..." }, { name: "robots", content: "noindex" }] }),
  component: RedirectPage,
});

function RedirectPage() {
  const { code } = Route.useParams();
  const [state, setState] = useState<"loading" | "password" | "redirecting" | "expired" | "notfound">("loading");
  const [qr, setQr] = useState<{ id: string; type: string; content: Record<string, unknown>; password_hash: string | null } | null>(null);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qr_codes")
        .select("id, type, content, password_hash, status, expires_at")
        .eq("short_code", code)
        .maybeSingle();
      if (!data) { setState("notfound"); return; }
      if (data.status === "expired" || (data.expires_at && new Date(data.expires_at) < new Date())) { setState("expired"); return; }
      setQr(data as never);
      if (data.password_hash) setState("password");
      else await proceed(data as never);
    })();
  }, [code]);

  const recordScan = async (qrId: string) => {
    const ua = navigator.userAgent;
    const { device, browser, os } = parseUA(ua);
    await supabase.from("qr_scans").insert({
      qr_id: qrId,
      device,
      browser,
      os,
      referrer: document.referrer || null,
    });
  };

  const proceed = async (data: { id: string; type: string; content: Record<string, unknown> }) => {
    setState("redirecting");
    await recordScan(data.id);
    const target = buildQRValue(data.type as never, data.content);
    if (target && /^https?:|^tel:|^mailto:|^sms:|^upi:|^geo:/.test(target)) {
      window.location.href = target;
    }
  };

  const submitPw = () => {
    if (!qr) return;
    if (btoa(pw) === qr.password_hash) proceed(qr);
    else setPwError("Incorrect password");
  };

  if (state === "notfound") return <Centered title="QR not found" desc="This link doesn't exist or has been removed." />;
  if (state === "expired") return <Centered title="QR expired" desc="This QR code is no longer active." />;

  if (state === "password") {
    return (
      <div className="min-h-screen grid place-items-center p-4 bg-surface">
        <div className="max-w-sm w-full bg-card border rounded-2xl p-8 shadow-sm">
          <div className="size-12 mx-auto rounded-xl bg-accent grid place-items-center mb-4"><Lock className="size-6 text-accent-foreground" /></div>
          <h1 className="text-xl font-bold text-center">Password required</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Enter the password to continue.</p>
          <Input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setPwError(null); }} className="mt-5" onKeyDown={(e) => e.key === "Enter" && submitPw()} />
          {pwError && <p className="text-xs text-destructive mt-1">{pwError}</p>}
          <Button onClick={submitPw} className="w-full mt-3">Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface">
      <div className="text-center">
        <div className="size-12 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    </div>
  );
}

function Centered({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-surface">
      <div className="max-w-sm text-center">
        <div className="size-12 mx-auto rounded-xl bg-muted grid place-items-center mb-4"><ExternalLink className="size-6 text-muted-foreground" /></div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
    </div>
  );
}
