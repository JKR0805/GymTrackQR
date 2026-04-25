import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const log = (message) => {
  console.log(`[seed] ${message}`);
};

const resolveServiceCredential = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      return cert(json);
    } catch (error) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON."
      );
    }
  }

  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const defaultPath = path.join(projectRoot, "serviceAccountKey.json");

  const keyPath = explicitPath
    ? path.isAbsolute(explicitPath)
      ? explicitPath
      : path.join(projectRoot, explicitPath)
    : fs.existsSync(defaultPath)
      ? defaultPath
      : null;

  if (keyPath) {
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Service account file not found at: ${keyPath}`);
    }

    try {
      const raw = fs.readFileSync(keyPath, "utf8");
      const json = JSON.parse(raw);
      return cert(json);
    } catch (error) {
      throw new Error(
        `Failed to parse service account JSON at ${keyPath}: ${error.message}`
      );
    }
  }

  return applicationDefault();
};

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const credential = resolveServiceCredential();

if (!getApps().length) {
  initializeApp(
    projectId
      ? {
          credential,
          projectId,
        }
      : {
          credential,
        }
  );
}

const auth = getAuth();
const db = getFirestore();
const ACTIVE_QR_DOC_ID = "active";
const SEEDED_QR_TOKEN =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const usersToSeed = [
  {
    key: "admin-ravi",
    name: "Coach Ravi",
    email: "admin.ravi@gym.com",
    password: "Admin@1234",
    role: "admin",
    membershipExpiry: "2099-12-31",
    status: "active",
    phone: "9000000001",
    joinDate: "2024-01-15",
  },
  {
    key: "admin-neha",
    name: "Manager Neha",
    email: "admin.neha@gym.com",
    password: "Admin@1234",
    role: "admin",
    membershipExpiry: "2099-12-31",
    status: "active",
    phone: "9000000002",
    joinDate: "2024-02-01",
  },
  {
    key: "member-arjun",
    name: "Arjun Mehta",
    email: "arjun@gmail.com",
    password: "Member@123",
    role: "member",
    membershipExpiry: "2026-12-31",
    status: "active",
    phone: "9876543210",
    joinDate: "2024-08-15",
  },
  {
    key: "member-priya",
    name: "Priya Sharma",
    email: "priya@gmail.com",
    password: "Member@123",
    role: "member",
    membershipExpiry: "2025-02-15",
    status: "expired",
    phone: "9123456789",
    joinDate: "2024-01-10",
  },
  {
    key: "member-karan",
    name: "Karan Nair",
    email: "karan@gmail.com",
    password: "Member@123",
    role: "member",
    membershipExpiry: "2027-03-01",
    status: "active",
    phone: "9988776655",
    joinDate: "2024-11-05",
  },
];

const attendanceSeed = [
  {
    id: "seed-arjun-2026-04-24",
    memberKey: "member-arjun",
    date: "2026-04-24",
    entryTime: "06:30",
    exitTime: "07:50",
    duration: "1h 20m",
  },
  {
    id: "seed-arjun-2026-04-25",
    memberKey: "member-arjun",
    date: "2026-04-25",
    entryTime: "06:28",
    exitTime: "07:55",
    duration: "1h 27m",
  },
  {
    id: "seed-priya-2026-04-25",
    memberKey: "member-priya",
    date: "2026-04-25",
    entryTime: "09:00",
    exitTime: "10:15",
    duration: "1h 15m",
  },
  {
    id: "seed-karan-2026-04-26",
    memberKey: "member-karan",
    date: "2026-04-26",
    entryTime: "07:10",
    exitTime: "08:45",
    duration: "1h 35m",
  },
  {
    id: "seed-arjun-open-2026-04-26",
    memberKey: "member-arjun",
    date: "2026-04-26",
    entryTime: "18:05",
    exitTime: null,
    duration: null,
  },
];

const asDate = (date, time) => new Date(`${date}T${time}:00`);

const seedActiveQrCode = async () => {
  await db.collection("qrCodes").doc(ACTIVE_QR_DOC_ID).set(
    {
      id: ACTIVE_QR_DOC_ID,
      type: "gym-checkin",
      version: 1,
      token: SEEDED_QR_TOKEN,
      isActive: true,
      createdByUid: "seed-script",
      createdByName: "Seed Script",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      seed: true,
    },
    { merge: true }
  );

  log("upserted active qrCodes/active record");
};

const ensureAuthUser = async ({ email, password, name }) => {
  try {
    const existing = await auth.getUserByEmail(email);

    await auth.updateUser(existing.uid, {
      displayName: name,
      password,
      emailVerified: true,
    });

    return { uid: existing.uid, created: false };
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    const created = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });

    return { uid: created.uid, created: true };
  }
};

const seedUsersAndMembers = async () => {
  const seeded = new Map();

  for (const user of usersToSeed) {
    const authRecord = await ensureAuthUser(user);
    const uid = authRecord.uid;

    const userDoc = {
      uid,
      name: user.name,
      email: user.email,
      role: user.role,
      membershipExpiry: user.membershipExpiry,
      status: user.status,
      phone: user.phone,
      joinDate: user.joinDate,
    };

    await db.collection("users").doc(uid).set(userDoc, { merge: true });

    if (user.role === "member") {
      await db.collection("members").doc(uid).set(
        {
          uid,
          phone: user.phone,
          joinDate: user.joinDate,
        },
        { merge: true }
      );
    }

    seeded.set(user.key, {
      uid,
      name: user.name,
      role: user.role,
      createdAuthUser: authRecord.created,
    });

    log(
      `${authRecord.created ? "created" : "updated"} auth user and profile for ${
        user.email
      } (${user.role})`
    );
  }

  return seeded;
};

const seedAttendance = async (seededUsers) => {
  for (const row of attendanceSeed) {
    const member = seededUsers.get(row.memberKey);
    if (!member) {
      throw new Error(`Missing member for attendance seed key: ${row.memberKey}`);
    }

    const entryDate = asDate(row.date, row.entryTime);

    const payload = {
      memberId: member.uid,
      memberName: member.name,
      qrCodeId: ACTIVE_QR_DOC_ID,
      date: row.date,
      entryTime: row.entryTime,
      exitTime: row.exitTime,
      duration: row.duration,
      timestamp: Timestamp.fromDate(entryDate),
      updatedAt:
        row.exitTime && row.duration
          ? Timestamp.fromDate(asDate(row.date, row.exitTime))
          : null,
      seed: true,
    };

    await db.collection("attendance").doc(row.id).set(payload, { merge: true });
    log(`upserted attendance log: ${row.id}`);
  }
};

const main = async () => {
  log("starting firestore seed...");

  const seededUsers = await seedUsersAndMembers();
  await seedActiveQrCode();
  await seedAttendance(seededUsers);

  log("seed completed successfully.");
  log("default seeded credentials:");
  for (const user of usersToSeed) {
    log(`- ${user.role}: ${user.email} / ${user.password}`);
  }
};

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exitCode = 1;
});
