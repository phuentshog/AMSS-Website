(() => {
  const root = document.querySelector(".plc-page");
  if (!root) return;

  const embedded = root.classList.contains("plc-dashboard-embed");
  const $ = (selector) => root.querySelector(selector);
  const status = $("#plc-status");
  const retry = $("#plc-retry");
  const departmentTotal = $("#plc-department-total");
  const educatorTotal = $("#plc-educator-total");
  const homeView = $("#plc-home-view");
  const departmentView = $("#plc-department-view");
  const departmentGrid = $("#plc-department-grid");
  const departmentHeading = $("#plc-department-heading");
  const departmentCount = $("#plc-department-count");
  const breadcrumbCurrent = $("#plc-breadcrumb-current");
  const summaryHost = $("#plc-hod-spotlight");
  const resourcesHost = $("#plc-member-grid");
  const departmentEmpty = $("#plc-department-empty");
  const directoryEmpty = $("#plc-directory-empty");
  const directoryView = $("#plc-directory-view");
  const directoryIntro = $(".plc-hero");
  const directoryStats = $(".plc-stats");
  const searchPanel = $(".plc-search-panel");
  const search = $("#plc-search");
  const clearSearch = $("#plc-clear-search");
  const searchResults = $("#plc-search-results");
  const searchStatus = $("#plc-search-status");
  const searchList = $("#plc-search-list");
  const emptySearchClear = $("#plc-search-empty-clear");
  const resultCount = $("#plc-result-count");
  const skeletonGrid = $("#plc-skeleton-grid");
  const backButton = $("#plc-back-home");

  const iconPaths = {
    landmark: "M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3",
    flask: "M9 3h6M10 3v6l-5.5 9a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3M7 14h10",
    book: "M12 7v14M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13h-5a4 4 0 0 0-4 3 4 4 0 0 0-4-3H3z",
    calculator: "M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2",
    shapes: "M9 8a6 6 0 1 0 0 .1M15.5 14 21 20H10zM15 3h7v7h-7z",
    languages: "m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6",
  };

  let departments = [];
  let departmentBySlug = new Map();
  let lastRenderedSlug = "";
  let selectedDepartmentSlug = "";

  const makeElement = (tag, className = "", text = undefined) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const normalized = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const slugify = (value) => normalized(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const formatCount = (count) => `${count} educator${count === 1 ? "" : "s"}`;

  function departmentIcon(name) {
    const value = normalized(name);
    if (value.includes("humanities")) return "landmark";
    if (value.includes("science")) return "flask";
    if (value.includes("dzongkha")) return "book";
    if (value.includes("math") || value.includes("ict")) return "calculator";
    if (value.includes("elementary")) return "shapes";
    if (value.includes("english")) return "languages";
    return "book";
  }

  function makeIcon(name, className = "plc-department-icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const shape = iconPaths[departmentIcon(name)] || iconPaths.book;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", shape);
    svg.append(path);
    const wrapper = makeElement("span", `${className} plc-department-icon--${departmentIcon(name)}`);
    wrapper.append(svg);
    return wrapper;
  }

  function openDepartment(department) {
    const slug = slugify(department.name);
    search.value = "";
    if (embedded) {
      window.history.pushState({ ...(window.history.state || {}), plcDepartment: slug }, "", window.location.href);
      selectedDepartmentSlug = slug;
      renderRoute();
      return;
    }
    if (window.location.hash !== `#department/${slug}`) window.location.hash = `department/${encodeURIComponent(slug)}`;
    else renderRoute();
  }

  function makeTile(department) {
    const button = makeElement("button", "plc-department-tile");
    button.type = "button";
    button.setAttribute("aria-label", `Open ${department.name} department summary, ${formatCount(department.educatorCount)}`);
    const top = makeElement("span", "plc-tile-top");
    top.append(makeIcon(department.name), makeElement("span", "plc-tile-arrow", "→"));
    button.append(top, makeElement("h3", "", department.name));
    button.append(makeElement("span", "plc-tile-count", formatCount(department.educatorCount)));
    button.addEventListener("click", () => openDepartment(department));
    return button;
  }

  function renderSummaryTable() {
    let section = $("#plc-count-summary");
    if (!section) {
      section = makeElement("section", "plc-panel plc-count-summary");
      section.id = "plc-count-summary";
      section.setAttribute("aria-labelledby", "plc-count-summary-heading");
      section.append(makeElement("h2", "plc-section-title", "Department membership summary"));
      const wrap = makeElement("div", "plc-count-table-wrap");
      const table = document.createElement("table");
      table.className = "plc-count-table";
      table.innerHTML = "<caption>Aggregate educator memberships by department</caption><thead><tr><th scope=\"col\">Department</th><th scope=\"col\">Educator memberships</th><th scope=\"col\">Relative count</th></tr></thead><tbody></tbody>";
      wrap.append(table);
      section.append(wrap);
      homeView.append(section);
    }
    section.querySelector("h2").id = "plc-count-summary-heading";
    const body = section.querySelector("tbody");
    const maximum = Math.max(1, ...departments.map((department) => department.educatorCount));
    body.replaceChildren();
    for (const department of departments) {
      const row = document.createElement("tr");
      const title = makeElement("th", "", department.name);
      title.scope = "row";
      const count = makeElement("td", "", String(department.educatorCount));
      const barCell = document.createElement("td");
      const track = makeElement("span", "plc-count-bar-track");
      track.setAttribute("aria-hidden", "true");
      const bar = makeElement("span", "plc-count-bar");
      bar.style.width = `${Math.max(4, Math.round(department.educatorCount / maximum * 100))}%`;
      track.append(bar);
      barCell.append(track);
      row.append(title, count, barCell);
      body.append(row);
    }
  }

  function renderDepartment(department) {
    departmentHeading.textContent = department.name;
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = department.name;
    departmentCount.textContent = `${formatCount(department.educatorCount)} · aggregate count`;
    summaryHost.replaceChildren();
    resourcesHost.replaceChildren();

    const summary = makeElement("article", "plc-hod-card plc-public-summary");
    const icon = makeElement("div", "plc-hod-photo");
    icon.append(makeIcon(department.name, "plc-summary-icon"));
    const copy = makeElement("div", "plc-hod-copy");
    copy.append(makeElement("span", "plc-hod-badge", "Department summary"));
    copy.append(makeElement("h3", "", formatCount(department.educatorCount)));
    copy.append(makeElement("p", "plc-hod-department", department.name));
    copy.append(makeElement("p", "plc-hod-role", "Only aggregate membership totals are shown."));
    summary.append(icon, copy);
    summaryHost.append(summary);

    const resources = department.resources.filter((resource) => isApprovedResource(resource));
    for (const resource of resources) {
      const card = makeElement("article", "plc-teacher-card plc-public-resource-card");
      const text = makeElement("span", "plc-card-copy");
      text.append(makeElement("strong", "", resource.title));
      text.append(makeElement("span", "plc-card-department", department.name));
      const link = makeElement("a", "plc-folder-note", "Open public resource ↗");
      link.href = resource.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      text.append(link);
      card.append(makeIcon(department.name), text);
      resourcesHost.append(card);
    }
    departmentEmpty.hidden = resources.length > 0;
    departmentEmpty.querySelector("strong").textContent = resources.length
      ? "Approved public resources"
      : "No approved public resources are available yet.";
    departmentEmpty.querySelector("span").textContent = resources.length
      ? "Only resources cleared for public access appear here."
      : "Department totals are available; private PLC folders and staff records are not published.";
  }

  function isApprovedResource(resource) {
    if (!resource || typeof resource.title !== "string" || typeof resource.url !== "string") return false;
    try {
      const url = new URL(resource.url);
      return url.protocol === "https:" && !/^(drive\.google\.com|docs\.google\.com)$/i.test(url.hostname);
    } catch {
      return false;
    }
  }

  function makeSearchResult(department) {
    const item = makeElement("article", "plc-search-result");
    const details = makeElement("div", "plc-search-result-main");
    details.append(makeElement("strong", "", department.name));
    details.append(makeElement("span", "", formatCount(department.educatorCount)));
    item.append(details);
    const actions = makeElement("div", "plc-search-result-actions");
    const open = makeElement("button", "plc-small-button plc-small-button--quiet", `View ${department.name}`);
    open.type = "button";
    open.addEventListener("click", () => openDepartment(department));
    actions.append(open);
    item.append(actions);
    return item;
  }

  function renderSearch() {
    const term = normalized(search.value);
    clearSearch.hidden = !term;
    searchResults.hidden = !term;
    if (!term) {
      searchList.replaceChildren();
      return;
    }
    const matches = departments.filter((department) => {
      const resources = department.resources.map((resource) => resource.title).join(" ");
      return `${department.name} ${resources}`.toLocaleLowerCase().includes(term);
    });
    searchList.replaceChildren();
    if (emptySearchClear) emptySearchClear.hidden = Boolean(matches.length);
    if (!matches.length) {
      searchStatus.textContent = "No departments or approved public resources match this search.";
      return;
    }
    searchStatus.textContent = `${matches.length} department${matches.length === 1 ? "" : "s"} found.`;
    matches.forEach((department) => searchList.append(makeSearchResult(department)));
  }

  function renderRoute() {
    const route = embedded ? null : window.location.hash.match(/^#department\/(.+)$/);
    const routeSlug = embedded ? selectedDepartmentSlug : route ? decodeURIComponent(route[1]) : "";
    const department = routeSlug ? departmentBySlug.get(routeSlug) : null;
    const term = normalized(search.value);
    const nextSlug = department ? slugify(department.name) : "";
    const detailVisible = Boolean(department) && !term;
    directoryIntro.hidden = detailVisible;
    directoryStats.hidden = detailVisible;
    searchPanel.hidden = detailVisible;
    homeView.hidden = Boolean(department) || Boolean(term);
    departmentView.hidden = !department || Boolean(term);
    if (department && !term) {
      renderDepartment(department);
      if (nextSlug !== lastRenderedSlug) departmentHeading.focus();
    } else if (!department && lastRenderedSlug) {
      $("#plc-home-heading").focus();
    }
    lastRenderedSlug = nextSlug;
    renderSearch();
  }

  function clearSearchValue() {
    search.value = "";
    renderRoute();
    search.focus();
  }

  function showFailure(message) {
    status.setAttribute("role", "alert");
    status.classList.add("plc-status--error");
    status.replaceChildren();
    const row = makeElement("div", "plc-status-actions");
    row.append(makeElement("p", "", message));
    retry.hidden = false;
    row.append(retry);
    status.append(row);
    status.hidden = false;
    directoryView.setAttribute("aria-busy", "false");
  }

  async function loadDirectory() {
    if (skeletonGrid) skeletonGrid.hidden = false;
    retry.hidden = true;
    status.setAttribute("role", "status");
    status.hidden = false;
    status.classList.remove("plc-status--error");
    status.textContent = "Loading the PLC directory…";
    directoryView.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("assets/data/public/plc.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`The public department summaries could not be loaded (HTTP ${response.status}).`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.departments)) throw new Error("The public PLC data has an unexpected format.");
      departments = payload.departments
        .filter((department) => department && typeof department.title === "string" && Number.isInteger(department.memberCount) && department.memberCount >= 0)
        .map((department) => ({
          name: department.title.trim(),
          educatorCount: department.memberCount,
          resources: Array.isArray(department.resources) ? department.resources.filter(isApprovedResource) : [],
        }));
      departmentBySlug = new Map(departments.map((department) => [slugify(department.name), department]));
      const total = departments.reduce((sum, department) => sum + department.educatorCount, 0);
      departmentTotal.textContent = String(departments.length);
      educatorTotal.textContent = String(total);
      directoryEmpty.hidden = departments.length > 0;
      if (departments.length) {
        renderSummaryTable();
        departmentGrid.replaceChildren(...departments.map(makeTile));
      }
      if (resultCount) resultCount.textContent = `${departments.length} departments · ${formatCount(total)} total`;
      if (skeletonGrid) skeletonGrid.hidden = true;
      status.hidden = true;
      directoryView.setAttribute("aria-busy", "false");
      renderRoute();
    } catch (error) {
      if (skeletonGrid) skeletonGrid.hidden = true;
      showFailure(`${error instanceof Error ? error.message : "An unexpected error prevented the PLC directory from loading."} Check your connection and try again.`);
    }
  }

  search.addEventListener("input", renderRoute);
  clearSearch.addEventListener("click", clearSearchValue);
  emptySearchClear?.addEventListener("click", clearSearchValue);
  backButton.addEventListener("click", () => {
    search.value = "";
    if (embedded) {
      if (window.history.state?.plcDepartment) window.history.back();
      else {
        selectedDepartmentSlug = "";
        renderRoute();
      }
      return;
    }
    if (window.history.length > 1) window.history.back();
    else window.location.assign("AMSS%20Staff%20Dashboard.html#plc");
  });
  retry.addEventListener("click", loadDirectory);
  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("popstate", () => {
    if (embedded) {
      selectedDepartmentSlug = window.history.state?.plcDepartment || "";
      search.value = "";
    }
    renderRoute();
  });
  if (embedded) {
    document.querySelector('.dashboard-nav a[href="#plc"]')?.addEventListener("click", () => {
      selectedDepartmentSlug = "";
      search.value = "";
      if (window.history.state?.plcDepartment) {
        const { plcDepartment, ...state } = window.history.state;
        window.history.replaceState(state, "", window.location.href);
      }
      renderRoute();
    });
  }
  loadDirectory();
})();
