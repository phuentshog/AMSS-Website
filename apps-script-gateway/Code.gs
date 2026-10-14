/**
 * Local migration draft for the existing container-bound Log_in gateway.
 * Copy these files into that existing Apps Script project after review.
 * Identity and roster checks happen on the server for every checkAccess call.
 */
const SHEET_NAME = "Teachers";
const PORTAL_URL = "https://phuentshog.github.io/AMSS-Website/staff-dashboard.html";
const SCHOOL_NAME = "AREKHA MIDDLE SECONDARY SCHOOL";
const SCHOOL_ADDRESS = "Arekha, Bongo, Chhukha, Bhutan";
const ESTABLISHED = "Established 2004";

function doGet() {
  const template = HtmlService.createTemplateFromFile("Index");
  template.schoolName = SCHOOL_NAME;
  template.schoolAddress = SCHOOL_ADDRESS;
  template.established = ESTABLISHED;
  template.portalUrl = PORTAL_URL;
  return template.evaluate()
    .setTitle("Arekha MSS — Staff Portal Login")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * Always obtains identity from Apps Script and reads the bound roster anew.
 * No email, redirect, or authorization claim is accepted from the browser.
 */
function checkAccess() {
  function normalizeSchoolEmail(value) {
    const email = String(value || "").trim().toLowerCase();
    const parts = email.split("@");
    if (parts.length !== 2 || parts[1] !== "education.gov.bt") return "";
    if (!/^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/.test(parts[0])) {
      return "";
    }
    return email;
  }

  let email;
  try {
    email = normalizeSchoolEmail(Session.getActiveUser().getEmail());
  } catch (_error) {
    return { status: "identity-unavailable" };
  }
  if (!email) return { status: "identity-unavailable" };

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) return { status: "unavailable" };
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) return { status: "unavailable" };

    const rows = sheet.getDataRange().getValues();
    if (rows.length < 1) return { status: "unavailable" };
    const headers = rows[0].map((value) => String(value).trim().toLowerCase());
    const emailColumn = headers.indexOf("email");
    if (emailColumn < 0) return { status: "unavailable" };

    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index];
      const rosterEmail = normalizeSchoolEmail(row[emailColumn]);
      if (rosterEmail && rosterEmail === email) {
        return { status: "authorized" };
      }
    }

    return { status: "denied" };
  } catch (_error) {
    // Do not return sheet details, identity, or server exception text.
    return { status: "unavailable" };
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Login Gateway")
    .addItem("Get Web App URL", "showWebAppUrl")
    .addToUi();
}

function showWebAppUrl() {
  const url = ScriptApp.getService().getUrl();
  const ui = SpreadsheetApp.getUi();
  ui.alert(url ? "Web App URL\n\n" + url : "Not deployed yet. Use Deploy > New deployment > Web app first.");
}
