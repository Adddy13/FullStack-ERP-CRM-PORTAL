import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

interface Props { user: { id: number; name: string; role: string }; onLogout: () => void; children: React.ReactNode; }

export default function Layout({ user, onLogout, children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const r = user.role;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function go(path: string) { navigate(path); setSidebarOpen(false); }
  function isActive(path: string) { return location.pathname === path; }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div id="app" style={{ display: "block" }}>
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}><i className="fas fa-bars"></i></button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>MiniERP</div>
        <div style={{ width: 36 }}></div>
      </div>
      <div className={"sidebar-overlay" + (sidebarOpen ? " open" : "")} onClick={closeSidebar}></div>
      <aside className={"sidebar" + (sidebarOpen ? " open" : "")} id="sidebar">
        <div className="sidebar-header">
          <div className="s-logo">E</div>
          <div><div className="s-title">MiniERP</div><div className="s-sub">Operations Portal</div></div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          <button className={"nav-item" + (isActive("/") ? " active" : "")} onClick={() => go("/")}><i className="fas fa-th-large"></i> Dashboard</button>
          <div className="nav-section-label">CRM</div>
          <button className={"nav-item" + (isActive("/customers") ? " active" : "")} onClick={() => go("/customers")}><i className="fas fa-users"></i> Customers</button>
          <div className="nav-section-label">Inventory</div>
          {["Admin", "Warehouse"].includes(r) && <button className={"nav-item" + (isActive("/products") ? " active" : "")} onClick={() => go("/products")}><i className="fas fa-box"></i> Products</button>}
          <div className="nav-section-label">Sales</div>
          {["Admin", "Sales", "Accounts"].includes(r) && <button className={"nav-item" + (isActive("/challans") ? " active" : "")} onClick={() => go("/challans")}><i className="fas fa-file-invoice"></i> Sales Challans</button>}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.name[0].toUpperCase()}</div>
            <div><div className="user-name">{user.name}</div><div className="user-role">{user.role}</div></div>
          </div>
          <button className="btn-logout" onClick={onLogout}><i className="fas fa-sign-out-alt"></i> Logout</button>
        </div>
      </aside>
      <div className="main-content">{children}</div>
    </div>
  );
}
