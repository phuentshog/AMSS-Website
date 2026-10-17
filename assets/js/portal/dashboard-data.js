// Public GitHub Pages sources contain no staff records or private dashboard data.
// Replace these empty adapters only with a backend that verifies authorisation
// on every request before returning protected information.
export async function loadDashboardSnapshot() {
  return {
    announcements: [],
    teachingResources: [],
    examinationInformation: [],
    staffDirectory: []
  };
}

// No identity is available until the existing login service provides a
// server-verified profile through an authorised integration.
export async function loadVerifiedStaffProfile() {
  return null;
}
