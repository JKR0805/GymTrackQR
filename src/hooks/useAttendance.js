import { useCallback, useState } from "react";
import {
  getAllAttendanceLogs,
  getMemberAttendanceLogs,
  recordAttendanceFromScan,
} from "../services/attendanceService";
import { fetchValidateScanFromFunction } from "../services/qrService";
import { useAuth } from "./useAuth";

export const useAttendance = () => {
  const { userProfile, firebaseUser } = useAuth();

  const [memberLogs, setMemberLogs] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [memberLogsLoading, setMemberLogsLoading] = useState(false);
  const [adminLogsLoading, setAdminLogsLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMemberLogs = useCallback(async (filters = {}) => {
    if (!userProfile?.uid) {
      return [];
    }

    setMemberLogsLoading(true);
    setError("");

    try {
      const logs = await getMemberAttendanceLogs(userProfile.uid, filters);
      setMemberLogs(logs);
      return logs;
    } catch (error) {
      setError(error?.message || "Failed to load member logs.");
      throw error;
    } finally {
      setMemberLogsLoading(false);
    }
  }, [userProfile?.uid]);

  const loadAdminLogs = useCallback(async () => {
    setAdminLogsLoading(true);
    setError("");

    try {
      const logs = await getAllAttendanceLogs();
      setAdminLogs(logs);
      return logs;
    } catch (error) {
      setError(error?.message || "Failed to load attendance logs.");
      throw error;
    } finally {
      setAdminLogsLoading(false);
    }
  }, []);

  const runScan = useCallback(async (scanContext = {}) => {
    if (!userProfile?.uid) {
      throw new Error("Missing authenticated user.");
    }

    setScanLoading(true);
    setError("");

    try {
      // Attempt server-side validation if we have a user token AND a signed QR payload
      const hasSignedPayload = scanContext.t != null && scanContext.s != null;
      if (firebaseUser && hasSignedPayload) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const parsedPayload = { qrCodeId: scanContext.qrCodeId, t: scanContext.t, s: scanContext.s };
          const result = await fetchValidateScanFromFunction(idToken, parsedPayload);
          return result;
        } catch (err) {
          // Only fall back to client-side for network/infrastructure errors.
          // Application-level rejections (4xx) must propagate to the user.
          const msg = err?.message || "";
          const isAppError = msg.includes("expired") || msg.includes("cooldown") ||
            msg.includes("mismatch") || msg.includes("wait") ||
            msg.includes("Membership") || msg.includes("No membership");
          if (isAppError) {
            throw err;
          }
          // Network/infra error — fall through to client-side
        }
      }

      return await recordAttendanceFromScan({
        uid: userProfile.uid,
        name: userProfile.name,
        qrCodeId: scanContext.qrCodeId,
      });
    } catch (error) {
      setError(error?.message || "Failed to record attendance.");
      throw error;
    } finally {
      setScanLoading(false);
    }
  }, [userProfile, firebaseUser]);

  return {
    memberLogs,
    adminLogs,
    memberLogsLoading,
    adminLogsLoading,
    scanLoading,
    error,
    loadMemberLogs,
    loadAdminLogs,
    runScan,
  };
};
