import { cn } from "../utils/cn";

const Input = ({
  label,
  error,
  icon,
  className,
  type = "text",
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={cn("form-field", className)}>
      {label ? (
        <label className="form-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className={cn("input-wrap", icon && "has-icon", error && "has-error")}>
        {icon ? <span className="input-icon">{icon}</span> : null}
        <input id={inputId} type={type} className="input-control" {...props} />
      </div>
      {error ? <span className="form-error">{error}</span> : null}
    </div>
  );
};

export default Input;
