import { useEffect, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import AdminLayout from "./layouts/AdminLayout";
import MemberLayout from "./layouts/MemberLayout";
import AddMemberPage from "./pages/AddMemberPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLogsPage from "./pages/AdminLogsPage";
import AdminQRPage from "./pages/AdminQRPage";
import LoginPage from "./pages/LoginPage";
import MemberDashboard from "./pages/MemberDashboard";
import MemberLogsPage from "./pages/MemberLogsPage";
import ScanQRPage from "./pages/ScanQRPage";
import ViewMembersPage from "./pages/ViewMembersPage";
import { useAuth } from "./hooks/useAuth";

const App = () => {
  const { loading, userProfile, isAuthenticated, isAdmin, isMember, logout } = useAuth();
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    if (!isAuthenticated) {
      setPage("dashboard");
      return;
    }

    setPage(isAdmin ? "admin-dashboard" : "dashboard");
  }, [isAuthenticated, isAdmin, userProfile?.uid]);

  if (loading) {
    return <LoadingScreen label="Restoring your session..." />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (isMember) {
    return (
      <MemberLayout user={userProfile} onLogout={logout}>
        {page === "dashboard" ? <MemberDashboard onNav={setPage} /> : null}
        {page === "scan" ? <ScanQRPage onBack={() => setPage("dashboard")} /> : null}
        {page === "member-logs" ? <MemberLogsPage onBack={() => setPage("dashboard")} /> : null}
      </MemberLayout>
    );
  }

  if (isAdmin) {
    return (
      <AdminLayout
        user={userProfile}
        onLogout={logout}
        onNav={setPage}
        currentPage={page}
      >
        {page === "admin-dashboard" ? <AdminDashboardPage /> : null}
        {page === "admin-add" ? <AddMemberPage /> : null}
        {page === "admin-members" ? <ViewMembersPage /> : null}
        {page === "admin-qr" ? <AdminQRPage /> : null}
        {page === "admin-logs" ? <AdminLogsPage /> : null}
      </AdminLayout>
    );
  }

  return <LoadingScreen label="Preparing workspace..." />;
};

export default App;
