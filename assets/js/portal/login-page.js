import { APPS_SCRIPT_GATEWAY_URL } from "./gateway-config.js";

const status = document.querySelector("#portal-status");
const form = document.querySelector("#portal-login-form");
const submit = form?.querySelector('button[type="submit"]');
const thisYear = document.querySelector("#current-year");
if (thisYear) thisYear.textContent = String(new Date().getFullYear());

function showStatus(message, state = "info") {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function validGatewayUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "script.google.com"
      && !url.port
      && /^\/macros\/s\/[^/]+\/exec\/?$/.test(url.pathname)
      && !url.search
      && !url.hash
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

const gatewayConfigured = validGatewayUrl(APPS_SCRIPT_GATEWAY_URL);

if (!gatewayConfigured) {
  showStatus("The secure school login gateway is not configured yet. Please contact the school administrator.", "error");
  if (form) form.hidden = true;
  if (submit) submit.disabled = true;
  const homeLink = document.querySelector("#portal-home-link");
  if (homeLink) homeLink.hidden = true;
} else {
  if (form) form.hidden = false;
  showStatus("Continue to the school’s secure Google sign-in and access check.");
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!gatewayConfigured) return;
  if (submit) submit.disabled = true;
  showStatus("Opening the school’s secure sign-in page…");
  window.location.assign(APPS_SCRIPT_GATEWAY_URL);
});

export { validGatewayUrl };
