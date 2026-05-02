import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import { useAttendance } from "../hooks/useAttendance";
import { getMembers } from "../services/userService";
import { calculateTodayEntries } from "../utils/attendance";
import { getActiveSessions, getPeakHours, exportLogsCsv, autoCloseStaleSessions } from "../services/attendanceService";
import { formatDate, formatTime12, formatDurationFromMinutes, toDateKey } from "../utils/date";

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
  const [activeSessions, setActiveSessions] = useState([]);
  const [peakCounts, setPeakCounts] = useState({});

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setMembersLoading(true);
      setLocalError("");

      try {
        await autoCloseStaleSessions();
        const [, fetchedMembers, sessions] = await Promise.all([
          loadAdminLogs(),
          getMembers(),
          getActiveSessions(),
        ]);

        if (active) {
          setMembers(fetchedMembers);
          setActiveSessions(sessions);
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

  useEffect(() => {
    setPeakCounts(getPeakHours(adminLogs || []));
  }, [adminLogs]);

  const todayKey = toDateKey(new Date());

  const todayLogs = useMemo(
    () => adminLogs.filter((log) => log.date === todayKey),
    [adminLogs, todayKey]
  );

  const activeMembers = useMemo(() => activeSessions.length, [activeSessions]);

  const entriesToday = calculateTodayEntries(adminLogs, todayKey);

  const loading = adminLogsLoading || membersLoading;

  const handleExportCsv = async () => {
    try {
      const csv = await exportLogsCsv(adminLogs);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gym-logs-${todayKey}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshActiveSessions = async () => {
    try {
      const sessions = await getActiveSessions();
      setActiveSessions(sessions);
    } catch (err) {
      console.error(err);
    }
  };

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

      <div className="row wrap gap-sm top-gap-sm">
        <Button variant="primary" size="sm" onClick={handleExportCsv}>Export Logs CSV</Button>
        <Button variant="ghost" size="sm" onClick={refreshActiveSessions}>Refresh Sessions</Button>
      </div>

      <div>
        <h2 className="panel-title">Active Sessions</h2>
        {activeSessions.length === 0 ? (
          <EmptyState title="No one is inside" sub="Active members will appear here." />
        ) : (
          <Table
            columns={[
              { key: "memberName", label: "Member" },
              { key: "entryTime", label: "Entry", render: (v) => <span className="mono">{v || "-"}</span> },
              { key: "duration", label: "Duration", render: (r) => <Badge label={r} color="amber" /> },
            ]}
            rows={activeSessions.map((s) => ({
              id: s.id,
              memberName: s.memberName,
              entryTime: s.entryTime || (s.timestamp ? new Date(s.timestamp) : "-"),
              duration: formatDurationFromMinutes(
                Math.round(((new Date()).getTime() - (s.timestamp ? new Date(s.timestamp).getTime() : 0)) / 60000)
              ),
            }))}
          />
        )}
      </div>

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
