import type { LucideIcon } from "lucide-react";
import {
  Link as LinkIcon,
  Globe,
  Layers,
  Contact,
  MessageCircle,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  IndianRupee,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Type,
  Wifi,
} from "lucide-react";

export type QRType =
  | "url"
  | "website"
  | "multi_link"
  | "vcard"
  | "whatsapp"
  | "phone"
  | "email"
  | "sms"
  | "maps"
  | "upi"
  | "pdf"
  | "image"
  | "video"
  | "file"
  | "text"
  | "wifi";

export interface QRTypeMeta {
  id: QRType;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  supportsDynamic: boolean;
}

export const QR_TYPES: QRTypeMeta[] = [
  { id: "url", label: "URL / Link", description: "Any web link", icon: LinkIcon, color: "text-primary", supportsDynamic: true },
  { id: "website", label: "Website", description: "Website homepage", icon: Globe, color: "text-primary", supportsDynamic: true },
  { id: "multi_link", label: "Multi-Link", description: "Linktree-style page", icon: Layers, color: "text-primary", supportsDynamic: true },
  { id: "vcard", label: "Digital Card", description: "vCard business card", icon: Contact, color: "text-primary", supportsDynamic: true },
  { id: "whatsapp", label: "WhatsApp", description: "Pre-filled chat", icon: MessageCircle, color: "text-success", supportsDynamic: false },
  { id: "phone", label: "Phone Call", description: "Tap to call", icon: Phone, color: "text-primary", supportsDynamic: false },
  { id: "email", label: "Email", description: "Compose email", icon: Mail, color: "text-primary", supportsDynamic: false },
  { id: "sms", label: "SMS", description: "Pre-filled SMS", icon: MessageSquare, color: "text-primary", supportsDynamic: false },
  { id: "maps", label: "Google Maps", description: "Location pin", icon: MapPin, color: "text-destructive", supportsDynamic: false },
  { id: "upi", label: "UPI Payment", description: "Indian UPI QR", icon: IndianRupee, color: "text-upi", supportsDynamic: false },
  { id: "pdf", label: "PDF", description: "Uploaded document", icon: FileText, color: "text-primary", supportsDynamic: true },
  { id: "image", label: "Image", description: "Uploaded image", icon: ImageIcon, color: "text-primary", supportsDynamic: true },
  { id: "video", label: "Video", description: "Video link", icon: Video, color: "text-primary", supportsDynamic: true },
  { id: "file", label: "File", description: "Any uploaded file", icon: File, color: "text-primary", supportsDynamic: true },
  { id: "text", label: "Plain Text", description: "Static message", icon: Type, color: "text-primary", supportsDynamic: false },
  { id: "wifi", label: "Wi-Fi", description: "Connect to network", icon: Wifi, color: "text-primary", supportsDynamic: false },
];

export const QR_TYPE_MAP: Record<QRType, QRTypeMeta> = QR_TYPES.reduce(
  (m, t) => ({ ...m, [t.id]: t }),
  {} as Record<QRType, QRTypeMeta>,
);

export interface QRDesign {
  fg?: string;
  bg?: string;
  level?: "L" | "M" | "Q" | "H";
  logo?: string;
  logoSize?: number;
}

export const DEFAULT_DESIGN: QRDesign = {
  fg: "#0f172a",
  bg: "#ffffff",
  level: "M",
  logoSize: 48,
};
