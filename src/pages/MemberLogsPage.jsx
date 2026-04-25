import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import Input from "../components/Input";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import { useAttendance } from "../hooks/useAttendance";
import { formatDate, parseDurationToMinutes } from "../utils/date";

const MemberLogsPage = ({ onBack }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { memberLogs, memberLogsLoading, error, loadMemberLogs } = useAttendance();

  useEffect(() => {
    loadMemberLogs({ from, to });
  }, [from, to, loadMemberLogs]);

  const totalMinutes = useMemo(
    () => memberLogs.reduce((acc, log) => acc + parseDurationToMinutes(log.duration), 0),
    [memberLogs]
  );

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const columns = [
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
      render: (value) => <Badge label={value || "In progress"} color="amber" />,
    },
  ];

  return (
    <div className="page-stack fade-in">
      <div className="page-header-row">
        <button className="back-btn" onClick={onBack}>
          ←
        </button>
        <h1 className="section-heading">My Attendance Logs</h1>
      </div>

      <div className="grid-2">
        <StatCard label="Sessions" value={memberLogs.length} color="amber" />
        <StatCard
          label="Total Time"
          value={`${totalHours}h ${remainingMinutes}m`}
          color="green"
        />
      </div>

      <Card>
        <div className="section-title">Filter by Date Range</div>
        <div className="grid-2">
          <Input label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>

        {from || to ? (
          <div className="top-gap-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              × Clear Filters
            </Button>
          </div>
        ) : null}
      </Card>

      <ErrorBanner message={error} />

      {memberLogsLoading ? (
        <div className="stack-sm">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={48} radius={8} />
          ))}
        </div>
      ) : (
        <Table
          columns={columns}
          rows={memberLogs}
          emptyState={
            <EmptyState
              
              title="No logs found"
              sub="No attendance records match your filter."
            />
          }
        />
      )}
    </div>
  );
};

export default MemberLogsPage;
