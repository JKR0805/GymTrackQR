import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Skeleton from "../components/Skeleton";
import Table from "../components/Table";
import {
  deleteMemberByUid,
  getMembers,
  updateMemberByUid,
} from "../services/userService";
import { formatDate } from "../utils/date";

const ViewMembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    membershipExpiry: "",
    status: "active",
  });

  const loadMembers = async () => {
    setLoading(true);
    setError("");

    try {
      const fetchedMembers = await getMembers();
      setMembers(fetchedMembers);
    } catch (error) {
      setError(error?.message || "Failed to fetch members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const query = search.trim().toLowerCase();
      const queryMatch =
        !query ||
        member.name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query);

      const filterMatch = filter === "all" || member.status === filter;
      return queryMatch && filterMatch;
    });
  }, [members, search, filter]);

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteSaving(true);

    try {
      await deleteMemberByUid(deleteTarget.uid);
      setDeleteTarget(null);
      await loadMembers();
    } catch (error) {
      setError(error?.message || "Could not delete member.");
      setDeleteTarget(null);
    } finally {
      setDeleteSaving(false);
    }
  };

  const openEdit = (member) => {
    setEditErrors({});
    setEditTarget(member);
    setEditForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      membershipExpiry: member.membershipExpiry || "",
      status: member.status || "active",
    });
  };

  const validateEditForm = () => {
    const nextErrors = {};

    if (!editForm.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!editForm.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(editForm.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!editForm.membershipExpiry) {
      nextErrors.membershipExpiry = "Membership expiry is required.";
    }

    if (!["active", "expired"].includes(editForm.status)) {
      nextErrors.status = "Select a valid membership status.";
    }

    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleEditSave = async () => {
    if (!editTarget || !validateEditForm()) {
      return;
    }

    setEditSaving(true);
    setError("");

    try {
      await updateMemberByUid(editTarget.uid, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        membershipExpiry: editForm.membershipExpiry,
        status: editForm.status,
      });

      setEditTarget(null);
      await loadMembers();
    } catch (error) {
      setError(error?.message || "Could not update member.");
    } finally {
      setEditSaving(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (value, row) => (
        <div className="member-cell">
          <div className="member-avatar">{value?.[0]?.toUpperCase() || "M"}</div>
          <div>
            <div className="strong">{value}</div>
            <div className="mono muted small">{row.phone || "-"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (value) => <span className="mono muted">{value}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge label={value === "active" ? "Active" : "Expired"} color={value === "active" ? "green" : "red"} />
      ),
    },
    {
      key: "membershipExpiry",
      label: "Expiry",
      render: (value) => <span className="mono">{formatDate(value)}</span>,
    },
    {
      key: "uid",
      label: "Actions",
      render: (_, row) => (
        <div className="row gap-xs">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack fade-in">
      <div className="row between wrap gap-sm">
        <div>
          <h1 className="section-heading">Members</h1>
          <p className="section-sub">{members.length} total members</p>
        </div>
      </div>

      <Card className="dense-card">
        <div className="row wrap gap-sm end">
          <div className="grow min-w-180">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon="🔍"
            />
          </div>

          <div className="row gap-xs">
            {["all", "active", "expired"].map((state) => (
              <button
                key={state}
                className={`chip ${filter === state ? "active" : ""}`}
                onClick={() => setFilter(state)}
              >
                {state}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="stack-sm">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={52} radius={8} />
          ))}
        </div>
      ) : (
        <Table
          columns={columns}
          rows={filteredMembers}
          emptyState={
            <EmptyState
              icon="👥"
              title="No members found"
              sub="Try adjusting your search or filter."
            />
          }
        />
      )}

      <Modal
        show={Boolean(editTarget)}
        title="Edit Member"
        onClose={() => {
          if (!editSaving) {
            setEditTarget(null);
          }
        }}
        onConfirm={handleEditSave}
        confirmLabel={editSaving ? "Saving..." : "Save Changes"}
        confirmVariant="primary"
        confirmDisabled={editSaving}
        cancelDisabled={editSaving}
      >
        <div className="stack-md">
          <Input
            label="Full Name *"
            value={editForm.name}
            onChange={(event) =>
              setEditForm((previous) => ({ ...previous, name: event.target.value }))
            }
            error={editErrors.name}
          />
          <Input
            label="Email *"
            type="email"
            value={editForm.email}
            onChange={(event) =>
              setEditForm((previous) => ({ ...previous, email: event.target.value }))
            }
            error={editErrors.email}
          />
          <Input
            label="Phone"
            value={editForm.phone}
            onChange={(event) =>
              setEditForm((previous) => ({ ...previous, phone: event.target.value }))
            }
          />
          <Input
            label="Membership Expiry *"
            type="date"
            value={editForm.membershipExpiry}
            onChange={(event) =>
              setEditForm((previous) => ({
                ...previous,
                membershipExpiry: event.target.value,
              }))
            }
            error={editErrors.membershipExpiry}
          />

          <div className="form-field">
            <label className="form-label">Status</label>
            <select
              className="input-control"
              value={editForm.status}
              onChange={(event) =>
                setEditForm((previous) => ({ ...previous, status: event.target.value }))
              }
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
            {editErrors.status ? <span className="form-error">{editErrors.status}</span> : null}
          </div>
        </div>
      </Modal>

      <Modal
        show={Boolean(deleteTarget)}
        title="Confirm Deletion"
        onClose={() => {
          if (!deleteSaving) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDelete}
        confirmLabel={deleteSaving ? "Deleting..." : "Yes, Delete"}
        confirmDisabled={deleteSaving}
        cancelDisabled={deleteSaving}
      >
        <p className="muted">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default ViewMembersPage;
