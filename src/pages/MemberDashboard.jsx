import { useEffect, useMemo } from "react";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import WeeklyCalendar from "../components/WeeklyCalendar";
import { useAttendance } from "../hooks/useAttendance";
import { useAuth } from "../hooks/useAuth";
import { buildCurrentWeek } from "../utils/attendance";
import { formatDate, formatDateVerbose } from "../utils/date";

const MemberDashboard = ({ onNav }) => {
  const { userProfile } = useAuth();
  const { memberLogs, memberLogsLoading, error, loadMemberLogs } = useAttendance();

  useEffect(() => {
    loadMemberLogs();
  }, [loadMemberLogs]);

  const weekDays = useMemo(() => buildCurrentWeek(memberLogs, new Date()), [memberLogs]);
  const lastLog = memberLogs[0];
  const weekPresentDays = weekDays.filter((day) => day.present).length;

  return (
    <div className="page-stack fade-in">
      <div>
        <div className="muted-caps">{formatDateVerbose(new Date())}</div>
        <h1 className="hero-title">Welcome, {userProfile.name?.split(" ")[0]} 💪</h1>
      </div>

      <Card>
        {memberLogsLoading ? (
          <div className="stack-sm">
            <Skeleton height={20} width="90px" />
            <Skeleton height={110} radius={12} />
          </div>
        ) : (
          <WeeklyCalendar days={weekDays} />
        )}
      </Card>

      <div className="grid-2">
        <StatCard label="This Week" value={`${weekPresentDays} days`} icon="📅" color="amber" />
        <StatCard
          label="Last Session"
          value={lastLog?.duration || "-"}
          icon="⏱️"
          color="green"
        />
      </div>

      {lastLog ? (
        <Card className="last-session-card">
          <div className="status-icon">✅</div>
          <div className="grow">
            <div className="strong">Last Check-in</div>
            <div className="mono muted">
              {formatDate(lastLog.date)} · {lastLog.entryTime} - {lastLog.exitTime || "--"}
            </div>
          </div>
          <Badge label={lastLog.exitTime ? "Completed" : "Inside Gym"} color="green" />
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="📭"
            title="No attendance yet"
            sub="Your latest check-ins will appear here after scanning."
          />
        </Card>
      )}

      {error ? <div className="error-banner">⚠️ {error}</div> : null}

      <div className="grid-2 action-grid">
        <button className="action-card action-card-primary" onClick={() => onNav("scan")}> 
          <span className="action-icon">📷</span>
          <span className="action-title">Scan QR</span>
          <span className="action-sub">Check in / out</span>
        </button>

        <button className="action-card" onClick={() => onNav("member-logs")}> 
          <span className="action-icon">📊</span>
          <span className="action-title">My Logs</span>
          <span className="action-sub">View history</span>
        </button>
      </div>
    </div>
  );
};

export default MemberDashboard;
