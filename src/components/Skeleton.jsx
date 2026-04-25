const Skeleton = ({ width = "100%", height = 16, radius = 6 }) => (
  <div
    className="skeleton"
    style={{
      width,
      height,
      borderRadius: radius,
    }}
  />
);

export default Skeleton;
