import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { QrCode, Zap, BarChart3, Palette, Shield, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "QRSync — Professional QR Codes for Business" },
      { name: "description", content: "Generate, customize, and track dynamic QR codes for UPI, WhatsApp, vCards, websites, and more. Real-time analytics, custom branding, unlimited scans." },
      { property: "og:title", content: "QRSync — Professional QR Codes for Business" },
      { property: "og:description", content: "Startup-grade QR code SaaS with dynamic links, analytics, UPI, WhatsApp, vCards and 15+ types." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Zap, title: "Dynamic QRs", desc: "Change destination without reprinting." },
  { icon: BarChart3, title: "Scan Analytics", desc: "Device, browser, and time insights." },
  { icon: Palette, title: "Full Customization", desc: "Colors, logo, corner styles, frames." },
  { icon: Layers, title: "16+ QR Types", desc: "UPI, WhatsApp, vCard, Wi-Fi, Maps and more." },
  { icon: Shield, title: "Password Protected", desc: "Gate sensitive links behind a passcode." },
  { icon: QrCode, title: "Bulk Downloads", desc: "PNG, SVG, PDF — single or ZIP." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-8 bg-primary rounded-lg grid place-items-center text-primary-foreground font-bold">Q</div>
            <span className="font-bold tracking-tight text-lg">QRSync</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" }}><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-accent/50 text-xs font-semibold text-accent-foreground mb-6">
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
          Now with UPI Payment QR
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">
          Professional QR codes.<br />
          <span className="text-primary">Real analytics.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
          Generate branded dynamic QR codes for websites, UPI payments, WhatsApp, vCards, Wi-Fi and more.
          Track every scan by device, browser, and time.
        </p>
        <div className="mt-10 flex gap-3 justify-center">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="h-12 px-6">Start free</Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="h-12 px-6">Sign in</Button>
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-2xl border bg-card shadow-sm">
              <div className="size-10 rounded-lg bg-accent grid place-items-center text-accent-foreground mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 QRSync</span>
          <span>Built with Lovable</span>
        </div>
      </footer>
    </div>
  );
}
