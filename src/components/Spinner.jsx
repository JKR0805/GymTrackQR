const Spinner = ({ size = 20, color = "var(--amber)" }) => (
  <span
    className="spinner"
    style={{
      width: size,
      height: size,
      borderTopColor: color,
    }}
  />
);

export default Spinner;
