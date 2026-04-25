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

export const buildQrPayloadText = ({ qrCodeId = ACTIVE_QR_DOC_ID, token }) =>
  JSON.stringify({
    type: QR_PAYLOAD_TYPE,
    version: QR_PAYLOAD_VERSION,
    qrCodeId,
    token,
  });

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
      typeof parsed.token !== "string"
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

  return {
    ...latest,
    payloadText: buildQrPayloadText({
      qrCodeId: ACTIVE_QR_DOC_ID,
      token,
    }),
  };
};

export const validateQrPayloadAgainstActive = async (payload) => {
  if (!payload) {
    return {
      valid: false,
      reason: "Scanned code is not a valid IRONTRACK QR payload.",
    };
  }

  const activeCode = await getActiveQrCode();

  if (!activeCode || !activeCode.isActive || !activeCode.token) {
    return {
      valid: false,
      reason: "No active admin QR code is available yet.",
    };
  }

  if (payload.qrCodeId !== activeCode.id || payload.token !== activeCode.token) {
    return {
      valid: false,
      reason: "QR code is expired or not issued by this gym.",
    };
  }

  return {
    valid: true,
    qrCodeId: activeCode.id,
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
