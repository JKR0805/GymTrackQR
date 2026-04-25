import Button from "../components/Button";

const MemberLayout = ({ children, user, onLogout }) => (
  <div className="app-shell member-shell">
    <nav className="top-nav">
      <div className="brand-wrap">
        <span className="brand-icon">️</span>
        <span className="brand-name">IRONTRACK</span>
      </div>

      <div className="top-nav-right">
        <div className="user-meta">
          <span className="user-name">{user.name}</span>
          <span className="user-role">Member</span>
        </div>
        <div className="avatar-chip">{user.name?.[0]?.toUpperCase() || "M"}</div>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </nav>

    <main className="member-main">{children}</main>
  </div>
);

export default MemberLayout;
