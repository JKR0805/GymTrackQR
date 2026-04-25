import { cn } from "../utils/cn";

const Badge = ({ label, color = "green" }) => (
  <span className={cn("badge", `badge-${color}`)}>
    <span className="badge-dot" />
    {label}
  </span>
);

export default Badge;
