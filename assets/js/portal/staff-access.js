import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";

// Keep role checks in one place. Only the profile permission exists today;
// future permissions must be paired with matching Firestore rules.
const rolePermissions = Object.freeze({
  staff: new Set(["profile:read"]),
  "portal-admin": new Set(["profile:read"]),
});

const accessDenied = () => Object.assign(new Error("Staff access is not authorised."), { code: "permission-denied" });

export async function getAuthorisedStaffProfile(user) {
  if (!user?.uid || !user.email || user.emailVerified !== true) {
    throw accessDenied();
  }
  if (!user.providerData?.some((provider) => provider.providerId === "google.com")) {
    throw accessDenied();
  }

  const snapshot = await getDoc(doc(db, "staffProfiles", user.uid));
  if (!snapshot.exists()) throw accessDenied();
  const profile = snapshot.data();
  const authenticatedEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  const approvedEmail = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  if (profile.authUid !== user.uid || profile.isActive !== true || !authenticatedEmail || authenticatedEmail !== approvedEmail) {
    throw accessDenied();
  }
  return Object.freeze({
    staffId: profile.staffId || user.uid,
    name: typeof profile.name === "string" ? profile.name.trim() : "",
    designation: typeof profile.designation === "string" ? profile.designation.trim() : "",
    department: typeof profile.department === "string" ? profile.department.trim() : "",
    role: rolePermissions[profile.role] ? profile.role : "staff",
  });
}

export function hasPermission(profile, permission) {
  return Boolean(profile && rolePermissions[profile.role]?.has(permission));
}
