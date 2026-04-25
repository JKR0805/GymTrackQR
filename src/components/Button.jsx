import { cn } from "../utils/cn";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  className,
  ...props
}) => (
  <button
    className={cn(
      "btn",
      `btn-${variant}`,
      `btn-${size}`,
      fullWidth && "btn-block",
      className
    )}
    {...props}
  >
    {icon ? <span className="btn-icon">{icon}</span> : null}
    <span>{children}</span>
  </button>
);

export default Button;
