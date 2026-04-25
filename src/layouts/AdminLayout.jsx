import { useMemo, useState } from "react";
import Button from "../components/Button";

const AdminLayout = ({ children, user, onLogout, onNav, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = useMemo(
    () => [
      { key: "admin-dashboard", label: "Dashboard", icon: "◈" },
      { key: "admin-add", label: "Add Member", icon: "⊕" },
      { key: "admin-members", label: "Members", icon: "◫" },
      { key: "admin-qr", label: "Create QR", icon: "⌁" },
      { key: "admin-logs", label: "Logs", icon: "≡" },
    ],
    []
  );

  return (
    <div className="app-shell admin-shell">
      <header className="top-nav">
        <div className="brand-wrap">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((value) => !value)}
          >
            {sidebarOpen ? "◁" : "▷"}
          </button>
          <span className="brand-icon">🏋️</span>
          <span className="brand-name">IRONTRACK</span>
          <span className="admin-pill">ADMIN</span>
        </div>

        <div className="top-nav-right">
          <div className="user-meta">
            <span className="user-name">{user.name}</span>
            <span className="user-role admin">Administrator</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="admin-content-wrap">
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <nav className="admin-menu">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`admin-menu-item ${
                  currentPage === item.key ? "active" : ""
                }`}
                onClick={() => onNav(item.key)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
