const ErrorBanner = ({ message }) => {
  if (!message) {
    return null;
  }

  return <div className="error-banner">⚠️ {message}</div>;
};

export default ErrorBanner;
