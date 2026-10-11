import {
  firebaseEnvironment,
  isFirebaseConfigured,
  LOCAL_EMULATOR_PROJECT_ID,
  LOCAL_EMULATOR_SETTING,
} from "./firebase-config.js";
import { userFacingError } from "./errors.js";

const status = document.querySelector("#portal-status");
const form = document.querySelector("#portal-login-form");
const submit = form?.querySelector('button[type="submit"]');
const homeLink = document.querySelector("#portal-home-link");
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
    : "Portal setup is incomplete. The Firebase web key and verified Firestore rules are required before staff sign-in is enabled.";
  showStatus(message, "error");
} else {
  try {
    const { firebaseReady } = await import("./firebase.js");
    if (!(await firebaseReady)) {
      throw Object.assign(new Error("Local emulator readiness check failed."), { code: "local-emulator-unavailable" });
    }

    const [{ watchAuth, beginGoogleSignIn, finishGoogleRedirect }, { getAuthorisedStaffProfile }] = await Promise.all([
      import("./auth-service.js"),
      import("./staff-access.js"),
    ]);
    let accessDenied = false;
    let redirectError = null;
    form.hidden = false;
    showStatus("Checking for an existing staff session…");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      accessDenied = false;
      submit.disabled = true;
      showStatus("Connecting to Google…");
      try {
        await beginGoogleSignIn(Boolean(document.querySelector("#remember-device")?.checked));
      } catch (error) {
        submit.disabled = false;
        showStatus(userFacingError(error), "error");
      }
    });

    try {
      await finishGoogleRedirect();
    } catch (error) {
      redirectError = error;
      showStatus(userFacingError(error), "error");
    }

    await watchAuth(async (user) => {
      if (accessDenied && !user) return;
      if (!user) {
        submit.disabled = false;
        if (redirectError) showStatus(userFacingError(redirectError), "error");
        else showStatus("Continue with your authorised school Google account.");
        return;
      }

      submit.disabled = true;
      showStatus("Google sign-in complete. Verifying your staff access…");
      try {
        await getAuthorisedStaffProfile(user);
        sessionStorage.removeItem("amssPortalWelcomeShown");
        const emulatorQuery = firebaseEnvironment.mode === "emulator"
          ? `?${LOCAL_EMULATOR_SETTING}=${LOCAL_EMULATOR_PROJECT_ID}`
          : "";
        window.location.replace(`staff-dashboard.html${emulatorQuery}`);
      } catch (error) {
        accessDenied = true;
        await import("./auth-service.js").then(({ logOut }) => logOut()).catch(() => {});
        sessionStorage.removeItem("amssPortalWelcomeShown");
        submit.disabled = false;
        homeLink.hidden = false;
        showStatus(userFacingError(error), "error");
      }
    }, (error) => {
      submit.disabled = false;
      showStatus(userFacingError(error), "error");
    });
  } catch (error) {
    if (error?.code === "local-emulator-unavailable") {
      showStatus("The local Auth or Firestore Emulator is unavailable or failed its safety check. Sign-in is disabled; production Firebase was not used.", "error");
    } else {
      showStatus("The Staff Portal could not start. Please try again later or contact the school office.", "error");
    }
  }
}
