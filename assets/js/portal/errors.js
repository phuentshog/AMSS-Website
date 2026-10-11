const messages = {
  "auth/popup-closed-by-user": "Sign-in was cancelled. You can try again when ready.",
  "auth/cancelled-popup-request": "Another sign-in request is already open.",
  "auth/network-request-failed": "A network issue interrupted sign-in. Check your connection and try again.",
  "auth/unauthorized-domain": "This website address is not yet allowed in Firebase Authentication.",
  "auth/operation-not-allowed": "Google sign-in has not been enabled for this portal yet.",
  "auth/too-many-requests": "Sign-in is temporarily unavailable. Please try again later.",
};

export function userFacingError(error) {
  if (error?.code === "permission-denied" || error?.code === "not-found") {
    return "This Google account is not authorised for the Staff Portal. If you believe this is an error, contact the school office.";
  }
  return messages[error?.code] || "The Staff Portal could not complete that request. Please try again or contact the school office.";
}
