import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  formatDurationFromMinutes,
  formatTime12,
  formatTime24,
  parseDateAndTime,
  toDateKey,
} from "../utils/date";

const ATTENDANCE_COLLECTION = "attendance";

const toLog = (snap) => {
  const data = snap.data();
  const ts =
    data.timestamp && typeof data.timestamp.toDate === "function"
      ? data.timestamp.toDate()
      : parseDateAndTime(data.date, data.entryTime) || new Date();

  return {
    id: snap.id,
    ...data,
    timestamp: ts,
  };
};

const buildScanEntryPayload = ({ memberId, memberName, qrCodeId }) => {
  const now = new Date();

  return {
    memberId,
    memberName,
    qrCodeId,
    date: toDateKey(now),
    entryTime: formatTime24(now),
    exitTime: null,
    duration: null,
    timestamp: Timestamp.fromDate(now),
  };
};

export const getLastAttendanceRecord = async (memberId) => {
  const recordQuery = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("memberId", "==", memberId),
    orderBy("timestamp", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(recordQuery);

  if (snapshot.empty) {
    return null;
  }

  return toLog(snapshot.docs[0]);
};

export const createEntryRecord = async ({ memberId, memberName, qrCodeId }) => {
  const payload = buildScanEntryPayload({ memberId, memberName, qrCodeId });
  const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), payload);

  return {
    id: docRef.id,
    ...payload,
    timestamp: payload.timestamp.toDate(),
  };
};

export const closeOpenRecord = async (record) => {
  const now = new Date();
  const entryDateTime = parseDateAndTime(record.date, record.entryTime) || record.timestamp;
  const durationMinutes = Math.max(
    1,
    Math.round((now.getTime() - entryDateTime.getTime()) / 60000)
  );

  const payload = {
    exitTime: formatTime24(now),
    duration: formatDurationFromMinutes(durationMinutes),
    updatedAt: Timestamp.fromDate(now),
  };

  await updateDoc(doc(db, ATTENDANCE_COLLECTION, record.id), payload);

  return {
    ...record,
    ...payload,
  };
};

export const recordAttendanceFromScan = async ({ uid, name, qrCodeId }) => {
  if (!qrCodeId) {
    throw new Error("Scan rejected because QR context is missing.");
  }

  const lastRecord = await getLastAttendanceRecord(uid);

  if (lastRecord && !lastRecord.exitTime) {
    const updated = await closeOpenRecord(lastRecord);

    return {
      action: "EXIT",
      displayType: "Check Out",
      member: name,
      date: updated.date,
      time: formatTime12(parseDateAndTime(updated.date, updated.exitTime)),
      log: updated,
    };
  }

  const created = await createEntryRecord({
    memberId: uid,
    memberName: name,
    qrCodeId,
  });

  return {
    action: "ENTRY",
    displayType: "Check In",
    member: name,
    date: created.date,
    time: formatTime12(parseDateAndTime(created.date, created.entryTime)),
    log: created,
  };
};

export const getMemberAttendanceLogs = async (memberId, filters = {}) => {
  const memberQuery = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("memberId", "==", memberId),
    orderBy("timestamp", "desc")
  );

  const snapshot = await getDocs(memberQuery);
  const logs = snapshot.docs.map(toLog);

  return logs.filter((log) => {
    if (filters.from && log.date < filters.from) {
      return false;
    }
    if (filters.to && log.date > filters.to) {
      return false;
    }
    return true;
  });
};

export const getAllAttendanceLogs = async () => {
  const logsQuery = query(
    collection(db, ATTENDANCE_COLLECTION),
    orderBy("timestamp", "desc")
  );

  const snapshot = await getDocs(logsQuery);
  return snapshot.docs.map(toLog);
};
