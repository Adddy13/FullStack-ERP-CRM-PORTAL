import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { api } from "./api";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Products from "./components/Products";
import Challans from "./components/Challans";

interface User { id: number; username: string; name: string; role: string; }

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("erp_token");
    if (token) {
      api("/auth/me").then(u => setUser(u)).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(username: string, password: string) {
    const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    localStorage.setItem("erp_token", data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("erp_token");
    setUser(null);
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#8b92a8", fontSize: 16 }}>Loading...</div>;
  if (!user) return <Login onLogin={login} />;

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/products" element={<Products />} />
        <Route path="/challans" element={<Challans />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function Login({ onLogin }: { onLogin: (u: string, p: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try { await onLogin(username, password); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div id="login-screen">
      <div className="login-card">
        <div className="logo"><div className="logo-icon">E</div><div className="logo-text">MiniERP</div></div>
        <p className="subtitle">Operations Portal - Login to continue</p>
        {error && <div className="login-error" style={{ display: "block" }}>{error}</div>}
        <form onSubmit={submit} autoComplete="off">
          <div className="form-group"><label>Username</label><input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required /></div>
          <div className="form-group"><label>Password</label><input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required /></div>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
        </form>
        <div className="login-hint">
          <p>Test Credentials:</p>
          <p><code>admin / password123</code> - Admin</p>
          <p><code>sales1 / password123</code> - Sales</p>
          <p><code>warehouse1 / password123</code> - Warehouse</p>
          <p><code>accounts1 / password123</code> - Accounts</p>
        </div>
      </div>
    </div>
  );
}
