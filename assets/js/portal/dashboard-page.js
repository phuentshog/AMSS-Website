import {
  firebaseEnvironment,
  isFirebaseConfigured,
  LOCAL_EMULATOR_PROJECT_ID,
  LOCAL_EMULATOR_SETTING,
} from "./firebase-config.js";
import { userFacingError } from "./errors.js";

const status = document.querySelector("#dashboard-status");
const content = document.querySelector("#dashboard-content");
const logoutButton = document.querySelector("#portal-logout");
const thisYear = document.querySelector("#current-year");
if (thisYear) thisYear.textContent = String(new Date().getFullYear());

function showStatus(message, state = "info") {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

if (!isFirebaseConfigured) {
  const message = firebaseEnvironment.reason === "invalid-local-emulator-settings"
    ? "Local emulator mode settings are invalid. Use localhost and the exact demo project ID. No Firebase service was initialized."
    : "Portal setup is incomplete. The Firebase web key and verified Firestore rules are required before staff access is enabled.";
  showStatus(message, "error");
} else {
  try {
    const { firebaseReady } = await import("./firebase.js");
    if (!(await firebaseReady)) {
      throw Object.assign(new Error("Local emulator readiness check failed."), { code: "local-emulator-unavailable" });
    }

    const [{ watchAuth, logOut }, { getAuthorisedStaffProfile, hasPermission }] = await Promise.all([
      import("./auth-service.js"),
      import("./staff-access.js"),
    ]);
    let redirecting = false;
    let accessDenied = false;
    await watchAuth(async (user) => {
      if (!user) {
        if (accessDenied) return;
        if (!redirecting) {
          redirecting = true;
          const emulatorQuery = firebaseEnvironment.mode === "emulator"
            ? `?${LOCAL_EMULATOR_SETTING}=${LOCAL_EMULATOR_PROJECT_ID}`
            : "";
          window.location.replace(`staff-portal.html${emulatorQuery}`);
        }
        return;
      }

      showStatus("Verifying your staff access…");
      try {
        const profile = await getAuthorisedStaffProfile(user);
        if (!hasPermission(profile, "profile:read")) throw Object.assign(new Error("Permission denied."), { code: "permission-denied" });

        document.querySelector("#profile-name").textContent = profile.name || "Name not listed";
        document.querySelector("#profile-designation").textContent = profile.designation || "Designation not listed";
        if (profile.department) {
          document.querySelector("#profile-department").textContent = profile.department;
          document.querySelector("#profile-department-row").hidden = false;
        }
        if (!sessionStorage.getItem("amssPortalWelcomeShown")) {
          document.querySelector("#welcome-name").textContent = profile.name ? `, ${profile.name}` : "";
          document.querySelector(".portal-welcome-card")?.classList.add("is-new-session");
          sessionStorage.setItem("amssPortalWelcomeShown", "true");
        } else {
          document.querySelector("#welcome-name").textContent = profile.name ? `, ${profile.name}` : "";
        }

        status.hidden = true;
        content.hidden = false;
        logoutButton.hidden = false;
      } catch (error) {
        accessDenied = true;
        content.hidden = true;
        logoutButton.hidden = true;
        showStatus(userFacingError(error), "error");
        await logOut().catch(() => {});
        sessionStorage.removeItem("amssPortalWelcomeShown");
        const emulatorQuery = firebaseEnvironment.mode === "emulator"
          ? `?${LOCAL_EMULATOR_SETTING}=${LOCAL_EMULATOR_PROJECT_ID}`
          : "";
        window.setTimeout(() => window.location.replace(`staff-portal.html${emulatorQuery}`), 1800);
      }
    }, (error) => {
      content.hidden = true;
      showStatus(userFacingError(error), "error");
    });

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      showStatus("Signing you out…");
      try {
        await logOut();
        sessionStorage.removeItem("amssPortalWelcomeShown");
        window.location.replace("index.html");
      } catch (error) {
        logoutButton.disabled = false;
        showStatus(userFacingError(error), "error");
      }
    });
  } catch (error) {
    if (error?.code === "local-emulator-unavailable") {
      content.hidden = true;
      logoutButton.hidden = true;
      showStatus("The local Auth or Firestore Emulator is unavailable or failed its safety check. Dashboard access is disabled; production Firebase was not used.", "error");
    } else {
      showStatus("The Staff Portal could not start. Please try again later or contact the school office.", "error");
    }
  }
}
