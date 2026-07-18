import type { QRType } from "./qr-types";

// Build the string value that gets encoded into the QR image, given a type + content payload.
export function buildQRValue(type: QRType, content: Record<string, unknown>): string {
  const s = (k: string) => String(content[k] ?? "");
  switch (type) {
    case "url":
    case "website":
      return s("url");
    case "multi_link":
      // dynamic-only: uses short_code redirect; caller should pass redirectUrl.
      return s("redirectUrl");
    case "vcard": {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${s("firstName")} ${s("lastName")}`.trim(),
        s("org") && `ORG:${s("org")}`,
        s("title") && `TITLE:${s("title")}`,
        s("phone") && `TEL;TYPE=CELL:${s("phone")}`,
        s("email") && `EMAIL:${s("email")}`,
        s("website") && `URL:${s("website")}`,
        s("address") && `ADR:;;${s("address")};;;;`,
        "END:VCARD",
      ].filter(Boolean);
      return lines.join("\n");
    }
    case "whatsapp": {
      const phone = s("phone").replace(/[^\d]/g, "");
      const text = encodeURIComponent(s("message"));
      return `https://wa.me/${phone}${text ? `?text=${text}` : ""}`;
    }
    case "phone":
      return `tel:${s("phone")}`;
    case "email": {
      const subject = encodeURIComponent(s("subject"));
      const body = encodeURIComponent(s("body"));
      const q = [subject && `subject=${subject}`, body && `body=${body}`].filter(Boolean).join("&");
      return `mailto:${s("email")}${q ? `?${q}` : ""}`;
    }
    case "sms": {
      const body = encodeURIComponent(s("message"));
      return `sms:${s("phone")}${body ? `?body=${body}` : ""}`;
    }
    case "maps": {
      if (content.lat && content.lng) return `geo:${content.lat},${content.lng}`;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s("query"))}`;
    }
    case "upi": {
      const params = new URLSearchParams();
      if (content.pa) params.set("pa", s("pa"));
      if (content.pn) params.set("pn", s("pn"));
      if (content.am) params.set("am", s("am"));
      if (content.cu) params.set("cu", s("cu") || "INR");
      else params.set("cu", "INR");
      if (content.tn) params.set("tn", s("tn"));
      return `upi://pay?${params.toString()}`;
    }
    case "pdf":
    case "image":
    case "video":
    case "file":
      return s("url");
    case "text":
      return s("text");
    case "wifi": {
      const enc = s("encryption") || "WPA";
      return `WIFI:T:${enc};S:${s("ssid")};P:${s("password")};;`;
    }
    default:
      return "";
  }
}

export function generateShortCode(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}
