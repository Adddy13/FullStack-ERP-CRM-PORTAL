import { useState, useEffect } from "react";
import { api, fmtD, fmtDT, sBadge, tBadge, toast } from "../api";
import Modal from "./Modal";

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [fuNote, setFuNote] = useState("");
  const [fuDate, setFuDate] = useState("");

  useEffect(() => { loadList(); }, [search, filter]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId]);

  async function loadList() {
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (filter !== "all") p.set("status", filter);
      const d = await api("/customers?" + p);
      setCustomers(d.customers || []);
    } catch (e: any) { toast(e.message, "error"); }
  }

  async function loadDetail(id: number) {
    try { const d = await api("/customers/" + id); setDetail(d); }
    catch (e: any) { toast(e.message, "error"); }
  }

  function viewCustomer(id: number) { setSelectedId(id); }
  function back() { setSelectedId(null); setDetail(null); }
  function openAdd() { setEditId(null); setShowForm(true); }
  function openEdit(id: number) { setEditId(id); setShowForm(true); }
  async function saveCustomer(id: number | null, payload: any) {
    try {
      await api(id ? "/customers/" + id : "/customers", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
      setShowForm(false);
      toast(id ? "Updated" : "Added");
      if (selectedId && id === selectedId) loadDetail(id);
      else loadList();
    } catch (e: any) { toast(e.message, "error"); }
  }

  async function addFollowUp() {
    if (!fuNote) { toast("Enter a note", "error"); return; }
    try {
      await api("/customers/" + selectedId + "/follow-ups", { method: "POST", body: JSON.stringify({ note: fuNote, follow_up_date: fuDate || null }) });
      setFuNote(""); setFuDate("");
      loadDetail(selectedId);
      toast("Follow-up added");
    } catch (e: any) { toast(e.message, "error"); }
  }

  if (selectedId && detail) {
    const f = detail.follow_ups || [];
    return (
      <>
        <div className="page-header"><h1>Customer Details</h1><div className="page-header-actions"><button className="btn btn-secondary btn-sm" onClick={openEdit}><i className="fas fa-pen"></i> Edit</button></div></div>
        <div className="page-body">
          <button className="detail-back" onClick={back}><i className="fas fa-arrow-left"></i> Back to Customers</button>
          <div className="detail-grid">
            <div className="detail-section">
              <div className="detail-section-header">Customer Information</div>
              {[["Name", detail.name], ["Mobile", detail.mobile || "-"], ["Email", detail.email || "-"], ["Business", detail.business_name || "-"], ["GST", detail.gst_number || "-"], ["Type", <span className={"badge " + tBadge(detail.customer_type)}>{detail.customer_type}</span>], ["Address", detail.address || "-"], ["Status", <span className={"badge " + sBadge(detail.status)}>{detail.status}</span>], ["Follow-up", detail.follow_up_date ? fmtD(detail.follow_up_date) : "-"], ["Notes", detail.notes || "-"], ["Created", fmtDT(detail.created_at)]].map(([l, v], i) => <div className="detail-field" key={i}><span className="label">{l}</span><span className="value">{v}</span></div>)}
            </div>
            <div className="detail-section">
              <div className="detail-section-header">Follow-up Notes</div>
              <div className="followup-list" style={{ maxHeight: 300, overflowY: "auto" }}>
                {f.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No follow-ups yet</div>
                  : f.map((fu: any) => <div className="followup-item" key={fu.id}><div className="fu-note">{fu.note}</div><div className="fu-meta">{fu.created_by_name || "-"} &middot; {fmtDT(fu.created_at)}{fu.follow_up_date ? " &middot; Next: " + fmtD(fu.follow_up_date) : ""}</div></div>)
                }
              </div>
              <div className="followup-form">
                <input className="form-input" placeholder="Add follow-up note..." value={fuNote} onChange={e => setFuNote(e.target.value)} />
                <input type="date" className="form-input" style={{ width: 150, flex: "none" }} value={fuDate} onChange={e => setFuDate(e.target.value)} />
                <button className="btn btn-primary btn-sm" style={{ width: "auto", flex: "none" }} onClick={addFollowUp}>Add</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Customers</h1>
        <div className="page-header-actions">
          <div className="search-box"><i className="fas fa-search"></i><input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="table-filters">
            {[["all", "All"], ["Lead", "Lead"], ["Active", "Active"], ["Inactive", "Inactive"]].map(([k, l]) => <button key={k} className={"filter-chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={openAdd}><i className="fas fa-plus"></i> Add Customer</button>
        </div>
      </div>
      <div className="page-body">
        <div className="table-container">
          <table><thead><tr><th>Name</th><th>Business</th><th>Mobile</th><th>Type</th><th>Status</th><th>Follow-up</th><th>Actions</th></tr></thead><tbody>
            {customers.map(c => (
              <tr key={c.id} onClick={() => viewCustomer(c.id)}>
                <td style={{ fontWeight: 600 }}>{c.name}</td><td>{c.business_name || "-"}</td><td>{c.mobile || "-"}</td>
                <td><span className={"badge " + tBadge(c.customer_type)}>{c.customer_type}</span></td>
                <td><span className={"badge " + sBadge(c.status)}>{c.status}</span></td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{c.follow_up_date ? fmtD(c.follow_up_date) : "-"}</td>
                <td className="actions-cell"><button className="action-btn" onClick={e => { e.stopPropagation(); openEdit(c.id); }}><i className="fas fa-pen"></i></button></td>
              </tr>
            ))}
          </tbody></table>
          {customers.length === 0 && <div className="empty-state"><i className="fas fa-users"></i><p>No customers found</p></div>}
        </div>
      </div>
      {showForm && <CustomerForm id={editId} onSave={saveCustomer} onClose={() => setShowForm(false)} />}
    </>
  );
}

function CustomerForm({ id, onSave, onClose }: { id: number | null; onSave: (id: number | null, data: any) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", mobile: "", email: "", business_name: "", gst_number: "", customer_type: "Retail", address: "", status: "Lead", follow_up_date: "", notes: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (id) loadCustomer(id); }, [id]);

  async function loadCustomer(cid: number) {
    try { const c = await api("/customers/" + cid); setForm({ name: c.name || "", mobile: c.mobile || "", email: c.email || "", business_name: c.business_name || "", gst_number: c.gst_number || "", customer_type: c.customer_type || "Retail", address: c.address || "", status: c.status || "Lead", follow_up_date: c.follow_up_date ? c.follow_up_date.split("T")[0] : "", notes: c.notes || "" }); }
    catch (e: any) { onClose(); }
  }

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setLoading(true);
    try {
      const payload = { ...form, mobile: form.mobile || null, email: form.email || null, business_name: form.business_name || null, gst_number: form.gst_number || null, address: form.address || null, follow_up_date: form.follow_up_date || null, notes: form.notes || null };
      await onSave(id, payload);
    } catch (e: any) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={id ? "Edit Customer" : "Add Customer"} onClose={onClose} footer={<><button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" style={{ width: "auto", padding: "8px 24px" }} onClick={submit} disabled={loading}>{loading ? "Saving..." : "Save"}</button></>}>
      <form onSubmit={submit}>
        <div className="form-row"><div className="form-group"><label>Name *</label><input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} required /></div><div className="form-group"><label>Mobile</label><input className="form-input" value={form.mobile} onChange={e => set("mobile", e.target.value)} /></div></div>
        <div className="form-row"><div className="form-group"><label>Email</label><input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div><div className="form-group"><label>Business Name</label><input className="form-input" value={form.business_name} onChange={e => set("business_name", e.target.value)} /></div></div>
        <div className="form-row"><div className="form-group"><label>GST Number</label><input className="form-input" value={form.gst_number} onChange={e => set("gst_number", e.target.value)} /></div><div className="form-group"><label>Type *</label><select className="form-input" value={form.customer_type} onChange={e => set("customer_type", e.target.value)}><option value="Retail">Retail</option><option value="Wholesale">Wholesale</option><option value="Distributor">Distributor</option></select></div></div>
        <div className="form-group"><label>Address</label><textarea className="form-input" value={form.address} onChange={e => set("address", e.target.value)} /></div>
        <div className="form-row"><div className="form-group"><label>Status</label><select className="form-input" value={form.status} onChange={e => set("status", e.target.value)}><option value="Lead">Lead</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div><div className="form-group"><label>Follow-up</label><input type="date" className="form-input" value={form.follow_up_date} onChange={e => set("follow_up_date", e.target.value)} /></div></div>
        <div className="form-group"><label>Notes</label><textarea className="form-input" value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
      </form>
    </Modal>
  );
}
