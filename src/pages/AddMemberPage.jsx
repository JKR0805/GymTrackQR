import { useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import ErrorBanner from "../components/ErrorBanner";
import Input from "../components/Input";
import Spinner from "../components/Spinner";
import { createMember } from "../services/userService";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  expiry: "",
  createAuthAccount: false,
  password: "",
};

const AddMemberPage = () => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const setField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = "Enter a valid email";
    }

    if (!form.expiry) {
      nextErrors.expiry = "Membership expiry is required";
    }

    if (form.createAuthAccount && form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      await createMember({
        name: form.name,
        email: form.email,
        phone: form.phone,
        membershipExpiry: form.expiry,
        createAuthAccount: form.createAuthAccount,
        password: form.password,
      });

      setStatus("success");
      setForm(emptyForm);
      setErrors({});
    } catch (error) {
      setStatus("error");
      setErrorMessage(error?.message || "Unable to add member.");
    }
  };

  const clearForm = () => {
    setForm(emptyForm);
    setErrors({});
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="page-stack fade-in max-w-form">
      <div>
        <h1 className="section-heading">Add New Member</h1>
        <p className="section-sub">Register a new gym member</p>
      </div>

      {status === "success" ? (
        <div className="success-banner">✅ Member added successfully!</div>
      ) : null}

      <ErrorBanner message={errorMessage} />

      <Card>
        <div className="stack-md">
          <Input
            label="Full Name *"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="Arjun Mehta"
            error={errors.name}
          />

          <Input
            label="Email Address *"
            type="email"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
            placeholder="arjun@example.com"
            error={errors.email}
          />

          <Input
            label="Phone (Optional)"
            type="tel"
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
            placeholder="9876543210"
          />

          <Input
            label="Membership Expiry *"
            type="date"
            value={form.expiry}
            onChange={(event) => setField("expiry", event.target.value)}
            error={errors.expiry}
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.createAuthAccount}
              onChange={(event) => setField("createAuthAccount", event.target.checked)}
            />
            <span>Create Firebase Auth login account</span>
          </label>

          {form.createAuthAccount ? (
            <Input
              label="Temporary Password *"
              type="password"
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              placeholder="At least 6 characters"
              error={errors.password}
            />
          ) : null}

          <div className="row top-border top-gap-sm">
            <Button variant="primary" size="lg" onClick={handleSubmit} disabled={status === "loading"}>
              {status === "loading" ? <Spinner size={15} color="#1a0f00" /> : null}
              {status === "loading" ? "Adding..." : "Add Member"}
            </Button>
            <Button variant="ghost" onClick={clearForm}>
              Clear
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AddMemberPage;
