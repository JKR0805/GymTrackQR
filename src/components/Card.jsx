import { cn } from "../utils/cn";

const Card = ({ children, className, hover = false, ...props }) => (
  <div className={cn("card", hover && "card-hover", className)} {...props}>
    {children}
  </div>
);

export default Card;
