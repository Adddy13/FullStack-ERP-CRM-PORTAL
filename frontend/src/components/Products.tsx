import { useState, useEffect } from "react";
import { api, fmtD, fmtC, toast } from "../api";
import Modal from "./Modal";

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [stockModal, setStockModal] = useState<string | null>(null);

  useEffect(() => { loadList(); }, [search, filter]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId]);

  async function loadList() {
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (filter === "low") p.set("low_stock", "true");
      const d = await api("/products?" + p);
      setProducts(d.products || []);
    } catch (e: any) { toast(e.message, "error"); }
  }

  async function loadDetail(id: number) {
    try { const d = await api("/products/" + id); setDetail(d); }
    catch (e: any) { toast(e.message, "error"); }
  }

  function back() { setSelectedId(null); setDetail(null); }
  function openAdd() { setEditId(null); setShowForm(true); }
  function openEdit(id: number) { setEditId(id); setShowForm(true); }

  async function saveProduct(id: number | null, payload: any) {
    try {
      await api(id ? "/products/" + id : "/products", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
      setShowForm(false); toast(id ? "Updated" : "Added");
      if (selectedId && id === selectedId) loadDetail(id); else loadList();
    } catch (e: any) { toast(e.message, "error"); }
  }

  async function saveStock(type: string, qty: number, reason: string) {
    try {
      await api("/products/" + selectedId + "/stock-movements", { method: "POST", body: JSON.stringify({ quantity: qty, movement_type: type, reason: reason || null }) });
      setStockModal(null); toast("Stock " + type + " " + qty); loadDetail(selectedId);
    } catch (e: any) { toast(e.message, "error"); }
  }

  if (selectedId && detail) {
    const mv = detail.movements || [];
    const low = detail.current_stock <= detail.min_stock_alert;
    const canEdit = ["Admin", "Warehouse"].includes(JSON.parse(localStorage.getItem("erp_user") || "{}").role || "");
    return (
      <>
        <div className="page-header">
          <h1>Product Details</h1>
          <div className="page-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={openEdit}><i className="fas fa-pen"></i> Edit</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setStockModal("IN")}><i className="fas fa-arrow-up"></i> Stock IN</button>
            <button className="btn btn-danger btn-sm" onClick={() => setStockModal("OUT")}><i className="fas fa-arrow-down"></i> Stock OUT</button>
          </div>
        </div>
        <div className="page-body">
          <button className="detail-back" onClick={back}><i className="fas fa-arrow-left"></i> Back to Products</button>
          <div className="detail-grid">
            <div className="detail-section">
              <div className="detail-section-header">Product Information</div>
              {[["Name", detail.name], ["SKU", <span style={{ fontFamily: "monospace" }}>{detail.sku}</span>], ["Category", detail.category || "-"], ["Price", fmtC(detail.unit_price)], ["Stock", <span className={low ? "low-stock" : ""}>{detail.current_stock}</span>], ["Min Alert", detail.min_stock_alert], ["Location", detail.location || "-"], ["Created", fmtD(detail.created_at)]].map(([l, v], i) => <div className="detail-field" key={i}><span className="label">{l}</span><span className="value">{v}</span></div>)}
            </div>
            <div className="detail-section">
              <div className="detail-section-header">Stock Movements</div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {mv.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No movements yet</div>
                  : mv.map((m: any) => <div className="movement-item" key={m.id}><span className={"movement-type " + m.movement_type}>{m.movement_type}</span><span style={{ fontWeight: 600, color: m.movement_type === "OUT" ? "var(--danger)" : "var(--accent)" }}>{m.movement_type === "IN" ? "+" : "-"}{m.quantity}</span><span style={{ flex: 1, color: "var(--fg-secondary)" }}>{m.reason || "-"}</span><span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{m.created_by_name || ""} &middot; {fmtD(m.created_at)}</span></div>)
                }
              </div>
            </div>
          </div>
        </div>
        {stockModal && <StockForm type={stockModal} onSave={saveStock} onClose={() => setStockModal(null)} />}
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Products &amp; Inventory</h1>
        <div className="page-header-actions">
          <div className="search-box"><i className="fas fa-search"></i><input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="table-filters"><button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>All</button><button className={"filter-chip" + (filter === "low" ? " active" : "")} onClick={() => setFilter("low")}>Low Stock</button></div>
          <button className="btn btn-secondary btn-sm" onClick={openAdd}><i className="fas fa-plus"></i> Add Product</button>
        </div>
      </div>
      <div className="page-body">
        <div className="table-container">
          <table><thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Location</th><th>Actions</th></tr></thead><tbody>
            {products.map(p => { const low = p.current_stock <= p.min_stock_alert; return (<tr key={p.id} onClick={() => setSelectedId(p.id)}><td style={{ fontWeight: 600 }}>{p.name}</td><td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--fg-secondary)" }}>{p.sku}</td><td>{p.category || "-"}</td><td>{fmtC(p.unit_price)}</td><td className={low ? "low-stock" : ""}>{p.current_stock}{low ? " <i className=\"fas fa-exclamation-circle\" style={{fontSize:11}}></i>" : ""}</td><td>{p.location || "-"}</td><td className="actions-cell"><button className="action-btn" onClick={e => { e.stopPropagation(); openEdit(p.id); }}><i className="fas fa-pen"></i></button></td></tr>); })}
          </tbody></table>
          {products.length === 0 && <div className="empty-state"><i className="fas fa-box"></i><p>No products found</p></div>}
        </div>
      </div>
      {showForm && <ProductForm id={editId} onSave={saveProduct} onClose={() => setShowForm(false)} />}
    </>
  );
}

function ProductForm({ id, onSave, onClose }: { id: number | null; onSave: (id: number | null, d: any) => Promise<void>; onClose: () => void }) {
  const [f, setF] = useState({ name: "", sku: "", category: "", unit_price: "", current_stock: "0", min_stock_alert: "10", location: "" });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (id) api("/products/" + id).then(p => setF({ name: p.name || "", sku: p.sku || "", category: p.category || "", unit_price: String(p.unit_price || 0), current_stock: String(p.current_stock || 0), min_stock_alert: String(p.min_stock_alert || 10), location: p.location || "" })).catch(onClose); }, [id]);
  function set(k: string, v: string) { setF(prev => ({ ...prev, [k]: v })); }
  async function submit(e: React.FormEvent) { e.preventDefault(); setLoading(true); try { await onSave(id, { ...f, unit_price: parseFloat(f.unit_price) || 0, current_stock: parseInt(f.current_stock) || 0, min_stock_alert: parseInt(f.min_stock_alert) || 10, category: f.category || null, location: f.location || null }); } catch (e: any) { toast(e.message, "error"); } finally { setLoading(false); } }
  return (
    <Modal title={id ? "Edit Product" : "Add Product"} onClose={onClose} footer={<><button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" style={{ width: "auto", padding: "8px 24px" }} onClick={submit} disabled={loading}>{loading ? "Saving..." : "Save"}</button></>}>
      <form onSubmit={submit}>
        <div className="form-row"><div className="form-group"><label>Name *</label><input className="form-input" value={f.name} onChange={e => set("name", e.target.value)} required /></div><div className="form-group"><label>SKU *</label><input className="form-input" value={f.sku} onChange={e => set("sku", e.target.value)} required /></div></div>
        <div className="form-row"><div className="form-group"><label>Category</label><input className="form-input" value={f.category} onChange={e => set("category", e.target.value)} /></div><div className="form-group"><label>Price *</label><input type="number" step="0.01" min="0" className="form-input" value={f.unit_price} onChange={e => set("unit_price", e.target.value)} required /></div></div>
        <div className="form-row"><div className="form-group"><label>Stock</label><input type="number" min="0" className="form-input" value={f.current_stock} onChange={e => set("current_stock", e.target.value)} /></div><div className="form-group"><label>Min Alert</label><input type="number" min="0" className="form-input" value={f.min_stock_alert} onChange={e => set("min_stock_alert", e.target.value)} /></div></div>
        <div className="form-group"><label>Location</label><input className="form-input" value={f.location} onChange={e => set("location", e.target.value)} /></div>
      </form>
    </Modal>
  );
}

function StockForm({ type, onSave, onClose }: { type: string; onSave: (t: string, q: number, r: string) => Promise<void>; onClose: () => void }) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  async function submit(e: React.FormEvent) { e.preventDefault(); const q = parseInt(qty); if (!q || q <= 0) { toast("Enter valid quantity", "error"); return; } await onSave(type, q, reason); }
  const color = type === "IN" ? "var(--accent)" : "var(--danger)";
  return (
    <Modal title={type === "IN" ? "Stock IN" : "Stock OUT"} onClose={onClose} footer={<><button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" style={{ width: "auto", padding: "8px 24px", background: color }} onClick={submit}>Confirm</button></>}>
      <form onSubmit={submit}><div className="form-group"><label>Quantity *</label><input type="number" min="1" className="form-input" value={qty} onChange={e => setQty(e.target.value)} placeholder="Enter quantity" /></div><div className="form-group"><label>Reason</label><input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Purchase from supplier" /></div></form>
    </Modal>
  );
}
