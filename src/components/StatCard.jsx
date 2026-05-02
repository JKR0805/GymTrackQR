import Card from "./Card";

const StatCard = ({ label, value, icon, color = "amber", delta, valueClassName = "" }) => (
  <Card className="stat-card">
    <div className="stat-main">
      <div>
        <div className="stat-label">{label}</div>
        <div className={`stat-value ${valueClassName}`.trim()}>{value}</div>
        {delta ? <div className="stat-delta">{delta}</div> : null}
      </div>
      {icon && <div className={`stat-icon stat-icon-${color}`}>{icon}</div>}
    </div>
  </Card>
);

export default StatCard;
