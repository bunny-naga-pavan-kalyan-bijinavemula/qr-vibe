import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import type { QRType } from "@/lib/qr-types";

interface Props {
  type: QRType;
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export function QRTypeForm({ type, content, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...content, [k]: v });
  const g = (k: string) => (content[k] as string) ?? "";

  switch (type) {
    case "url":
    case "website":
      return (
        <Field label="Destination URL">
          <Input value={g("url")} onChange={(e) => set("url", e.target.value)} placeholder="https://example.com" />
        </Field>
      );
    case "multi_link": {
      const links = (content.links as { label: string; url: string }[]) || [];
      return (
        <div className="space-y-3">
          <Field label="Page title">
            <Input value={g("title")} onChange={(e) => set("title", e.target.value)} placeholder="My Links" />
          </Field>
          <Field label="Bio">
            <Textarea value={g("bio")} onChange={(e) => set("bio", e.target.value)} placeholder="Short intro" rows={2} />
          </Field>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Links</Label>
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Label" value={l.label} onChange={(e) => {
                  const next = [...links];
                  next[i] = { ...next[i], label: e.target.value };
                  set("links", next);
                }} />
                <Input placeholder="URL" value={l.url} onChange={(e) => {
                  const next = [...links];
                  next[i] = { ...next[i], url: e.target.value };
                  set("links", next);
                }} />
                <Button variant="ghost" size="icon" onClick={() => set("links", links.filter((_, j) => j !== i))}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => set("links", [...links, { label: "", url: "" }])}>
              <Plus className="size-4 mr-1" />Add link
            </Button>
          </div>
        </div>
      );
    }
    case "vcard":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><Input value={g("firstName")} onChange={(e) => set("firstName", e.target.value)} /></Field>
          <Field label="Last name"><Input value={g("lastName")} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <Field label="Organization"><Input value={g("org")} onChange={(e) => set("org", e.target.value)} /></Field>
          <Field label="Job title"><Input value={g("title")} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Phone"><Input value={g("phone")} onChange={(e) => set("phone", e.target.value)} placeholder="+91..." /></Field>
          <Field label="Email"><Input value={g("email")} onChange={(e) => set("email", e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Website"><Input value={g("website")} onChange={(e) => set("website", e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Address"><Input value={g("address")} onChange={(e) => set("address", e.target.value)} /></Field></div>
        </div>
      );
    case "whatsapp":
      return (
        <>
          <Field label="Phone (with country code, no +)"><Input value={g("phone")} onChange={(e) => set("phone", e.target.value)} placeholder="919876543210" /></Field>
          <Field label="Pre-filled message"><Textarea value={g("message")} onChange={(e) => set("message", e.target.value)} rows={3} /></Field>
        </>
      );
    case "phone":
      return <Field label="Phone number"><Input value={g("phone")} onChange={(e) => set("phone", e.target.value)} placeholder="+91..." /></Field>;
    case "email":
      return (
        <>
          <Field label="Recipient email"><Input value={g("email")} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Subject"><Input value={g("subject")} onChange={(e) => set("subject", e.target.value)} /></Field>
          <Field label="Body"><Textarea value={g("body")} onChange={(e) => set("body", e.target.value)} rows={3} /></Field>
        </>
      );
    case "sms":
      return (
        <>
          <Field label="Phone"><Input value={g("phone")} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Message"><Textarea value={g("message")} onChange={(e) => set("message", e.target.value)} rows={3} /></Field>
        </>
      );
    case "maps":
      return (
        <>
          <Field label="Address or place name"><Input value={g("query")} onChange={(e) => set("query", e.target.value)} placeholder="MG Road, Bengaluru" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude (optional)"><Input value={g("lat")} onChange={(e) => set("lat", e.target.value)} /></Field>
            <Field label="Longitude (optional)"><Input value={g("lng")} onChange={(e) => set("lng", e.target.value)} /></Field>
          </div>
        </>
      );
    case "upi":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Payee UPI ID (VPA)"><Input value={g("pa")} onChange={(e) => set("pa", e.target.value)} placeholder="name@bank" /></Field></div>
          <div className="col-span-2"><Field label="Payee Name"><Input value={g("pn")} onChange={(e) => set("pn", e.target.value)} placeholder="Business Name" /></Field></div>
          <Field label="Amount ₹ (optional)"><Input value={g("am")} onChange={(e) => set("am", e.target.value)} type="number" step="0.01" /></Field>
          <Field label="Currency"><Input value={g("cu") || "INR"} onChange={(e) => set("cu", e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Note (optional)"><Input value={g("tn")} onChange={(e) => set("tn", e.target.value)} /></Field></div>
        </div>
      );
    case "pdf":
    case "image":
    case "video":
    case "file":
      return <Field label="File URL"><Input value={g("url")} onChange={(e) => set("url", e.target.value)} placeholder="https://..." /></Field>;
    case "text":
      return <Field label="Text"><Textarea value={g("text")} onChange={(e) => set("text", e.target.value)} rows={4} /></Field>;
    case "wifi":
      return (
        <>
          <Field label="Network name (SSID)"><Input value={g("ssid")} onChange={(e) => set("ssid", e.target.value)} /></Field>
          <Field label="Password"><Input value={g("password")} onChange={(e) => set("password", e.target.value)} type="password" /></Field>
          <Field label="Encryption">
            <Select value={g("encryption") || "WPA"} onValueChange={(v) => set("encryption", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WPA">WPA / WPA2</SelectItem>
                <SelectItem value="WEP">WEP</SelectItem>
                <SelectItem value="nopass">None</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );
    default:
      return null;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
