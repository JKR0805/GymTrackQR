import Spinner from "./Spinner";

const LoadingScreen = ({ label = "Loading..." }) => (
  <div className="fullscreen-center">
    <Spinner size={24} />
    <p className="loading-label">{label}</p>
  </div>
);

export default LoadingScreen;
