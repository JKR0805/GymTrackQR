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
import { getUserByUid } from "./userService";

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

const COOLDOWN_SECONDS = 90; // ignore scans within 1.5 minutes
const AUTO_CLOSE_HOURS = 4; // auto-close sessions older than this

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
  // Always use the Firestore timestamp for duration — it's the most accurate source
  const entryDateTime = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
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

  // cooldown protection
  if (lastRecord && lastRecord.timestamp) {
    const lastTs = lastRecord.timestamp instanceof Timestamp ? lastRecord.timestamp.toDate() : lastRecord.timestamp;
    const now = new Date();
    const diffSec = Math.round((now.getTime() - lastTs.getTime()) / 1000);
    if (diffSec < COOLDOWN_SECONDS) {
      throw new Error("Please wait before scanning again.");
    }
  }

  // load member profile and validate membership for ENTRY
  const memberProfile = await getUserByUid(uid);

  // if there is an open session
  if (lastRecord && !lastRecord.exitTime) {
    // auto-close long sessions first
    const entryTs = lastRecord.timestamp instanceof Timestamp ? lastRecord.timestamp.toDate() : lastRecord.timestamp;
    const hoursOpen = (Date.now() - entryTs.getTime()) / (1000 * 60 * 60);

    if (hoursOpen >= AUTO_CLOSE_HOURS) {
      // mark previous as auto-closed
      const closed = await closeOpenRecord(lastRecord);
      await updateDoc(doc(db, ATTENDANCE_COLLECTION, lastRecord.id), { autoClosed: true });

      // create a fresh entry for this scan — validate membership first
      if (!memberProfile?.membershipExpiry) {
        throw new Error("No membership expiry set. Contact admin.");
      }
      const todayKey = toDateKey(new Date());
      if (memberProfile.membershipExpiry < todayKey) {
        throw new Error("Membership expired. Please renew.");
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
        note: "Previous session auto-closed",
      };
    }

    // normal exit flow
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

  // ENTRY flow - validate membership expiry
  if (!memberProfile?.membershipExpiry) {
    throw new Error("No membership expiry set. Contact admin.");
  }
  const todayKey = toDateKey(new Date());
  if (memberProfile.membershipExpiry < todayKey) {
    throw new Error("Membership expired. Please renew.");
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

export const getActiveSessions = async () => {
  const activeQuery = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("exitTime", "==", null),
    orderBy("timestamp", "desc")
  );

  const snapshot = await getDocs(activeQuery);
  return snapshot.docs.map(toLog);
};

export const autoCloseStaleSessions = async () => {
  const openSessions = await getActiveSessions();
  const now = Date.now();
  
  const staleSessions = openSessions.filter((session) => {
    const entryTs = session.timestamp instanceof Date ? session.timestamp : new Date(session.timestamp);
    const hoursOpen = (now - entryTs.getTime()) / (1000 * 60 * 60);
    return hoursOpen >= AUTO_CLOSE_HOURS;
  });

  const promises = staleSessions.map(async (session) => {
    await closeOpenRecord(session);
    await updateDoc(doc(db, ATTENDANCE_COLLECTION, session.id), { autoClosed: true });
  });

  await Promise.all(promises);
  return staleSessions.length;
};

export const getPeakHours = (logs = []) => {
  const counts = {};
  logs.forEach((log) => {
    const hour = new Date(log.timestamp).getHours();
    counts[hour] = (counts[hour] || 0) + 1;
  });
  return counts; // caller can map to array or pick top N
};

export const exportLogsCsv = async (logs = null) => {
  const rows = logs || (await getAllAttendanceLogs());
  const header = ["Name", "Date", "Entry", "Exit", "Duration"].join(",");
  const lines = rows.map((r) => {
    const name = (r.memberName || "").replace(/"/g, '""');
    return [
      `"${name}"`,
      r.date,
      r.entryTime || "",
      r.exitTime || "",
      r.duration || "",
    ].join(",");
  });

  return [header].concat(lines).join("\n");
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
