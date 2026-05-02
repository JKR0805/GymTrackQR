/*
  QR Service

  - Implements a dynamic QR payload that includes a timestamp (`t`) and a short signature (`s`).
  - Signature is computed with SHA-256 over `token:timestamp` and truncated to a short hex string.
  - Payload format: { type, version, qrCodeId, t, s }
  - Validator checks that the QR is for this gym, the timestamp is recent (default 60s), and signature matches.

  This approach allows changing QR visuals every few seconds (timestamp changes) while keeping a
  stable server-side token. Admin UI generates the signed payload using the active token.
*/

import QRCode from "qrcode";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export const QR_CODES_COLLECTION = "qrCodes";
export const ACTIVE_QR_DOC_ID = "active";
export const QR_PAYLOAD_TYPE = "gym-checkin";
export const QR_PAYLOAD_VERSION = 1;

const getQrDocRef = () => doc(db, QR_CODES_COLLECTION, ACTIVE_QR_DOC_ID);

const randomToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const computeShortHash = async (token, timestampSec) => {
  try {
    const text = `${token}:${timestampSec}`;
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hash = await (crypto.subtle || crypto.webkitSubtle).digest("SHA-256", data);
    // use first 8 hex chars as short signature
    return toHex(hash).slice(0, 8);
  } catch {
    // fallback to weak hash when SubtleCrypto missing (rare)
    return String(Math.abs((token + timestampSec).split("").reduce((a, c) => a + c.charCodeAt(0), 0))).slice(-8);
  }
};

export const buildQrPayloadText = async ({ qrCodeId = ACTIVE_QR_DOC_ID, token }) => {
  const timestampSec = Math.floor(Date.now() / 1000);
  const sig = await computeShortHash(token, timestampSec);

  return JSON.stringify({
    type: QR_PAYLOAD_TYPE,
    version: QR_PAYLOAD_VERSION,
    qrCodeId,
    t: timestampSec,
    s: sig,
  });
};

/**
 * Build a "master" QR payload that never expires.
 * Uses t=0 as a sentinel value meaning "no expiry".
 * The signature is still tied to the current token, so rotating
 * the token invalidates old master QRs.
 */
export const buildStaticQrPayloadText = async ({ qrCodeId = ACTIVE_QR_DOC_ID, token }) => {
  const sig = await computeShortHash(token, 0);

  return JSON.stringify({
    type: QR_PAYLOAD_TYPE,
    version: QR_PAYLOAD_VERSION,
    qrCodeId,
    t: 0,
    s: sig,
  });
};

export const parseQrPayloadText = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(rawText);

    if (
      !parsed ||
      parsed.type !== QR_PAYLOAD_TYPE ||
      parsed.version !== QR_PAYLOAD_VERSION ||
      typeof parsed.qrCodeId !== "string" ||
      typeof parsed.t !== "number" ||
      typeof parsed.s !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const getActiveQrCode = async () => {
  const snapshot = await getDoc(getQrDocRef());
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};

export const createOrRotateActiveQrCode = async ({ createdByUid, createdByName }) => {
  const token = randomToken();

  await setDoc(
    getQrDocRef(),
    {
      id: ACTIVE_QR_DOC_ID,
      type: QR_PAYLOAD_TYPE,
      version: QR_PAYLOAD_VERSION,
      token,
      isActive: true,
      createdByUid: createdByUid || null,
      createdByName: createdByName || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  const latest = await getActiveQrCode();

  const payloadText = await buildQrPayloadText({ qrCodeId: ACTIVE_QR_DOC_ID, token });

  return {
    ...latest,
    payloadText,
  };
};

export const updateActiveQrGeo = async ({ lat, lng, radiusMeters = 200 }) => {
  await setDoc(getQrDocRef(), { geo: { lat, lng, radiusMeters } }, { merge: true });
  return await getActiveQrCode();
};

export const fetchSignedPayloadFromFunction = async (
  idToken,
  functionPath = import.meta.env.VITE_GENERATE_QR_URL || "/generateSignedQr"
) => {
  const res = await fetch(functionPath, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch signed QR: ${res.status} ${text}`);
  }

  const payload = await res.json();
  return payload;
};

export const fetchValidateScanFromFunction = async (
  idToken,
  parsedPayload,
  functionPath = import.meta.env.VITE_VALIDATE_SCAN_URL || "/validateScan"
) => {
  const res = await fetch(functionPath, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: parsedPayload }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to validate scan: ${res.status} ${text}`);
  }

  return await res.json();
};

export const validateQrPayloadAgainstActive = async (payload, windowSeconds = 60) => {
  if (!payload) {
    return {
      valid: false,
      reason: "Scanned code is not a valid gym QR payload.",
    };
  }

  const activeCode = await getActiveQrCode();

  if (!activeCode || !activeCode.isActive || !activeCode.token) {
    return {
      valid: false,
      reason: "No active admin QR code is available yet.",
    };
  }

  // QR must be for this gym
  if (payload.qrCodeId !== activeCode.id) {
    return {
      valid: false,
      reason: "QR code is not issued for this gym.",
    };
  }

  // check timestamp freshness (t === 0 means master QR, skip time check)
  if (payload.t !== 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - payload.t) > windowSeconds) {
      return {
        valid: false,
        reason: "QR expired or invalid.",
      };
    }
  }

  // recompute signature and compare
  const expectedSig = await computeShortHash(activeCode.token, payload.t);
  if (expectedSig !== payload.s) {
    return {
      valid: false,
      reason: "QR signature mismatch.",
    };
  }

  return {
    valid: true,
    qrCodeId: activeCode.id,
    activeCode,
  };
};

export const toQrDataUrl = async (payloadText) =>
  QRCode.toDataURL(payloadText, {
    width: 640,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f1422",
      light: "#ffffff",
    },
  });
