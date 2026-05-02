import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import ErrorBanner from "../components/ErrorBanner";
import Input from "../components/Input";
import MapPicker from "../components/MapPicker";
import Skeleton from "../components/Skeleton";
import Spinner from "../components/Spinner";
import { useAuth } from "../hooks/useAuth";
import {
  buildQrPayloadText,
  buildStaticQrPayloadText,
  createOrRotateActiveQrCode,
  getActiveQrCode,
  toQrDataUrl,
  fetchSignedPayloadFromFunction,
  updateActiveQrGeo,
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
  const { userProfile, firebaseUser } = useAuth();

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
    // Prefer server-signed QR payload from Cloud Function if available.
    let payloadText;
    try {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        const signed = await fetchSignedPayloadFromFunction(idToken);
        payloadText = JSON.stringify(signed);
      }
    } catch {
      // fallback to client-side build when function not available
    }

    // Always fall back to client-side build if server path didn't produce a payload
    if (!payloadText) {
      payloadText = await buildQrPayloadText({ qrCodeId: qrDoc.id, token: qrDoc.token });
    }

    const url = await toQrDataUrl(payloadText);
    setQrImageUrl(url);
  }, [firebaseUser]);

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

  // Auto-refresh QR payload every 30s to keep it within the 60s validity window
  const AUTO_REFRESH_SECONDS = 30;
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
  const countdownRef = useRef(null);

  useEffect(() => {
    // Only run when we have an active QR with a token
    if (!activeQr?.token) return;

    setCountdown(AUTO_REFRESH_SECONDS);

    // Countdown ticker (every 1s)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return AUTO_REFRESH_SECONDS; // reset after refresh
        }
        return prev - 1;
      });
    }, 1000);

    // Payload refresh (every 30s)
    const refreshInterval = setInterval(() => {
      hydrateQrImage(activeQr);
    }, AUTO_REFRESH_SECONDS * 1000);

    return () => {
      clearInterval(countdownRef.current);
      clearInterval(refreshInterval);
    };
  }, [activeQr, hydrateQrImage]);

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

  const [geoState, setGeoState] = useState({ lat: "", lng: "", radiusMeters: 200 });

  useEffect(() => {
    if (!activeQr?.geo) return;
    setGeoState({ lat: activeQr.geo.lat || "", lng: activeQr.geo.lng || "", radiusMeters: activeQr.geo.radiusMeters || 200 });
  }, [activeQr]);

  const handleSaveGeo = async () => {
    try {
      const lat = Number(geoState.lat);
      const lng = Number(geoState.lng);
      const radiusMeters = Number(geoState.radiusMeters || 200);
      const updated = await updateActiveQrGeo({ lat, lng, radiusMeters });
      setActiveQr(updated);
      setSuccess("Gym location saved.");
    } catch (err) {
      setError(err?.message || "Failed to save location.");
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

  const handleDownloadMaster = async () => {
    if (!activeQr?.token) return;
    try {
      const payloadText = await buildStaticQrPayloadText({
        qrCodeId: activeQr.id,
        token: activeQr.token,
      });
      const url = await toQrDataUrl(payloadText);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `irontrack-master-qr-${new Date().toISOString().slice(0, 10)}.png`;
      anchor.click();
      setSuccess("Master QR downloaded. Print it for the gym wall.");
    } catch (err) {
      setError(err?.message || "Failed to generate master QR.");
    }
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
              <div className="qr-live-bar">
                <span className="qr-live-dot" />
                <span className="qr-live-label">LIVE</span>
                <span className="qr-live-countdown">Refreshes in {countdown}s</span>
              </div>
            </div>
          ) : (
            <div className="center-note">No active QR found yet. Generate one to begin scanning.</div>
          )}

          <div className="row wrap gap-sm top-gap-sm">
            <Button variant="primary" onClick={handleRotateQr} disabled={rotating}>
              {rotating ? <Spinner size={15} color="#1a0f00" /> : null}
              {rotating ? "Generating..." : activeQr ? "Rotate QR" : "Create QR"}
            </Button>

            <Button variant="ghost" onClick={handleDownload} disabled={!qrImageUrl || loading}>
              Download PNG
            </Button>

            <Button variant="dark" onClick={handleDownloadMaster} disabled={!activeQr?.token || loading}>
              Download Master QR
            </Button>
          </div>
          <div className="hint-panel top-gap-sm">
            <strong>Master QR</strong> is a static code that never expires. Print it for the gym wall.
            It stays valid until you click "Rotate QR" to generate a new token.
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

        <Card>
          <div className="section-title">Gym Location</div>
          <p className="section-sub">Set your gym's location to enable geofencing. Members must be within range to scan.</p>

          <div className="top-gap-sm">
            <MapPicker
              lat={geoState.lat}
              lng={geoState.lng}
              radiusMeters={geoState.radiusMeters}
              onChange={({ lat, lng, radiusMeters }) =>
                setGeoState({ lat, lng, radiusMeters })
              }
              height={300}
            />
          </div>

          <div className="top-gap-sm">
            <Input
              label="Geofence Radius (meters)"
              type="number"
              value={geoState.radiusMeters}
              onChange={(e) =>
                setGeoState((s) => ({ ...s, radiusMeters: Number(e.target.value) || 200 }))
              }
              placeholder="200"
            />
          </div>

          {geoState.lat && geoState.lng ? (
            <div className="geo-coords-display top-gap-sm">
              <span className="mono muted small">
                {Number(geoState.lat).toFixed(6)}, {Number(geoState.lng).toFixed(6)} · {geoState.radiusMeters}m radius
              </span>
            </div>
          ) : null}

          <div className="row wrap gap-sm top-gap-sm">
            <Button variant="primary" onClick={handleSaveGeo} disabled={!geoState.lat || !geoState.lng}>
              Save Location
            </Button>
            {geoState.lat && geoState.lng ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeoState({ lat: "", lng: "", radiusMeters: 200 })}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminQRPage;
