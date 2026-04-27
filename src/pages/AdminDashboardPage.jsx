import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import { useAttendance } from "../hooks/useAttendance";
import { getMembers } from "../services/userService";
import { calculateTodayEntries } from "../utils/attendance";
import { formatDate, toDateKey } from "../utils/date";

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ActivityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const AdminDashboardPage = () => {
  const { adminLogs, adminLogsLoading, error, loadAdminLogs } = useAttendance();

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setMembersLoading(true);
      setLocalError("");

      try {
        const [, fetchedMembers] = await Promise.all([loadAdminLogs(), getMembers()]);
        if (active) {
          setMembers(fetchedMembers);
        }
      } catch (error) {
        if (active) {
          setLocalError(error?.message || "Failed to load dashboard data.");
        }
      } finally {
        if (active) {
          setMembersLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [loadAdminLogs]);

  const todayKey = toDateKey(new Date());

  const todayLogs = useMemo(
    () => adminLogs.filter((log) => log.date === todayKey),
    [adminLogs, todayKey]
  );

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active").length,
    [members]
  );

  const entriesToday = calculateTodayEntries(adminLogs, todayKey);

  const loading = adminLogsLoading || membersLoading;

  return (
    <div className="page-stack fade-in">
      <div>
        <h1 className="section-heading">Dashboard Overview</h1>
        <p className="section-sub">Live snapshot of gym activity</p>
      </div>

      {loading ? (
        <div className="stats-grid stats-grid-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height={100} radius={12} />
          ))}
        </div>
      ) : (
        <div className="stats-grid stats-grid-3">
          <StatCard label="Total Members" value={members.length} icon={<UsersIcon />} color="amber" />
          <StatCard label="Active Members" value={activeMembers} icon={<CheckIcon />} color="green" />
          <StatCard label="Today's Entries" value={entriesToday} icon={<ActivityIcon />} color="blue" />
        </div>
      )}

      <ErrorBanner message={error || localError} />

      <div>
        <h2 className="panel-title">Today's Activity</h2>
        <Table
          columns={[
            { key: "memberName", label: "Member" },
            {
              key: "date",
              label: "Date",
              render: (value) => <span className="mono">{formatDate(value)}</span>,
            },
            { key: "entryTime", label: "Entry", mono: true },
            { key: "exitTime", label: "Exit", mono: true },
            {
              key: "duration",
              label: "Duration",
              render: (value) => <Badge label={value || "Inside"} color="amber" />,
            },
          ]}
          rows={todayLogs}
          emptyState={
            <EmptyState

              title="No activity yet"
              sub="Today's check-ins will appear here."
            />
          }
        />
      </div>
    </div>
  );
};

export default AdminDashboardPage;
