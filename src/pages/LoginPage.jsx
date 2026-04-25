import { useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import { useAuth } from "../hooks/useAuth";

const LoginPage = () => {
  const { login, authActionLoading, error: authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setLocalError("Email is required.");
      return;
    }

    if (!password.trim()) {
      setLocalError("Password is required.");
      return;
    }

    setLocalError("");

    try {
      await login(email.trim(), password);
    } catch {
      // Error state is managed in useAuth.
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-orb" />

      <div className="login-box">
        <div className="login-brand">
          <div className="logo-card">️</div>
          <div className="login-title">IRONTRACK</div>
          <div className="login-sub">Gym Attendance Management</div>
        </div>

        <Card className="login-card">
          <h2 className="panel-title">Welcome back</h2>
          <p className="panel-sub">Sign in to your account to continue</p>

          <form className="stack-md" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              icon="@"
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              
            />

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Show password</span>
            </label>

            <ErrorBanner message={localError || authError} />

            <Button variant="primary" size="lg" fullWidth type="submit" disabled={authActionLoading}>
              {authActionLoading ? <Spinner size={16} color="#1a0f00" /> : null}
              {authActionLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="hint-panel">
            Use valid Firebase Auth credentials linked to documents in /users.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
