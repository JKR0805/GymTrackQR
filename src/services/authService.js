import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

export const getUserProfileByUid = async (uid) => {
  const userDoc = await getDoc(doc(db, "users", uid));

  if (!userDoc.exists()) {
    throw new Error("User profile not found in /users collection.");
  }

  return {
    uid,
    ...userDoc.data(),
  };
};

export const loginWithEmail = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfileByUid(credential.user.uid);

  return {
    firebaseUser: credential.user,
    profile,
  };
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (onChange) =>
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      onChange({ firebaseUser: null, profile: null, error: null });
      return;
    }

    try {
      const profile = await getUserProfileByUid(firebaseUser.uid);
      onChange({ firebaseUser, profile, error: null });
    } catch (error) {
      onChange({ firebaseUser, profile: null, error });
    }
  });
