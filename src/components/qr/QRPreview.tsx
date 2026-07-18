import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { QRDesign } from "@/lib/qr-types";
import QRCodeLib from "qrcode";

interface Props {
  value: string;
  design?: QRDesign;
  size?: number;
  name?: string;
  showActions?: boolean;
}

export function QRPreview({ value, design, size = 256, name = "qr-code", showActions = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const fg = design?.fg || "#0f172a";
  const bg = design?.bg || "#ffffff";
  const level = design?.level || "M";
  const safeValue = value || " ";

  const downloadPNG = () => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadSVG = async () => {
    const svg = await QRCodeLib.toString(safeValue, {
      type: "svg",
      color: { dark: fg, light: bg },
      errorCorrectionLevel: level,
      margin: 2,
      width: 512,
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = `${name}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const downloadPDF = async () => {
    const dataUrl = await QRCodeLib.toDataURL(safeValue, {
      color: { dark: fg, light: bg },
      errorCorrectionLevel: level,
      margin: 2,
      width: 512,
    });
    // Minimal PDF wrapper — embed PNG.
    const win = window.open("");
    if (!win) return;
    win.document.write(`<html><head><title>${name}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUrl}" style="max-width:80vw"></body></html>`);
    win.print();
  };

  const copyValue = async () => {
    await navigator.clipboard.writeText(safeValue);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={wrapRef}
        className="p-6 rounded-2xl border shadow-sm relative"
        style={{ background: bg }}
      >
        <QRCodeCanvas
          value={safeValue}
          size={size}
          fgColor={fg}
          bgColor={bg}
          level={level}
          imageSettings={
            design?.logo
              ? {
                  src: design.logo,
                  height: design.logoSize || 48,
                  width: design.logoSize || 48,
                  excavate: true,
                }
              : undefined
          }
        />
      </div>
      {showActions && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={downloadPNG} size="sm"><Download className="size-4 mr-1.5" />PNG</Button>
          <Button onClick={downloadSVG} size="sm" variant="outline"><Download className="size-4 mr-1.5" />SVG</Button>
          <Button onClick={downloadPDF} size="sm" variant="outline"><Download className="size-4 mr-1.5" />PDF</Button>
          <Button onClick={copyValue} size="sm" variant="outline">
            {copied ? <Check className="size-4 mr-1.5" /> : <Copy className="size-4 mr-1.5" />}
            Copy
          </Button>
        </div>
      )}
    </div>
  );
}
