import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Button from "../components/Button";
import Card from "../components/Card";
import Spinner from "../components/Spinner";
import { useAttendance } from "../hooks/useAttendance";
import {
  parseQrPayloadText,
  validateQrPayloadAgainstActive,
} from "../services/qrService";
import { formatDate } from "../utils/date";

const READER_ID = "member-qr-reader";

const ScanQRPage = ({ onBack }) => {
  const { runScan, scanLoading } = useAttendance();

  const [state, setState] = useState("idle");
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [scanY, setScanY] = useState(0);

  const scannerRef = useRef(null);
  const scanHandledRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // Scanner may already be stopped.
    }

    try {
      await scanner.clear();
    } catch {
      // Clearing can fail if scanner did not fully start.
    }

    scannerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (state !== "scanning") {
      return undefined;
    }

    let direction = 1;
    let y = 0;
    let animationFrame;

    const animate = () => {
      y += direction * 1.3;
      if (y >= 100 || y <= 0) {
        direction *= -1;
      }
      setScanY(y);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [state]);

  const resetScan = () => {
    stopScanner();

    setScanError("");
    setScanResult(null);
    setState("idle");
    scanHandledRef.current = false;
  };

  const handleScanSuccess = async (decodedText) => {
    if (scanHandledRef.current) {
      return;
    }

    scanHandledRef.current = true;
    setState("processing");
    setScanError("");

    await stopScanner();

    try {
      const parsedPayload = parseQrPayloadText(decodedText);
      const validation = await validateQrPayloadAgainstActive(parsedPayload);

      if (!validation.valid) {
        throw new Error(validation.reason);
      }

      const result = await runScan({ qrCodeId: validation.qrCodeId });
      setScanResult({
        type: result.displayType,
        member: result.member,
        time: result.time,
        date: formatDate(result.date),
      });
      setState("success");
    } catch (error) {
      setScanError(error?.message || "Could not validate QR scan.");
      setState("error");
      scanHandledRef.current = false;
    }
  };

  const handleStartScan = async () => {
    setScanError("");
    scanHandledRef.current = false;
    setState("scanning");

    try {
      await stopScanner();

      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignore transient decode errors while scanning.
        }
      );
    } catch (error) {
      setScanError(
        error?.message ||
          "Unable to start camera scanner. Allow camera access and try again."
      );
      setState("error");
      scanHandledRef.current = false;
      await stopScanner();
    }
  };

  return (
    <div className="page-stack fade-in">
      <div className="page-header-row">
        <button className="back-btn" onClick={onBack}>
          ←
        </button>
        <h1 className="section-heading">Scan QR Code</h1>
      </div>

      <Card className="scanner-shell">
        {state === "idle" ? (
          <div className="scanner-state idle">
            <div className="scanner-emoji"></div>
            <p>Camera will activate when you start scanning</p>
            <Button variant="primary" size="lg" onClick={handleStartScan}>
              Start Scanner
            </Button>
          </div>
        ) : null}

        {state === "scanning" ? (
          <div className="scanner-state scanning">
            <div id={READER_ID} className="scanner-reader" />
            <div className="scanner-corners">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <div className="scan-line" style={{ top: `${scanY}%` }} />
            </div>
            <div className="scanner-caption">Align QR code within the frame</div>
            <div className="scanner-loader">
              <Spinner size={16} />
            </div>
          </div>
        ) : null}

        {state === "processing" ? (
          <div className="scanner-state scanning">
            <div className="scanner-emoji"></div>
            <p>Validating QR and recording attendance...</p>
            <Spinner size={20} />
          </div>
        ) : null}

        {state === "success" ? (
          <div className="scanner-state success">
            <div className="scanner-emoji"></div>
            <h2>{scanResult?.type}</h2>
            <p className="mono">{scanResult?.time}</p>
            <p>{scanResult?.date}</p>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="scanner-state error">
            <div className="scanner-emoji"></div>
            <h2>Scan Failed</h2>
            <p>{scanError || "Please try again with a valid gym QR."}</p>
          </div>
        ) : null}
      </Card>

      {state === "success" ? (
        <Card className="scan-result-card">
          <div className="grow">
            <div className="strong"> {scanResult?.type} Successful</div>
            <div className="mono muted">
              {scanResult?.member} · {scanResult?.time}
            </div>
          </div>
          <Button variant="dark" size="sm" onClick={resetScan}>
            Scan Again
          </Button>
        </Card>
      ) : null}

      {state === "idle" ? (
        <p className="center-note">
          Point your camera at the gym-issued QR code.
          <br />
          The system will automatically log your entry or exit.
        </p>
      ) : null}

      <div className="row gap-sm">
        {state === "scanning" || state === "processing" ? (
          <Button variant="danger" onClick={resetScan} disabled={scanLoading}>
            Cancel
          </Button>
        ) : null}

        {state !== "idle" && state !== "scanning" ? (
          <Button variant="ghost" size="sm" onClick={resetScan}>
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default ScanQRPage;
