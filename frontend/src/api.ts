const API = (import.meta as any).env.VITE_API_URL || "http://localhost:5000/api";

export async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("erp_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(API + path, { ...options, headers: { ...headers, ...(options.headers as any) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function fmtD(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

export function fmtDT(d: string | null) {
  if (!d) return "-";
  const x = new Date(d);
  return x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + " " + x.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function fmtC(a: number) {
  return "\u20B9" + Number(a).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

export function sBadge(s: string) {
  return ({ Active: "badge-active", Lead: "badge-lead", Inactive: "badge-inactive", Draft: "badge-draft", Confirmed: "badge-confirmed", Cancelled: "badge-cancelled" } as any)[s] || "";
}

export function tBadge(t: string) {
  return ({ Retail: "badge-retail", Wholesale: "badge-wholesale", Distributor: "badge-distributor" } as any)[t] || "";
}

export function toast(msg: string, type = "success") {
  let c = document.getElementById("toast-container");
  if (!c) { c = document.createElement("div"); c.id = "toast-container"; c.className = "toast-container"; document.body.appendChild(c); }
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
