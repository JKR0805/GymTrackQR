import { useCallback, useState } from "react";
import {
  getAllAttendanceLogs,
  getMemberAttendanceLogs,
  recordAttendanceFromScan,
} from "../services/attendanceService";
import { useAuth } from "./useAuth";

export const useAttendance = () => {
  const { userProfile } = useAuth();

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
  }, [userProfile]);

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
