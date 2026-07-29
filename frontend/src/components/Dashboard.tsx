import { useState, useEffect } from "react";
import { api, fmtD, sBadge } from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState({ ac: 0, tp: 0, tc: 0, ls: 0 });
  const [challans, setChallans] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [cR, pR, chR] = await Promise.all([api("/customers?limit=100"), api("/products?limit=100"), api("/challans?limit=20")]);
      const cs = cR.customers || [], ps = pR.products || [], chs = chR.challans || [];
      setStats({ ac: cs.filter(c => c.status === "Active").length, tp: ps.length, tc: chs.length, ls: ps.filter(p => p.current_stock <= p.min_stock_alert).length });
      setChallans(chs.slice(0, 5));
      setFollowups(cs.filter(c => c.follow_up_date).sort((a: any, b: any) => new Date(a.follow_up_date) - new Date(b.follow_up_date)).slice(0, 5));
    } catch (e: any) { console.error(e); }
  }

  return (
    <>
      <div className="page-header"><h1>Dashboard</h1></div>
      <div className="page-body">
        <div className="stats-grid">
          <SC icon="fa-users" bg="var(--accent-light)" fg="var(--accent)" v={stats.ac} l="Active Customers" />
          <SC icon="fa-box" bg="var(--info-light)" fg="var(--info)" v={stats.tp} l="Total Products" />
          <SC icon="fa-file-invoice" bg="var(--warning-light)" fg="var(--warning)" v={stats.tc} l="Sales Challans" />
          <SC icon="fa-exclamation-triangle" bg={stats.ls > 0 ? "var(--danger-light)" : "var(--accent-light)"} fg={stats.ls > 0 ? "var(--danger)" : "var(--accent)"} v={stats.ls} l="Low Stock Alerts" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="table-container">
            <div className="table-header"><h3>Recent Challans</h3></div>
            <table><thead><tr><th>Challan #</th><th>Customer</th><th>Qty</th><th>Status</th></tr></thead><tbody>
              {challans.map(c => <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.challan_number}</td><td>{c.customer_name || "-"}</td><td>{c.total_quantity}</td><td><span className={"badge " + sBadge(c.status)}>{c.status}</span></td></tr>)}
            </tbody></table>
          </div>
          <div className="table-container">
            <div className="table-header"><h3>Follow-ups Due</h3></div>
            {followups.length === 0
              ? <div className="empty-state" style={{ padding: 24 }}><p>No follow-ups pending</p></div>
              : followups.map(f => <div key={f.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}><div style={{ fontSize: 13, marginBottom: 2 }}>{f.name}</div><div style={{ fontSize: 12, color: "var(--fg-secondary)", marginBottom: 4 }}>{f.notes || "-"}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Due: {fmtD(f.follow_up_date)}</div></div>)
            }
          </div>
        </div>
      </div>
    </>
  );
}

function SC({ icon, bg, fg, v, l }: { icon: string; bg: string; fg: string; v: number; l: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg, color: fg }}><i className={"fas " + icon}></i></div>
      <div className="stat-value">{v}</div>
      <div className="stat-label">{l}</div>
    </div>
  );
}
