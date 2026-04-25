import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  loginWithEmail,
  logoutUser,
  subscribeToAuthChanges,
} from "../services/authService";

const AuthContext = createContext(null);

const mapAuthError = (error) => {
  const code = error?.code;

  const known = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Try again shortly.",
    "auth/network-request-failed": "Network issue detected. Check your internet.",
  };

  return known[code] || error?.message || "Authentication failed.";
};

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(({ firebaseUser, profile, error }) => {
      setFirebaseUser(firebaseUser);
      setUserProfile(profile);
      setError(error ? mapAuthError(error) : "");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setAuthActionLoading(true);
    setError("");

    try {
      const { firebaseUser, profile } = await loginWithEmail(email, password);
      setFirebaseUser(firebaseUser);
      setUserProfile(profile);
      return profile;
    } catch (error) {
      const message = mapAuthError(error);
      setError(message);
      throw new Error(message);
    } finally {
      setAuthActionLoading(false);
    }
  };

  const logout = async () => {
    await logoutUser();
  };

  const value = useMemo(
    () => ({
      firebaseUser,
      userProfile,
      loading,
      authActionLoading,
      error,
      login,
      logout,
      isAuthenticated: Boolean(firebaseUser && userProfile),
      isAdmin: userProfile?.role === "admin",
      isMember: userProfile?.role === "member",
    }),
    [firebaseUser, userProfile, loading, authActionLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
};
