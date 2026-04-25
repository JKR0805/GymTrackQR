import { getApp, getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db, firebaseConfig } from "../firebase/firebase";
import { toDateKey } from "../utils/date";

const USERS_COLLECTION = "users";
const MEMBERS_COLLECTION = "members";
const SECONDARY_APP_NAME = "gym-checkin-secondary";

const normalizeMember = (snap) => {
  const data = snap.data();
  return {
    uid: snap.id,
    ...data,
  };
};

const getSecondaryAuth = () => {
  const secondaryApp = getApps().some((app) => app.name === SECONDARY_APP_NAME)
    ? getApp(SECONDARY_APP_NAME)
    : initializeApp(firebaseConfig, SECONDARY_APP_NAME);

  return getAuth(secondaryApp);
};

export const getUserByUid = async (uid) => {
  const userSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!userSnap.exists()) {
    return null;
  }
  return {
    uid,
    ...userSnap.data(),
  };
};

export const getMembers = async () => {
  const membersQuery = query(
    collection(db, USERS_COLLECTION),
    where("role", "==", "member")
  );
  const snapshot = await getDocs(membersQuery);

  return snapshot.docs
    .map(normalizeMember)
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const createMember = async ({
  name,
  email,
  phone,
  membershipExpiry,
  status,
  joinDate,
  createAuthAccount = false,
  password,
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  let uid = doc(collection(db, USERS_COLLECTION)).id;

  if (createAuthAccount) {
    if (!password || password.length < 6) {
      throw new Error("Password is required and must be at least 6 characters.");
    }

    const secondaryAuth = getSecondaryAuth();
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      password
    );
    uid = credential.user.uid;
    await signOut(secondaryAuth);
  }

  const today = toDateKey(new Date());
  const computedStatus =
    status || (membershipExpiry && membershipExpiry >= today ? "active" : "expired");

  const userData = {
    uid,
    name: name.trim(),
    email: normalizedEmail,
    role: "member",
    membershipExpiry,
    status: computedStatus,
    phone: phone?.trim() || "",
    joinDate: joinDate || today,
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), userData);
  await setDoc(doc(db, MEMBERS_COLLECTION, uid), {
    uid,
    phone: userData.phone,
    joinDate: userData.joinDate,
  });

  return userData;
};

export const deleteMemberByUid = async (uid) => {
  await Promise.all([
    deleteDoc(doc(db, USERS_COLLECTION, uid)),
    deleteDoc(doc(db, MEMBERS_COLLECTION, uid)),
  ]);
};

export const updateMemberByUid = async (
  uid,
  { name, email, phone, membershipExpiry, status }
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone?.trim() || "";

  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      membershipExpiry,
      status,
    },
    { merge: true }
  );

  await setDoc(
    doc(db, MEMBERS_COLLECTION, uid),
    {
      uid,
      phone: normalizedPhone,
    },
    { merge: true }
  );
};
