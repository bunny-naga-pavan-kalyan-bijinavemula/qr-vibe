// Tiny UA parser for scan analytics
export function parseUA(ua: string) {
  const s = ua.toLowerCase();
  const device = /mobile|android|iphone|ipad/.test(s) ? (/ipad/.test(s) ? "Tablet" : "Mobile") : "Desktop";
  let os = "Other";
  if (/windows/.test(s)) os = "Windows";
  else if (/android/.test(s)) os = "Android";
  else if (/iphone|ipad|ipod/.test(s)) os = "iOS";
  else if (/mac os/.test(s)) os = "macOS";
  else if (/linux/.test(s)) os = "Linux";
  let browser = "Other";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/chrome\//.test(s) && !/edg\//.test(s)) browser = "Chrome";
  else if (/firefox/.test(s)) browser = "Firefox";
  else if (/safari/.test(s) && !/chrome/.test(s)) browser = "Safari";
  return { device, os, browser };
}
