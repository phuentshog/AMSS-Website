/**
 * Minimal identity visibility check for a domain-restricted Apps Script web app.
 * This test does not read the AMSS staff roster or log the active user's email.
 */
function doGet() {
  var normalizedEmail = "";

  try {
    normalizedEmail = String(Session.getActiveUser().getEmail() || "")
      .trim()
      .toLowerCase();
  } catch (error) {
    // Treat unavailable identity as a denial. Do not log identity or error data.
  }

  var identityAvailable = normalizedEmail.length > 0;
  var schoolDomain = identityAvailable
    && normalizedEmail.endsWith("@education.gov.bt");
  var testStatus = !identityAvailable
    ? "IDENTITY_UNAVAILABLE"
    : schoolDomain
      ? "IDENTITY_AVAILABLE"
      : "OUTSIDE_SCHOOL_DOMAIN";

  var result = {
    identityAvailable: identityAvailable,
    schoolDomain: schoolDomain,
    testStatus: testStatus,
  };

  return ContentService.createTextOutput(JSON.stringify(result, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}
