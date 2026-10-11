// Public Firebase web-app settings for the existing AMSS project.
// These values are identifiers, not secrets. Never put service-account keys here.
export const firebaseConfig = {
  apiKey: "AIzaSyBVk5yzV4HE7fwh2m3lgztsmSX0d7eWBPI",
  authDomain: "amss-staff-portal.firebaseapp.com",
  projectId: "amss-staff-portal",
  appId: "1:700997999124:web:8d3fc9086b68d18cbaa501",
  messagingSenderId: "700997999124",
};

// Release lock: keep false until the Firestore rules have been deployed and tested.
// This is a rollout guard only. Firestore Security Rules remain the security boundary.
export const firestoreRulesVerified = true;

export const LOCAL_EMULATOR_PROJECT_ID = "demo-amss-staff-portal";
export const LOCAL_EMULATOR_SETTING = "amss-emulator";

function hasValidProductionConfig(config) {
  return config.projectId === "amss-staff-portal"
    && Object.values(config).every((value) => value && !value.startsWith("REPLACE_"));
}

export function resolveFirebaseEnvironment(locationLike, rulesVerified, config) {
  if (locationLike?.searchParams?.has(LOCAL_EMULATOR_SETTING)) {
    const settings = locationLike.searchParams.getAll(LOCAL_EMULATOR_SETTING);
    const isLoopback = locationLike.hostname === "localhost" || locationLike.hostname === "127.0.0.1";
    if (settings.length !== 1
      || settings[0] !== LOCAL_EMULATOR_PROJECT_ID
      || !isLoopback
      || locationLike.protocol !== "http:") {
      return { mode: "disabled", reason: "invalid-local-emulator-settings" };
    }
    return { mode: "emulator", projectId: LOCAL_EMULATOR_PROJECT_ID };
  }

  if (rulesVerified && hasValidProductionConfig(config)) {
    return { mode: "production", projectId: config.projectId };
  }

  return { mode: "disabled", reason: "portal-not-enabled" };
}

const currentLocation = typeof window === "undefined" ? null : window.location;
const currentLocationLike = currentLocation && {
  hostname: currentLocation.hostname,
  protocol: currentLocation.protocol,
  searchParams: new URLSearchParams(currentLocation.search),
};

export const firebaseEnvironment = resolveFirebaseEnvironment(
  currentLocationLike,
  firestoreRulesVerified,
  firebaseConfig,
);

export const isFirebaseConfigured = firebaseEnvironment.mode !== "disabled";
