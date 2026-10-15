import { loadDashboardSnapshot, loadVerifiedStaffProfile } from "./dashboard-data.js";

const thisYear = document.querySelector("#current-year");
if (thisYear) thisYear.textContent = String(new Date().getFullYear());

const menuToggle = document.querySelector(".dashboard-menu-toggle");
const dashboardNavigation = document.querySelector("#dashboard-navigation");
const mobileNavigation = window.matchMedia("(max-width: 760px)");

function setNavigationOpen(isOpen) {
  if (!menuToggle || !dashboardNavigation) return;
  dashboardNavigation.classList.toggle("is-open", isOpen);
  dashboardNavigation.classList.toggle("is-collapsed", mobileNavigation.matches && !isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close dashboard navigation" : "Open dashboard navigation");
}

setNavigationOpen(false);

menuToggle?.addEventListener("click", () => {
  setNavigationOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

dashboardNavigation?.addEventListener("click", (event) => {
  if (mobileNavigation.matches && event.target.closest("a")) setNavigationOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    setNavigationOpen(false);
    menuToggle.focus();
  }
});

mobileNavigation.addEventListener("change", () => setNavigationOpen(false));

function safeDestination(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const destination = new URL(value, window.location.href);
    if (destination.protocol !== "https:" && destination.origin !== window.location.origin) return null;
    return destination;
  } catch {
    return null;
  }
}

function addTextElement(parent, tagName, className, value) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = typeof value === "string" ? value : "";
  parent.append(element);
  return element;
}

function renderEntries(items, list, emptyState, kind) {
  if (!list || !emptyState) return;
  list.replaceChildren();
  const entries = Array.isArray(items) ? items : [];
  emptyState.hidden = entries.length > 0;

  for (const entry of entries) {
    if (!entry || typeof entry.title !== "string" || !entry.title.trim()) continue;
    const card = document.createElement("article");
    card.className = "dashboard-entry";

    if (kind === "announcement" && entry.important === true) {
      addTextElement(card, "span", "important-label", "Important notice");
    }

    addTextElement(card, "h3", "", entry.title);
    if (typeof entry.description === "string" && entry.description.trim()) {
      addTextElement(card, "p", "", entry.description);
    }

    const metadata = document.createElement("div");
    metadata.className = "dashboard-entry-meta";
    if (typeof entry.date === "string" && entry.date.trim()) {
      const date = addTextElement(metadata, "time", "", entry.date);
      date.dateTime = entry.date;
    }
    const issuingOffice = entry.author || entry.issuingOffice || entry.category;
    if (typeof issuingOffice === "string" && issuingOffice.trim()) {
      addTextElement(metadata, "span", "", issuingOffice);
    }
    if (metadata.childElementCount) card.append(metadata);

    const destination = safeDestination(entry.url);
    if (destination) {
      const link = addTextElement(card, "a", "", kind === "announcement" ? "Read full announcement" : "Open resource");
      link.href = destination.href;
      if (destination.origin !== window.location.origin) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    }

    list.append(card);
  }
  emptyState.hidden = list.childElementCount > 0;
}

function updateEmptyState(selector, title, description) {
  const emptyState = document.querySelector(selector);
  if (!emptyState) return;
  const heading = emptyState.querySelector("strong");
  const detail = emptyState.querySelector("p");
  if (heading) heading.textContent = title;
  if (detail) detail.textContent = description;
  emptyState.hidden = false;
}

function renderDirectory(items, query = "") {
  const status = document.querySelector("#directory-status");
  const results = document.querySelector("#directory-results");
  if (!status || !results) return;

  const records = Array.isArray(items) ? items : [];
  const term = query.trim().toLocaleLowerCase();
  const matches = records.filter((record) => {
    const searchable = [record?.name, record?.department, record?.subject, record?.designation]
      .filter((value) => typeof value === "string")
      .join(" ")
      .toLocaleLowerCase();
    return searchable.includes(term);
  });

  results.replaceChildren();
  for (const record of matches) {
    if (!record || typeof record.name !== "string" || !record.name.trim()) continue;
    const card = document.createElement("article");
    card.className = "directory-entry";
    addTextElement(card, "strong", "", record.name);
    const details = [record.designation, record.department || record.subject]
      .filter((value) => typeof value === "string" && value.trim());
    if (details.length) addTextElement(card, "p", "", details.join(" · "));
    if (typeof record.officialContact === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.officialContact)) {
      const contact = addTextElement(card, "a", "", record.officialContact);
      contact.href = `mailto:${record.officialContact}`;
    }
    results.append(card);
  }

  if (!records.length) {
    status.textContent = term
      ? "The directory is empty, so there are no profiles to match yet."
      : "The directory is empty until an authorised data source is connected.";
  } else {
    status.textContent = matches.length
      ? `${matches.length} staff profile${matches.length === 1 ? "" : "s"} found.`
      : "No profiles match that search.";
  }
}

const directorySearch = document.querySelector("#directory-search");
const directoryClear = document.querySelector("#directory-clear");
let directoryRecords = [];

updateEmptyState("#announcements-empty", "Loading announcements…", "Checking for authorised school notices.");
updateEmptyState("#resources-empty", "Loading teaching resources…", "Checking for authorised learning materials.");
updateEmptyState("#examinations-empty", "Loading examination information…", "Checking for authorised staff resources.");
const directoryStatus = document.querySelector("#directory-status");
if (directoryStatus) directoryStatus.textContent = "Loading the authorised staff directory…";

directorySearch?.addEventListener("input", () => {
  directoryClear.hidden = !directorySearch.value;
  renderDirectory(directoryRecords, directorySearch.value);
});

directoryClear?.addEventListener("click", () => {
  if (!directorySearch) return;
  directorySearch.value = "";
  directoryClear.hidden = true;
  renderDirectory(directoryRecords);
  directorySearch.focus();
});

try {
  const [snapshot, verifiedProfile] = await Promise.all([
    loadDashboardSnapshot(),
    loadVerifiedStaffProfile()
  ]);

  updateEmptyState("#announcements-empty", "No announcements available yet.", "New notices can be added here without changing the dashboard layout.");
  updateEmptyState("#resources-empty", "No teaching resources connected yet.", "Authorised resource links will appear here when a protected source is available.");
  updateEmptyState("#examinations-empty", "No staff examination resources available yet.", "Unpublished results and private examination materials are not stored on this public page.");

  renderEntries(snapshot?.announcements, document.querySelector("#announcement-list"), document.querySelector("#announcements-empty"), "announcement");
  renderEntries(snapshot?.teachingResources, document.querySelector("#resource-list"), document.querySelector("#resources-empty"), "resource");
  renderEntries(snapshot?.examinationInformation, document.querySelector("#examination-list"), document.querySelector("#examinations-empty"), "examination");

  directoryRecords = Array.isArray(snapshot?.staffDirectory) ? snapshot.staffDirectory : [];
  renderDirectory(directoryRecords, directorySearch?.value || "");

  const displayName = typeof verifiedProfile?.displayName === "string" ? verifiedProfile.displayName.trim() : "";
  if (verifiedProfile?.verified === true && displayName) {
    const greeting = document.querySelector("#welcome-heading");
    const profileName = document.querySelector("#profile-name");
    const profileStatus = document.querySelector("#profile-status");
    const profileMark = document.querySelector(".portal-profile-mark");
    if (greeting) greeting.textContent = `Welcome, ${displayName}`;
    if (profileName) profileName.textContent = displayName;
    if (profileStatus) profileStatus.textContent = "Verified staff profile";
    if (profileMark) profileMark.textContent = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }
} catch {
  updateEmptyState("#announcements-empty", "Announcements are temporarily unavailable.", "Please try again later.");
  updateEmptyState("#resources-empty", "Teaching resources are temporarily unavailable.", "Please try again later.");
  updateEmptyState("#examinations-empty", "Examination information is temporarily unavailable.", "Please try again later.");
  const directoryStatus = document.querySelector("#directory-status");
  if (directoryStatus) directoryStatus.textContent = "Staff directory information is temporarily unavailable.";
  const profileStatus = document.querySelector("#profile-status");
  if (profileStatus) profileStatus.textContent = "Profile information unavailable";
}
