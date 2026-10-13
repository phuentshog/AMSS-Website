// This GitHub Pages dashboard is intentionally a public, static shell.
// Apps Script must authorize every future private data request server-side.
const thisYear = document.querySelector("#current-year");
if (thisYear) thisYear.textContent = String(new Date().getFullYear());
