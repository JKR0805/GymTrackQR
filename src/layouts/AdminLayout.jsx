import { useMemo, useState } from "react";
import Button from "../components/Button";

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
);

const UserPlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

const QrCodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
);

const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
);

const AdminLayout = ({ children, user, onLogout, onNav, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth > 900;
    }
    return true;
  });

  const navItems = useMemo(
    () => [
      { key: "admin-dashboard", label: "Dashboard", icon: <DashboardIcon /> },
      { key: "admin-add", label: "Add Member", icon: <UserPlusIcon /> },
      { key: "admin-members", label: "Members", icon: <UsersIcon /> },
      { key: "admin-qr", label: "Create QR", icon: <QrCodeIcon /> },
      { key: "admin-logs", label: "Logs", icon: <ListIcon /> },
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
          <span className="brand-icon">️</span>
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
