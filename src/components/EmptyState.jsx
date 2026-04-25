const EmptyState = ({ icon, title, sub }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <div className="empty-state-title">{title}</div>
    <div className="empty-state-sub">{sub}</div>
  </div>
);

export default EmptyState;
