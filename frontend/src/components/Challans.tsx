import { useState, useEffect } from "react";
import { api, fmtD, fmtC, sBadge, toast } from "../api";
import Modal from "./Modal";

export default function Challans() {
  const [challans, setChallans] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [lineItems, setLineItems] = useState<any[]>([]);

  useEffect(() => { loadList(); }, [search, filter]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId]);

  async function loadList() {
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (filter !== "all") p.set("status", filter);
      const d = await api("/challans?" + p);
      setChallans(d.challans || []);
    } catch (e: any) { toast(e.message, "error"); }
  }

  async function loadDetail(id: number) {
    try { const d = await api("/challans/" + id); setDetail(d); }
    catch (e: any) { toast(e.message, "error"); }
  }

  function back() { setSelectedId(null); setDetail(null); }

  async function updateStatus(id: number, status: string) {
    try { await api("/challans/" + id + "/status", { method: "PATCH", body: JSON.stringify({ status }) }); toast("Challan " + status.toLowerCase()); loadDetail(id); }
    catch (e: any) { toast(e.message, "error"); }
  }

  function openCreate() { setLineItems([{ product_id: 0, product_name: "", sku: "", unit_price: 0, quantity: 1 }]); setShowForm(true); }

  async function saveChallan(status: string) {
    const custId = (document.getElementById("ch-cust") as HTMLSelectElement).value;
    if (!custId) { toast("Select customer", "error"); return; }
    const rows = document.querySelectorAll(".ch-line");
    const items: any[] = [];
    rows.forEach(row => {
      const sel = row.querySelector(".ch-prod") as HTMLSelectElement;
      const opt = sel.options[sel.selectedIndex];
      const qty = parseInt((row.querySelector(".ch-qty") as HTMLInputElement).value) || 0;
      const price = parseFloat((row.querySelector(".ch-price") as HTMLInputElement).value) || 0;
      if (sel.value && qty > 0) items.push({ product_id: parseInt(sel.value), product_name: opt.dataset.name, sku: opt.dataset.sku, unit_price: price, quantity: qty });
    });
    if (!items.length) { toast("Add items", "error"); return; }
    try { await api("/challans", { method: "POST", body: JSON.stringify({ customer_id: parseInt(custId), items, status }) }); setShowForm(false); toast("Challan " + status.toLowerCase()); loadList(); }
    catch (e: any) { toast(e.message, "error"); }
  }

  if (selectedId && detail) {
    const items = detail.items || [];
    let total = 0;
    items.forEach((i: any) => { total += i.unit_price * i.quantity; });
    const cm = ["Admin", "Sales"].includes(JSON.parse(localStorage.getItem("erp_user") || "{}").role || "");
    let actions: any = null;
    if (cm && detail.status === "Draft") actions = <><button className="btn btn-primary btn-sm" onClick={() => updateStatus(detail.id, "Confirmed")}><i className="fas fa-check"></i> Confirm</button><button className="btn btn-danger btn-sm" onClick={() => updateStatus(detail.id, "Cancelled")}><i className="fas fa-times"></i> Cancel</button></>;
    if (cm && detail.status === "Confirmed") actions = <button className="btn btn-danger btn-sm" onClick={() => updateStatus(detail.id, "Cancelled")}><i className="fas fa-times"></i> Cancel</button>;

    return (
      <>
        <div className="page-header"><h1>Challan {detail.challan_number}</h1><div className="page-header-actions">{actions}</div></div>
        <div className="page-body">
          <button className="detail-back" onClick={back}><i className="fas fa-arrow-left"></i> Back to Challans</button>
          <div className="detail-grid">
            <div className="detail-section"><div className="detail-section-header">Challan Information</div>
              {[["Challan #", detail.challan_number], ["Customer", detail.customer_name || "-"], ["Business", detail.business_name || "-"], ["Status", <span className={"badge " + sBadge(detail.status)}>{detail.status}</span>], ["Total Qty", detail.total_quantity], ["Created By", detail.created_by_name || "-"], ["Created", fmtD(detail.created_at)]].map(([l, v], i) => <div className="detail-field" key={i}><span className="label">{l}</span><span className="value">{v}</span></div>)}
            </div>
            <div className="detail-section"><div className="detail-section-header">Line Items</div>
              <table style={{ width: "100%" }}><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>
                {items.map((i: any) => <tr key={i.id}><td style={{ fontWeight: 500 }}>{i.product_name}</td><td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--fg-secondary)" }}>{i.sku}</td><td>{fmtC(i.unit_price)}</td><td>{i.quantity}</td><td style={{ fontWeight: 600 }}>{fmtC(i.unit_price * i.quantity)}</td></tr>)}
              </tbody></table>
              <div className="challan-total"><span>Total</span><span className="total-val">{fmtC(total)}</span></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Sales Challans</h1>
        <div className="page-header-actions">
          <div className="search-box"><i className="fas fa-search"></i><input placeholder="Search challans..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="table-filters">{[["all", "All"], ["Draft", "Draft"], ["Confirmed", "Confirmed"], ["Cancelled", "Cancelled"]].map(([k, l]) => <button key={k} className={"filter-chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>{l}</button>)}</div>
          <button className="btn btn-secondary btn-sm" onClick={openCreate}><i className="fas fa-plus"></i> Create Challan</button>
        </div>
      </div>
      <div className="page-body">
        <div className="table-container">
          <table><thead><tr><th>Challan #</th><th>Customer</th><th>Items</th><th>Total Qty</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>
            {challans.map(c => { const amt = (c.items || []).reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0); return (<tr key={c.id} onClick={() => setSelectedId(c.id)}><td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{c.challan_number}</td><td>{c.customer_name || "-"}</td><td>{(c.items || []).length}</td><td>{c.total_quantity}</td><td style={{ fontWeight: 600 }}>{fmtC(amt)}</td><td><span className={"badge " + sBadge(c.status)}>{c.status}</span></td><td style={{ fontSize: 12, color: "var(--muted)" }}>{fmtD(c.created_at)}</td><td></td></tr>); })}
          </tbody></table>
          {challans.length === 0 && <div className="empty-state"><i className="fas fa-file-invoice"></i><p>No challans found</p></div>}
        </div>
      </div>
      {showForm && <ChallanForm onSave={saveChallan} onClose={() => setShowForm(false)} />}
    </>
  );
}

function ChallanForm({ onSave, onClose }: { onSave: (s: string) => Promise<void>; onClose: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lines, setLines] = useState([{ pid: 0, qty: 1 }]);

  useEffect(() => { api("/customers?limit=100").then(d => setCustomers((d.customers || []).filter((c: any) => c.status !== "Inactive"))); api("/products?limit=100").then(d => setProducts(d.products || [])); }, []);

  function addLine() { setLines([...lines, { pid: 0, qty: 1 }]); }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, key: string, val: any) { const n = [...lines]; n[i] = { ...n[i], [key]: val }; setLines(n); }

  function getTotal() {
    return lines.reduce((sum, l) => {
      const p = products.find((pr: any) => pr.id === l.pid);
      return sum + (p ? p.unit_price * l.qty : 0);
    }, 0);
  }

  return (
    <Modal title="Create Sales Challan" onClose={onClose} wide footer={<><button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-secondary btn-sm" onClick={() => onSave("Draft")}><i className="fas fa-save"></i> Draft</button><button className="btn btn-primary btn-sm" style={{ width: "auto", padding: "8px 24px" }} onClick={() => onSave("Confirmed")}><i className="fas fa-check"></i> Confirm</button></>}>
      <div className="form-group"><label>Customer *</label><select className="form-input" id="ch-cust"><option value="">Select...</option>{customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.business_name ? " - " + c.business_name : ""}</option>)}</select></div>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}><label style={{ fontSize: 13, fontWeight: 600 }}>Items</label><button type="button" className="btn btn-secondary btn-xs" onClick={addLine}><i className="fas fa-plus"></i> Add</button></div>
      {lines.map((l, i) => {
        const p = products.find((pr: any) => pr.id === l.pid);
        return (
          <div key={i} className="line-item-row">
            <div className="form-group"><label>Product</label><select className="form-input ch-prod" value={l.pid || ""} onChange={e => updateLine(i, "pid", parseInt(e.target.value))}><option value="">Select...</option>{products.map((pr: any) => <option key={pr.id} value={pr.id} data-name={pr.name} data-sku={pr.sku} data-price={pr.unit_price}>{pr.name} ({pr.sku}) - Stock: {pr.current_stock}</option>)}</select></div>
            <div className="form-group"><label>Price</label><input type="number" step="0.01" className="form-input ch-price" value={p ? p.unit_price : 0} readOnly /></div>
            <div className="form-group"><label>Qty</label><input type="number" min="1" className="form-input ch-qty" value={l.qty} onChange={e => updateLine(i, "qty", parseInt(e.target.value) || 1)} /></div>
            <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}><div style={{ fontWeight: 600, fontSize: 14, padding: "10px 0" }}>{fmtC(p ? p.unit_price * l.qty : 0)}</div></div>
            <button type="button" className="remove-line-btn" onClick={() => removeLine(i)}><i className="fas fa-trash"></i></button>
          </div>
        );
      })}
      <div className="challan-total"><span>Total</span><span className="total-val">{fmtC(getTotal())}</span></div>
    </Modal>
  );
}
