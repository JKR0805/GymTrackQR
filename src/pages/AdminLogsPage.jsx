import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import Input from "../components/Input";
import Skeleton from "../components/Skeleton";
import Table from "../components/Table";
import { useAttendance } from "../hooks/useAttendance";
import { getMembers } from "../services/userService";
import { formatDate } from "../utils/date";

const AdminLogsPage = () => {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const { adminLogs, adminLogsLoading, error, loadAdminLogs } = useAttendance();

  useEffect(() => {
    let active = true;

    const load = async () => {
      setMembersLoading(true);
      try {
        const [, fetchedMembers] = await Promise.all([loadAdminLogs(), getMembers()]);
        if (active) {
          setMembers(fetchedMembers);
        }
      } finally {
        if (active) {
          setMembersLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [loadAdminLogs]);

  const filtered = useMemo(() => {
    return adminLogs.filter((log) => {
      const query = search.trim().toLowerCase();
      if (query && !log.memberName?.toLowerCase().includes(query)) {
        return false;
      }
      if (from && log.date < from) {
        return false;
      }
      if (to && log.date > to) {
        return false;
      }
      if (memberFilter && log.memberId !== memberFilter) {
        return false;
      }
      return true;
    });
  }, [adminLogs, search, from, to, memberFilter]);

  const loading = adminLogsLoading || membersLoading;

  return (
    <div className="page-stack fade-in">
      <div>
        <h1 className="section-heading">Attendance Logs</h1>
        <p className="section-sub">Master log of all member check-ins</p>
      </div>

      <Card>
        <div className="stack-md">
          <div className="grid-2">
            <Input label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>

          <div className="row wrap gap-sm end">
            <div className="grow min-w-180">
              <Input
                placeholder="Search member name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                
              />
            </div>

            <div className="form-field min-w-180">
              <label className="form-label">Member</label>
              <select
                className="input-control"
                value={memberFilter}
                onChange={(event) => setMemberFilter(event.target.value)}
              >
                <option value="">All Members</option>
                {members.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {from || to || search || memberFilter ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setSearch("");
                  setMemberFilter("");
                }}
              >
                × Clear
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <ErrorBanner message={error} />

      <div className="small muted">Showing {filtered.length} records</div>

      {loading ? (
        <div className="stack-sm">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={52} radius={8} />
          ))}
        </div>
      ) : (
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
          rows={filtered}
          emptyState={<EmptyState  title="No logs found" sub="Try adjusting filters." />}
        />
      )}
    </div>
  );
};

export default AdminLogsPage;
