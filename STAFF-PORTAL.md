# Staff Portal

## Architecture and security boundary

The school website is a public static site on GitHub Pages. `staff-dashboard.html`
is intentionally a public shell: opening it directly does not establish identity
or grant access. Do not add private staff data or privileged operations to its
HTML, JavaScript, URLs, or browser storage.

`staff-portal.html` sends the teacher to the existing Google Apps Script web app.
The web app obtains the current account through `Session.getActiveUser()` on the
server, reads the bound spreadsheet's `Teachers` sheet for each access check, and
compares the normalized account email to the `Email` column. The roster stays in
the private spreadsheet. The browser receives only a status, not the teacher's
email, name, designation, or roster contents. The destination is fixed in
`apps-script-gateway/Code.gs`; no redirect URL is accepted from the browser.

Every future operation involving private data must be an Apps Script server
function that independently obtains and verifies the current identity and reads
the latest roster. Never use the public dashboard, a prior successful check,
browser state, or a hidden element as authorization.

## Local files

- `apps-script-gateway/Code.gs` and `Index.html` are the reviewed local source
  for the existing container-bound login gateway. They are not deployed by this
  repository. The existing spreadsheet menu functions are retained in
  `Code.gs`.
- `apps-script-gateway/.clasp.json` points at the existing bound script ID from
  the separate backup. `.clasp.json` and the local `appsscript.json` are ignored
  by Git and must not be committed.
- `apps-script-gateway/appsscript.json` is local configuration for this folder:
  owner execution and domain-only web-app access. The backup's anonymous access
  setting was intentionally not copied. This local manifest does not change a
  live deployment; do not push it without first reviewing the access impact.
- `assets/js/portal/gateway-config.js` contains the public web-app URL setting.
  It is intentionally blank until the existing domain-restricted web app has
  been verified. This URL is not a secret.
- `assets/js/portal/login-page.js` validates that URL and opens only the Apps
  Script endpoint.
- `staff-dashboard.html` and `assets/js/portal/dashboard-page.js` provide only
  the public static shell.
- `apps-script-identity-test/` contains an optional isolated manual check for
  whether the chosen Apps Script deployment makes the active-user identity
  available. It reads no roster.
- `tests/apps-script-gateway.test.mjs` tests the server and browser flow using
  fictional roster data and mocked Apps Script services.

## Manual setup after review

These are manual steps for the site owner. No live Apps Script project or
website is changed by local tests.

1. Confirm the local clasp configuration points to the existing Apps Script
   project bound to the private `Log_in` spreadsheet. Do not use `clasp create`
   or `clasp clone` from this website folder. Review the local `Code.gs`,
   `Index.html`, and manifest before any separately authorized push. Keep the
   script bound to the spreadsheet containing the private `Teachers` sheet,
   whose header row must include `Email`. The script reads the sheet afresh for
   every check.
2. Confirm the web app is restricted to users in the school's exact Google
   Workspace domain and is configured to execute as the deploying owner so
   teachers are not given access to the roster spreadsheet. `Session.getActiveUser().getEmail()`
   can be unavailable under some account or deployment configurations. The
   gateway denies access in that case; do not substitute an email typed or
   supplied by the browser.
3. Use the separate identity visibility test in `apps-script-identity-test/`
   with an official school account, following its README. Verify the result
   against the actual deployment and account. This is a manual live check and
   cannot be established by local mocks.
4. If the existing deployment can securely return the signed-in identity,
   update the existing Apps Script deployment to the reviewed source under the
   school's normal change process. The code's only successful destination is
   `https://phuentshog.github.io/AMSS-Website/staff-dashboard.html`.
5. Put the existing deployment's HTTPS `/exec` URL in
   `assets/js/portal/gateway-config.js`. It must be a `script.google.com`
   deployment URL without query or fragment. Keep the roster, email addresses,
   and all credentials out of this public repository.
6. Publish the static-site changes only through the site's separately approved
   release process. Test an authorized school account and an unregistered
   account against the deployed gateway before telling staff to use it.

If active identity is not available from the existing secure deployment, stop:
the static site cannot securely establish it on its own, and no insecure
browser-side alternative is provided here.

The previously cloned backup manifest used `ANYONE_ANONYMOUS`, and the live
deployment was reported as **Execute as: Me; Who has access: Anyone**. That
allows anonymous visitors to open and invoke the web app; it does not make
`checkAccess()` authorize them, but it increases exposure and may make active
identity unavailable. The local manifest deliberately uses `DOMAIN` instead.
It has not been pushed and does not change the current live deployment. Before
any future push or deployment, explicitly review the domain restriction and
verify `Session.getActiveUser().getEmail()` with real school accounts. Do not
rely on the local manifest as evidence of the live deployment's settings.

## Local verification

The local test command uses Node's built-in test runner and requires Node.js
18 or later. The website itself remains static and does not need Node.js at
runtime.

Run:

```sh
npm run test:apps-script-gateway
```

The tests use fictional teacher records and mocks. They cover an authorized
teacher, an unregistered teacher, missing identity, sheet/response failures,
fixed destination handling, failed Apps Script communication, absence of
popup/message-based identity, direct public dashboard access, and absence of
client SDK/auth/database calls in active portal code. These tests do not contact
Google, inspect the real roster, verify a real teacher login, or deploy anything.
