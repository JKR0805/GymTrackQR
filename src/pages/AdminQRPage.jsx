import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import ErrorBanner from "../components/ErrorBanner";
import Skeleton from "../components/Skeleton";
import Spinner from "../components/Spinner";
import { useAuth } from "../hooks/useAuth";
import {
  buildQrPayloadText,
  createOrRotateActiveQrCode,
  getActiveQrCode,
  toQrDataUrl,
} from "../services/qrService";

const toReadableTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminQRPage = () => {
  const { userProfile } = useAuth();

  const [activeQr, setActiveQr] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hydrateQrImage = useCallback(async (qrDoc) => {
    if (!qrDoc?.token) {
      setQrImageUrl("");
      return;
    }

    const payloadText = buildQrPayloadText({
      qrCodeId: qrDoc.id,
      token: qrDoc.token,
    });

    const url = await toQrDataUrl(payloadText);
    setQrImageUrl(url);
  }, []);

  const loadActiveQr = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const qrDoc = await getActiveQrCode();
      setActiveQr(qrDoc);
      await hydrateQrImage(qrDoc);
    } catch (error) {
      setError(error?.message || "Failed to load active QR code.");
    } finally {
      setLoading(false);
    }
  }, [hydrateQrImage]);

  useEffect(() => {
    loadActiveQr();
  }, [loadActiveQr]);

  const handleRotateQr = async () => {
    setRotating(true);
    setError("");
    setSuccess("");

    try {
      const qrDoc = await createOrRotateActiveQrCode({
        createdByUid: userProfile?.uid,
        createdByName: userProfile?.name,
      });

      setActiveQr(qrDoc);
      await hydrateQrImage(qrDoc);
      setSuccess("New QR code generated. Share or download this code for member scans.");
    } catch (error) {
      setError(error?.message || "Failed to generate QR code.");
    } finally {
      setRotating(false);
    }
  };

  const handleDownload = () => {
    if (!qrImageUrl) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = qrImageUrl;
    anchor.download = `irontrack-gym-qr-${new Date().toISOString().slice(0, 10)}.png`;
    anchor.click();
  };

  const summaryItems = useMemo(
    () => [
      {
        label: "Code ID",
        value: activeQr?.id || "-",
      },
      {
        label: "Status",
        value: activeQr?.isActive ? "Active" : "Inactive",
      },
      {
        label: "Updated",
        value: toReadableTime(activeQr?.updatedAt),
      },
      {
        label: "Updated By",
        value: activeQr?.createdByName || "-",
      },
    ],
    [activeQr]
  );

  return (
    <div className="page-stack fade-in">
      <div>
        <h1 className="section-heading">Gym QR Access</h1>
        <p className="section-sub">Generate and download the QR code members must scan.</p>
      </div>

      <ErrorBanner message={error} />
      {success ? <div className="success-banner"> {success}</div> : null}

      <div className="qr-admin-grid">
        <Card>
          <div className="section-title">Current QR</div>

          {loading ? (
            <div className="stack-sm">
              <Skeleton height={18} width="80%" />
              <Skeleton height={280} radius={12} />
            </div>
          ) : qrImageUrl ? (
            <div className="qr-preview-wrap">
              <img src={qrImageUrl} alt="Gym QR code" className="qr-preview-image" />
            </div>
          ) : (
            <div className="center-note">No active QR found yet. Generate one to begin scanning.</div>
          )}

          <div className="row gap-sm top-gap-sm">
            <Button variant="primary" onClick={handleRotateQr} disabled={rotating}>
              {rotating ? <Spinner size={15} color="#1a0f00" /> : null}
              {rotating ? "Generating..." : activeQr ? "Rotate QR" : "Create QR"}
            </Button>

            <Button variant="ghost" onClick={handleDownload} disabled={!qrImageUrl || loading}>
              Download PNG
            </Button>
          </div>
        </Card>

        <Card>
          <div className="section-title">QR Details</div>
          <div className="stack-sm">
            {summaryItems.map((item) => (
              <div key={item.label} className="summary-row">
                <span className="summary-label">{item.label}</span>
                <span className="summary-value mono">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="hint-panel top-gap-sm">
            Members can check in and out only when this active QR is scanned from the mobile scanner page.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminQRPage;
