import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const portalUrl = "https://phuentshog.github.io/AMSS-Website/staff-dashboard.html";

function createGateway({
  email = "teacher@education.gov.bt",
  identityFails = false,
  spreadsheetUnavailable = false,
  sheetMissing = false,
  rows,
  getValues,
} = {}) {
  let reads = 0;
  let renderedTemplate;
  const menuCalls = [];
  const uiAlerts = [];
  const sheet = {
    getDataRange() {
      return {
        getValues() {
          reads += 1;
          if (getValues) return getValues();
          return rows;
        },
      };
    },
  };
  const context = vm.createContext({
    Session: {
      getActiveUser() {
        return {
          getEmail() {
            if (identityFails) throw new Error("identity unavailable");
            return email;
          },
        };
      },
    },
    SpreadsheetApp: {
      getActiveSpreadsheet() {
        if (spreadsheetUnavailable) return null;
        return {
          getSheetByName(name) {
            assert.equal(name, "Teachers");
            if (sheetMissing) return null;
            return sheet;
          },
        };
      },
      getUi() {
        return {
          createMenu(name) {
            menuCalls.push(["createMenu", name]);
            return {
              addItem(label, functionName) {
                menuCalls.push(["addItem", label, functionName]);
                return this;
              },
              addToUi() {
                menuCalls.push(["addToUi"]);
              },
            };
          },
          alert(message) {
            uiAlerts.push(message);
          },
        };
      },
    },
    ScriptApp: {
      getService() {
        return { getUrl: () => "https://script.google.com/macros/s/mock-id/exec" };
      },
    },
    testState: {
      menuCalls,
      uiAlerts,
    },
    HtmlService: {
      createTemplateFromFile() {
        const template = {};
        renderedTemplate = template;
        template.evaluate = () => ({
          setTitle() {
            return this;
          },
          addMetaTag() {
            return this;
          },
        });
        return template;
      },
    },
  });
  return {
    context,
    reads: () => reads,
    template: () => renderedTemplate,
    menuCalls,
    uiAlerts,
    async load() {
      vm.runInContext(await read("apps-script-gateway/Code.gs"), context);
    },
  };
}

function makeElement() {
  const listeners = new Map();
  const classes = new Set();
  return {
    hidden: true,
    disabled: false,
    textContent: "",
    href: "",
    dataset: {},
    classList: {
      add(value) {
        classes.add(value);
      },
      remove(value) {
        classes.delete(value);
      },
      contains(value) {
        return classes.has(value);
      },
    },
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    dispatch(name, event) {
      listeners.get(name)?.(event);
    },
    click() {
      const event = { preventDefault() {} };
      this.onclick?.(event);
      listeners.get("click")?.(event);
    },
  };
}

async function createGatewayPage() {
  const html = await read("apps-script-gateway/Index.html");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "gateway HTML should contain its page controller");

  const ids = [
    "screenIdle",
    "screenWelcome",
    "screenDenied",
    "refreshRow",
    "refreshBtn",
    "loginBtn",
    "loginBtnText",
    "statusLine",
    "continueBtn",
    "deniedBox",
  ];
  const elements = new Map(ids.map((id) => [id, makeElement()]));
  let successHandler;
  let failureHandler;
  let calls = 0;
  const windowListeners = new Map();
  const topLocation = { href: "" };
  const context = vm.createContext({
    document: {
      getElementById(id) {
        assert.ok(elements.has(id), `unexpected page element: ${id}`);
        return elements.get(id);
      },
    },
    google: {
      script: {
        run: {
          withSuccessHandler(callback) {
            successHandler = callback;
            return this;
          },
          withFailureHandler(callback) {
            failureHandler = callback;
            return this;
          },
          checkAccess() {
            calls += 1;
          },
        },
      },
    },
    window: {
      open() {
        throw new Error("gateway must not open a popup");
      },
      addEventListener(name, callback) {
        windowListeners.set(name, callback);
      },
      top: {
        location: topLocation,
      },
    },
  });
  vm.runInContext(script, context);
  return {
    elements,
    html,
    topLocation,
    calls: () => calls,
    success(result) {
      successHandler(result);
    },
    failure(error = new Error("mock failure")) {
      failureHandler(error);
    },
    sendMessage(event) {
      windowListeners.get("message")?.(event);
    },
    windowListeners,
    startCheck() {
      elements.get("loginBtn").click();
    },
  };
}

test("authorized teacher is matched case-insensitively and receives status only", async () => {
  const gateway = createGateway({
    email: " TEACHER@EDUCATION.GOV.BT ",
    rows: [
      ["Name", "Email", "Designation"],
      ["Fictional Teacher", "teacher@education.gov.bt", "Teacher"],
    ],
  });
  await gateway.load();

  assert.deepEqual(JSON.parse(JSON.stringify(gateway.context.checkAccess())), {
    status: "authorized",
  });
  assert.equal(gateway.reads(), 1);
});

test("unregistered teacher is denied and the latest roster is read for each check", async () => {
  let rows = [["Email"], ["teacher@education.gov.bt"]];
  const gateway = createGateway({
    email: "teacher@education.gov.bt",
    getValues: () => rows,
  });
  await gateway.load();

  assert.equal(gateway.context.checkAccess().status, "authorized");
  rows = [["Email"], ["another@education.gov.bt"]];
  assert.equal(gateway.context.checkAccess().status, "denied");
  assert.equal(gateway.reads(), 2);
});

test("malformed identities are denied and malformed roster addresses never authorize", async (t) => {
  const malformedIdentities = [
    "not-an-email",
    "@education.gov.bt",
    "teacher@@education.gov.bt",
    ".teacher@education.gov.bt",
    "teacher..name@education.gov.bt",
    "teacher.@education.gov.bt",
    "teacher@education.gov.bt.example",
    "teacher@example.invalid",
  ];

  for (const email of malformedIdentities) {
    await t.test(`identity ${email}`, async () => {
      const gateway = createGateway({
        email,
        rows: [["Email"], [email]],
      });
      await gateway.load();
      assert.equal(gateway.context.checkAccess().status, "identity-unavailable");
      assert.equal(gateway.reads(), 0);
    });
  }

  const gateway = createGateway({
    email: "teacher@education.gov.bt",
    rows: [
      ["Email"],
      ["teacher..name@education.gov.bt"],
      ["teacher@education.gov.bt.attacker.invalid"],
    ],
  });
  await gateway.load();
  assert.equal(gateway.context.checkAccess().status, "denied");
});

test("browser-supplied identity cannot authorize a different signed-in user", async () => {
  const gateway = createGateway({
    email: "unregistered@education.gov.bt",
    rows: [["Email"], ["teacher@education.gov.bt"]],
  });
  await gateway.load();

  assert.equal(
    gateway.context.checkAccess("teacher@education.gov.bt").status,
    "denied",
  );
  assert.equal(gateway.context.checkAccess.length, 0);
});

test("missing or blank identity is denied before reading the roster", async (t) => {
  for (const scenario of [
    { name: "blank", email: "" },
    { name: "null", email: null },
    { name: "identity service failure", identityFails: true },
  ]) {
    await t.test(scenario.name, async () => {
      const gateway = createGateway({ ...scenario, rows: [["Email"]] });
      await gateway.load();
      assert.equal(gateway.context.checkAccess().status, "identity-unavailable");
      assert.equal(gateway.reads(), 0);
    });
  }
});

test("malformed roster and spreadsheet failures fail closed", async (t) => {
  const cases = [
    { name: "missing Email header", rows: [["Name"], ["Fictional Teacher"]] },
    { name: "missing spreadsheet", spreadsheetUnavailable: true, rows: [["Email"]] },
    { name: "missing Teachers sheet", sheetMissing: true, rows: [["Email"]] },
    { name: "empty roster", rows: [] },
    { name: "malformed row data", getValues: () => null },
    { name: "spreadsheet read failure", getValues: () => { throw new Error("private detail"); } },
  ];
  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const gateway = createGateway({ ...scenario, email: "teacher@education.gov.bt" });
      await gateway.load();
      assert.equal(gateway.context.checkAccess().status, "unavailable");
    });
  }
});

test("gateway template receives only its fixed GitHub Pages destination", async () => {
  const gateway = createGateway({ rows: [["Email"]] });
  await gateway.load();
  gateway.context.doGet();
  assert.equal(gateway.template().portalUrl, portalUrl);
  const exposedFunctions = Object.entries(gateway.context)
    .filter(([, value]) => typeof value === "function")
    .map(([name]) => name)
    .sort();
  assert.deepEqual(exposedFunctions, [
    "checkAccess",
    "doGet",
    "onOpen",
    "showWebAppUrl",
  ]);
});

test("existing spreadsheet menu and web-app URL helper are preserved", async () => {
  const gateway = createGateway({ rows: [["Email"]] });
  await gateway.load();

  gateway.context.onOpen();
  assert.deepEqual(gateway.menuCalls, [
    ["createMenu", "Login Gateway"],
    ["addItem", "Get Web App URL", "showWebAppUrl"],
    ["addToUi"],
  ]);

  gateway.context.showWebAppUrl();
  assert.deepEqual(gateway.uiAlerts, [
    "Web App URL\n\nhttps://script.google.com/macros/s/mock-id/exec",
  ]);
});

test("local gateway manifest matches owner execution and Anyone access", async () => {
  const manifest = JSON.parse(await read("apps-script-gateway/appsscript.json"));
  assert.deepEqual(manifest.webapp, {
    executeAs: "USER_DEPLOYING",
    access: "ANYONE_ANONYMOUS",
  });
});

test("authorized status enables only the fixed dashboard destination", async () => {
  const page = await createGatewayPage();
  assert.match(page.html, /const PORTAL_URL = "https:\/\/phuentshog\.github\.io\/AMSS-Website\/staff-dashboard\.html"/);
  assert.doesNotMatch(page.html, /result\.(?:email|name|designation|redirectUrl|isAdmin)|innerHTML|ADMIN_EMAIL/);
  assert.equal(page.elements.get("continueBtn").onclick, undefined);
  page.startCheck();
  assert.equal(page.calls(), 1);
  page.success({
    status: "authorized",
    email: "private@example.invalid",
    name: "Fictional Private Name",
    designation: "Private designation",
    redirectUrl: "https://attacker.example/",
    isAdmin: true,
  });

  assert.equal(page.elements.get("screenWelcome").classList.contains("hidden"), false);
  assert.equal(page.elements.get("statusLine").textContent, "Access verified against the current staff list.");
  page.elements.get("continueBtn").click();
  assert.equal(page.topLocation.href, "https://phuentshog.github.io/AMSS-Website/staff-dashboard.html");
  assert.doesNotMatch(page.html, /private@example|Fictional Private|Private designation|attacker\.example/);
});

test("all non-authorized and malformed statuses fail closed with generic text", async (t) => {
  for (const response of [
    { status: "denied" },
    { status: "identity-unavailable" },
    { status: "unavailable" },
    null,
    [],
    { status: "unexpected" },
    { status: "unavailable", message: "private server detail", email: "private@example.invalid" },
  ]) {
    await t.test(JSON.stringify(response), async () => {
      const page = await createGatewayPage();
      page.startCheck();
      page.success(response);
      assert.equal(page.elements.get("continueBtn").onclick, null);
      assert.equal(page.elements.get("screenDenied").classList.contains("hidden"), false);
      assert.doesNotMatch(page.elements.get("deniedBox").textContent, /private server detail|private@example\.invalid/);
      assert.equal(page.topLocation.href, "");
    });
  }
});

test("a new access check clears the previous Continue action", async () => {
  const page = await createGatewayPage();
  page.startCheck();
  page.success({ status: "authorized" });
  assert.equal(typeof page.elements.get("continueBtn").onclick, "function");

  page.startCheck();
  page.success({ status: "denied" });
  assert.equal(page.elements.get("continueBtn").onclick, null);
});

test("failed Apps Script communication displays a generic error and stays on the gateway", async () => {
  const page = await createGatewayPage();
  page.startCheck();
  page.failure(new Error("private server detail"));

  assert.equal(page.elements.get("continueBtn").onclick, null);
  assert.match(page.elements.get("deniedBox").textContent, /could not be completed/);
  assert.doesNotMatch(page.elements.get("deniedBox").textContent, /private server detail/);
});

test("popup and message-origin inputs are unused and cannot trigger navigation", async () => {
  const page = await createGatewayPage();
  page.sendMessage({
    origin: "https://attacker.example",
    source: { postMessage() {} },
    data: { status: "authorized", redirect: "https://attacker.example/" },
  });

  assert.equal(page.windowListeners.size, 0);
  assert.equal(page.elements.get("continueBtn").onclick, undefined);
  assert.doesNotMatch(page.html, /window\.open|postMessage|addEventListener\(["']message/);
});

async function runLoginPage(gatewayUrl) {
  const loginSource = await read("assets/js/portal/login-page.js");
  const executable = loginSource
    .replace(
      'import { APPS_SCRIPT_GATEWAY_URL } from "./gateway-config.js";',
      `const APPS_SCRIPT_GATEWAY_URL = ${JSON.stringify(gatewayUrl)};`,
    )
    .replace("export { validGatewayUrl };", "globalThis.validGatewayUrl = validGatewayUrl;");
  const submit = makeElement();
  const form = Object.assign(makeElement(), { querySelector: () => submit });
  const elements = new Map([
    ["portal-status", makeElement()],
    ["portal-login-form", form],
    ["portal-home-link", makeElement()],
    ["current-year", makeElement()],
  ]);
  const navigations = [];
  const context = vm.createContext({
    URL,
    Date,
    document: { querySelector: (selector) => elements.get(selector.slice(1)) },
    window: { location: { assign: (url) => navigations.push(url) } },
  });
  vm.runInContext(executable, context);
  return { context, elements, navigations, submit };
}

test("blank gateway URL shows an error, hides and disables login, and cannot submit or navigate", async () => {
  const login = await runLoginPage("");
  assert.equal(login.elements.get("portal-login-form").hidden, true);
  assert.equal(login.submit.disabled, true);
  assert.equal(login.elements.get("portal-home-link").hidden, true);
  assert.equal(login.elements.get("portal-status").dataset.state, "error");
  assert.match(login.elements.get("portal-status").textContent, /not configured/);

  let prevented = false;
  login.elements.get("portal-login-form").dispatch("submit", {
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.deepEqual(login.navigations, []);

  const css = await read("assets/css/style.css");
  assert.match(css, /\.portal-page \[hidden\]\s*\{\s*display:\s*none !important;/);
});

test("login page accepts only a clean HTTPS Apps Script deployment URL", async () => {
  const login = await runLoginPage("https://script.google.com/macros/s/deployment-id/exec");
  assert.equal(login.elements.get("portal-login-form").hidden, false);
  assert.equal(login.submit.disabled, false);
  for (const url of [
    "https://script.google.com/macros/s/deployment-id/exec",
  ]) {
    assert.equal(login.context.validGatewayUrl(url), true);
  }
  for (const url of [
    "http://script.google.com/macros/s/deployment-id/exec",
    "https://evil.example/macros/s/deployment-id/exec",
    "https://script.google.com.evil.example/macros/s/deployment-id/exec",
    "https://script.google.com/macros/s/deployment-id/exec?redirect=https://evil.example",
    "https://script.google.com/macros/s/deployment-id/exec#redirect",
    "https://script.google.com:8443/macros/s/deployment-id/exec",
    "https://script.google.com/macros/s/deployment-id/other/exec",
  ]) {
    assert.equal(login.context.validGatewayUrl(url), false, url);
  }

  let prevented = false;
  login.elements.get("portal-login-form").dispatch("submit", {
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(login.submit.disabled, true);
  assert.deepEqual(login.navigations, ["https://script.google.com/macros/s/deployment-id/exec"]);
});

test("direct dashboard access is explicitly public and contains no client authorization claim", async () => {
  const dashboard = await read("staff-dashboard.html");
  const script = await read("assets/js/portal/dashboard-page.js");
  const css = await read("assets/css/style.css");
  assert.match(dashboard, /Opening it does not prove that you are signed in/);
  assert.match(dashboard, /No private staff information or operations are available/);
  assert.doesNotMatch(`${dashboard}\n${script}`, /localStorage|sessionStorage|isAuthorized|isAuthenticated/);
  assert.match(css, /\.portal-profile-layout\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
});

test("active Staff Portal code and dependency lock have no client auth or database SDK calls", async () => {
  const files = [
    "staff-portal.html",
    "staff-dashboard.html",
    "assets/js/portal/login-page.js",
    "assets/js/portal/dashboard-page.js",
    "assets/js/portal/gateway-config.js",
    "package.json",
    "package-lock.json",
  ];
  const contents = await Promise.all(files.map(read));
  assert.doesNotMatch(contents.join("\n"), /firebase|firestore|GoogleAuthProvider|signInWithPopup/i);
});
