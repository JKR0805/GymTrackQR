import { getUserByUid } from "./userService";
import { toDateKey } from "../utils/date";

export const getMemberProfile = async (uid) => {
  return await getUserByUid(uid);
};

export const isMembershipValid = (memberProfile) => {
  if (!memberProfile) return false;
  if (!memberProfile.membershipExpiry) return false;
  const today = toDateKey(new Date());
  return memberProfile.membershipExpiry >= today;
};

export default {
  getMemberProfile,
  isMembershipValid,
};
