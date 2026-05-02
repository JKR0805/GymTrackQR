const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

// Helper: pad a number to 2 digits
const pad2 = (n) => String(n).padStart(2, "0");

// Format time as HH:MM in local server time (matches client's formatTime24)
const formatTime24 = (date = new Date()) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

// Format date as YYYY-MM-DD (matches client's toDateKey)
const toDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// Format duration from minutes (matches client's formatDurationFromMinutes)
const formatDurationFromMinutes = (totalMinutes) => {
  const minutes = Number.isFinite(totalMinutes) ? Math.max(totalMinutes, 0) : 0;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Helper: respond JSON with CORS-friendly headers for simple setups.
const sendJson = (res, status, body) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.status(status).json(body);
};

// generateSignedQr: verifies caller is admin, reads active QR token from Firestore
// then returns signed payload { type, version, qrCodeId, t, s }.
exports.generateSignedQr = functions.https.onRequest(async (req, res) => {
  try {
    const authHeader = req.get("Authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!idToken) {
      return sendJson(res, 401, { error: "Missing ID token" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded) {
      return sendJson(res, 403, { error: "Invalid token" });
    }

    // minimal admin check: ensure user has a custom claim 'role' === 'admin' OR uid in users collection role
    const userDoc = await admin.firestore().doc(`users/${decoded.uid}`).get();
    const role = userDoc.exists ? userDoc.data().role : null;
    if (role !== "admin") {
      return sendJson(res, 403, { error: "Insufficient permissions" });
    }

    const activeDocRef = admin.firestore().doc("qrCodes/active");
    const activeSnap = await activeDocRef.get();
    if (!activeSnap.exists) {
      return sendJson(res, 404, { error: "No active QR configured" });
    }

    const active = activeSnap.data();
    const token = active.token || "";
    const qrCodeId = activeSnap.id;
    const t = Math.floor(Date.now() / 1000);
    // Use plain SHA-256 hash (matches client-side computeShortHash)
    const sig = crypto.createHash("sha256").update(`${token}:${t}`).digest("hex").slice(0, 8);

    return sendJson(res, 200, {
      type: "gym-checkin",
      version: 1,
      qrCodeId,
      t,
      s: sig,
    });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: "Internal server error" });
  }
});

// validateScan: Accepts a scanned QR payload and the caller's ID token (member).
// Validates QR signature/time, membership, cooldown and records attendance server-side.
exports.validateScan = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return sendJson(res, 200, {});
    }

    const authHeader = req.get("Authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!idToken) {
      return sendJson(res, 401, { error: "Missing ID token" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded) return sendJson(res, 403, { error: "Invalid token" });

    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const payload = body.payload;
    if (!payload) return sendJson(res, 400, { error: "Missing payload" });

    // load active QR doc
    const activeSnap = await admin.firestore().doc("qrCodes/active").get();
    if (!activeSnap.exists) return sendJson(res, 404, { error: "No active QR configured" });
    const active = activeSnap.data();
    const token = active.token || "";

    // time window check (t === 0 means master QR, skip time check)
    if (payload.t !== 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSec - payload.t) > 60) {
        return sendJson(res, 400, { error: "QR expired or invalid" });
      }
    }

    // verify signature — plain SHA-256 to match client
    const sig = crypto.createHash("sha256").update(`${token}:${payload.t}`).digest("hex").slice(0, 8);
    if (sig !== payload.s) {
      return sendJson(res, 400, { error: "QR signature mismatch" });
    }

    // member identity
    const memberUid = decoded.uid;
    const usersRef = admin.firestore().doc(`users/${memberUid}`);
    const userSnap = await usersRef.get();
    if (!userSnap.exists) return sendJson(res, 404, { error: "Member profile not found" });
    const member = userSnap.data();

    // membership expiry check
    const todayKey = toDateKey(new Date());
    if (member.membershipExpiry && member.membershipExpiry < todayKey) {
      return sendJson(res, 403, { error: "Membership expired" });
    }
    if (!member.membershipExpiry) {
      return sendJson(res, 403, { error: "No membership expiry set. Contact admin." });
    }

    // attendance logic: get last record
    const ATT = admin.firestore().collection("attendance");
    const lastQ = ATT.where("memberId", "==", memberUid).orderBy("timestamp", "desc").limit(1);
    const lastSnap = await lastQ.get();
    let lastRecord = null;
    if (!lastSnap.empty) {
      lastRecord = { id: lastSnap.docs[0].id, ...lastSnap.docs[0].data() };
    }

    // cooldown protection (server-side): 90s
    if (lastRecord && lastRecord.timestamp) {
      const lastTs = lastRecord.timestamp.toDate ? lastRecord.timestamp.toDate().getTime() : new Date(lastRecord.timestamp).getTime();
      const diffSec = Math.round((Date.now() - lastTs) / 1000);
      if (diffSec < 90) return sendJson(res, 429, { error: "Please wait before scanning again" });
    }

    const now = admin.firestore.Timestamp.now();

    if (lastRecord && !lastRecord.exitTime) {
      // if session is older than AUTO_CLOSE_HOURS, auto-close and create new entry
      const entryTs = lastRecord.timestamp && lastRecord.timestamp.toDate ? lastRecord.timestamp.toDate() : new Date(lastRecord.timestamp);
      const hoursOpen = (Date.now() - entryTs.getTime()) / (1000 * 60 * 60);
      if (hoursOpen >= 6) {
        // close previous
        const durationMinutes = Math.max(1, Math.round((Date.now() - entryTs.getTime()) / 60000));
        await ATT.doc(lastRecord.id).update({ exitTime: formatTime24(new Date()), duration: formatDurationFromMinutes(durationMinutes), updatedAt: now, autoClosed: true });
        // create new entry
        const dateKey = toDateKey(new Date());
        const entryTime = formatTime24(new Date());
        const createdRef = await ATT.add({ memberId: memberUid, memberName: member.name || "", qrCodeId: activeSnap.id, date: dateKey, entryTime, exitTime: null, duration: null, timestamp: now });
        return sendJson(res, 200, { action: "ENTRY", displayType: "Check In", member: member.name || "", message: "Previous session auto-closed", id: createdRef.id });
      }

      // normal exit
      const exitTime = formatTime24(new Date());
      const entryDateTime = entryTs || lastRecord.timestamp;
      const entryMs = entryDateTime.toDate ? entryDateTime.toDate().getTime() : new Date(entryDateTime).getTime();
      const durationMinutes = Math.max(1, Math.round((Date.now() - entryMs) / 60000));
      await ATT.doc(lastRecord.id).update({ exitTime, duration: formatDurationFromMinutes(durationMinutes), updatedAt: now });
      return sendJson(res, 200, { action: "EXIT", displayType: "Check Out", member: member.name || "", message: "Check out recorded" });
    }

    // ENTRY flow
    const dateKey = toDateKey(new Date());
    const entryTime = formatTime24(new Date());
    const created = await ATT.add({ memberId: memberUid, memberName: member.name || "", qrCodeId: activeSnap.id, date: dateKey, entryTime, exitTime: null, duration: null, timestamp: now });
    return sendJson(res, 200, { action: "ENTRY", displayType: "Check In", member: member.name || "", id: created.id });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: "Internal server error" });
  }
});
