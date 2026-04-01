import { db } from "../config/firebase.js";

export const assignFacilityRole = async ({ uid, role, facilityId }) => {
  if (!["facility_admin", "facility_user"].includes(role)) {
    throw new Error("Invalid role");
  }

  await db.ref(`users/${uid}`).update({
    role,
    facilityId
  });

  return { message: "Role assigned" };
};