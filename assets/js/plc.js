const root = document.querySelector(".plc-page");

if (root) {
  const isEmbedded = root.classList.contains("plc-dashboard-embed");
  const status = document.querySelector("#plc-status");
  const retry = document.querySelector("#plc-retry");
  const departmentTotal = document.querySelector("#plc-department-total");
  const educatorTotal = document.querySelector("#plc-educator-total");
  const homeView = document.querySelector("#plc-home-view");
  const departmentView = document.querySelector("#plc-department-view");
  const departmentGrid = document.querySelector("#plc-department-grid");
  const departmentHeading = document.querySelector("#plc-department-heading");
  const departmentCount = document.querySelector("#plc-department-count");
  const hodSpotlight = document.querySelector("#plc-hod-spotlight");
  const memberGrid = document.querySelector("#plc-member-grid");
  const departmentEmpty = document.querySelector("#plc-department-empty");
  const directoryEmpty = document.querySelector("#plc-directory-empty");
  const search = document.querySelector("#plc-search");
  const clearSearch = document.querySelector("#plc-clear-search");
  const searchResults = document.querySelector("#plc-search-results");
  const searchStatus = document.querySelector("#plc-search-status");
  const searchList = document.querySelector("#plc-search-list");
  const emptySearchClear = document.querySelector("#plc-search-empty-clear");
  const resultCount = document.querySelector("#plc-result-count");
  const skeletonGrid = document.querySelector("#plc-skeleton-grid");
  const backButton = document.querySelector("#plc-back-home");
  const directoryView = document.querySelector("#plc-directory-view");
  const directoryIntro = document.querySelector(".plc-hero");
  const directoryStats = document.querySelector(".plc-stats");
  const searchPanel = document.querySelector(".plc-search-panel");

  const iconPaths = {
    landmark: [{ tag: "path", attrs: { d: "M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" } }],
    "flask-conical": [{ tag: "path", attrs: { d: "M9 3h6M10 3v6l-5.5 9a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3M7 14h10" } }],
    "book-open": [{ tag: "path", attrs: { d: "M12 7v14M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13h-5a4 4 0 0 0-4 3 4 4 0 0 0-4-3H3z" } }],
    calculator: [
      { tag: "rect", attrs: { x: "4", y: "2", width: "16", height: "20", rx: "2" } },
      { tag: "path", attrs: { d: "M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2" } },
    ],
    shapes: [
      { tag: "circle", attrs: { cx: "9", cy: "8", r: "6" } },
      { tag: "path", attrs: { d: "M15.5 14 21 20H10z" } },
      { tag: "rect", attrs: { x: "14", y: "2", width: "8", height: "8", rx: "1" } },
    ],
    languages: [{ tag: "path", attrs: { d: "m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" } }],
  };

  let departments = [];
  let departmentBySlug = new Map();
  let lastRenderedSlug = "";
  let selectedDepartmentSlug = "";

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function normalized(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function slugify(value) {
    return normalized(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function initials(name) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => Array.from(part)[0] || "")
      .join("")
      .toLocaleUpperCase() || "?";
  }

  function departmentIcon(name) {
    const value = normalized(name);
    if (value.includes("humanities")) return "landmark";
    if (value.includes("science")) return "flask-conical";
    if (value.includes("dzongkha")) return "book-open";
    if (value.includes("math") || value.includes("ict")) return "calculator";
    if (value.includes("elementary")) return "shapes";
    if (value.includes("english")) return "languages";
    return "book-open";
  }

  function makeIcon(name, className = "plc-department-icon") {
    const iconName = departmentIcon(name);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const shape of iconPaths[iconName] || iconPaths["book-open"]) {
      const element = document.createElementNS("http://www.w3.org/2000/svg", shape.tag);
      for (const [attribute, value] of Object.entries(shape.attrs)) {
        element.setAttribute(attribute, value);
      }
      svg.append(element);
    }
    const wrapper = makeElement("span", `${className} plc-department-icon--${iconName}`);
    wrapper.append(svg);
    return wrapper;
  }

  function validFolderUrl(value) {
    if (typeof value !== "string") return false;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "drive.google.com" && /^\/drive\/folders\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  }

  function folderAnchor(record, text, className) {
    if (!validFolderUrl(record.folderUrl)) return null;
    const link = makeElement("a", className, text);
    link.href = record.folderUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function addPhoto(container, record, { mini = false } = {}) {
    const portrait = makeElement("span", mini ? "plc-mini-avatar" : "plc-portrait");
    const fallback = makeElement("span", "plc-photo-fallback", initials(record.name));
    if (mini) {
      fallback.className = "plc-photo-fallback plc-mini-fallback";
      fallback.setAttribute("aria-hidden", "true");
    }
    portrait.append(fallback);

    const photoUrl = typeof record.photoUrl === "string"
      && /^https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]+=w800$/.test(record.photoUrl)
      ? record.photoUrl
      : "";
    if (photoUrl) {
      const image = document.createElement("img");
      image.hidden = true;
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.alt = mini ? "" : `Portrait of ${record.name}`;
      image.addEventListener("load", () => {
        image.hidden = false;
        fallback.hidden = true;
      }, { once: true });
      image.addEventListener("error", () => {
        image.removeAttribute("src");
        image.hidden = true;
        fallback.hidden = false;
      }, { once: true });
      image.src = photoUrl;
      portrait.append(image);
    }
    container.append(portrait);
    return portrait;
  }

  function makeTile(department) {
    const button = makeElement("button", "plc-department-tile");
    button.type = "button";
    button.setAttribute("aria-label", `Open ${department.name}, ${department.educators.length} educators`);
    const top = makeElement("span", "plc-tile-top");
    top.append(makeIcon(department.name));
    top.append(makeElement("span", "plc-tile-arrow", "→"));
    button.append(top);
    button.append(makeElement("h3", "", department.name));
    button.append(makeElement("span", "plc-tile-count", `${department.educators.length} educator${department.educators.length === 1 ? "" : "s"}`));

    const stack = makeElement("span", "plc-avatar-stack");
    stack.setAttribute("aria-hidden", "true");
    department.educators.slice(0, 4).forEach((record) => addPhoto(stack, record, { mini: true }));
    if (department.educators.length > 4) {
      stack.append(makeElement("span", "plc-mini-avatar plc-avatar-overflow", `+${department.educators.length - 4}`));
    }
    button.append(stack);
    button.addEventListener("click", () => openDepartment(department));
    return button;
  }

  function makeFolderNote(record) {
    if (validFolderUrl(record.folderUrl)) return makeElement("span", "plc-folder-note", "Open Drive folder ↗");
    return makeElement("span", "plc-folder-note plc-folder-note--missing", "No folder linked");
  }

  function makeTeacherCard(record, department) {
    const card = folderAnchor(record, "", "plc-teacher-card")
      || makeElement("article", "plc-teacher-card plc-teacher-card--unlinked");
    if (card instanceof HTMLAnchorElement) card.setAttribute("aria-label", `Open Drive folder for ${record.name}`);
    addPhoto(card, record);
    const copy = makeElement("span", "plc-card-copy");
    copy.append(makeElement("strong", "", record.name));
    copy.append(makeElement("span", "plc-card-department", department.name));
    copy.append(makeElement("span", "plc-card-role", record.role || "Role not listed"));
    copy.append(makeFolderNote(record));
    card.append(copy);
    return card;
  }

  function makeHodCard(record, department) {
    const card = makeElement("article", "plc-hod-card");
    const photo = makeElement("div", "plc-hod-photo");
    addPhoto(photo, record);
    card.append(photo);
    const copy = makeElement("div", "plc-hod-copy");
    copy.append(makeElement("span", "plc-hod-badge", "Head of Department"));
    copy.append(makeElement("h3", "", record.name));
    copy.append(makeElement("p", "plc-hod-department", department.name));
    copy.append(makeElement("p", "plc-hod-role", record.role || "Role not listed"));
    const link = folderAnchor(record, "Open Drive folder ↗", "plc-button");
    if (link) copy.append(link);
    else copy.append(makeElement("span", "plc-folder-note plc-folder-note--missing", "No folder linked"));
    card.append(copy);
    return card;
  }

  function isDepartmentHead(record) {
    return /\bhod\b|\bhead\b/i.test(String(record.role || ""));
  }

  function renderDepartmentGrid() {
    departmentGrid.replaceChildren();
    for (const department of departments) departmentGrid.append(makeTile(department));
    directoryEmpty.hidden = departments.some((department) => department.educators.length > 0);
    if (resultCount) resultCount.textContent = `${departments.length} department${departments.length === 1 ? "" : "s"}`;
    if (skeletonGrid) skeletonGrid.hidden = true;
  }

  function renderDepartment(department) {
    departmentHeading.textContent = department.name;
    departmentCount.textContent = `${department.educators.length} educator${department.educators.length === 1 ? "" : "s"}`;
    hodSpotlight.replaceChildren();
    memberGrid.replaceChildren();

    const head = department.educators.find(isDepartmentHead);
    if (head) hodSpotlight.append(makeHodCard(head, department));
    for (const record of department.educators) {
      if (record === head) continue;
      memberGrid.append(makeTeacherCard(record, department));
    }
    const displayedCount = department.educators.length - (head ? 1 : 0);
    departmentEmpty.hidden = displayedCount > 0 || Boolean(head);
    departmentEmpty.querySelector("strong").textContent = department.educators.length
      ? "No educator records are available."
      : "No educators listed for this department yet.";
    departmentEmpty.querySelector("span").textContent = department.educators.length
      ? "This department has no displayable profiles."
      : "The department is available, but the workbook contains no educator rows for it.";
  }

  function makeSearchResult(record, department) {
    const item = makeElement("article", "plc-search-result");
    const details = makeElement("div", "plc-search-result-main");
    details.append(makeElement("strong", "", record.name));
    details.append(makeElement("span", "", [record.role, department.name].filter(Boolean).join(" · ") || department.name));
    item.append(details);
    const actions = makeElement("div", "plc-search-result-actions");
    const open = makeElement("button", "plc-small-button plc-small-button--quiet", `View ${department.name}`);
    open.type = "button";
    open.addEventListener("click", () => openDepartment(department));
    actions.append(open);
    const folder = folderAnchor(record, "Open Drive folder ↗", "plc-small-button");
    if (folder) actions.append(folder);
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

    const matches = [];
    for (const department of departments) {
      for (const record of department.educators) {
        const searchable = [record.name, record.role, department.name].map(normalized).join(" ");
        if (searchable.includes(term)) matches.push({ record, department });
      }
    }

    searchList.replaceChildren();
    if (emptySearchClear) emptySearchClear.hidden = Boolean(matches.length);
    if (!matches.length) {
      searchStatus.replaceChildren();
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");
      const lens = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      lens.setAttribute("cx", "10.5");
      lens.setAttribute("cy", "10.5");
      lens.setAttribute("r", "6.5");
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "path");
      handle.setAttribute("d", "m15.5 15.5 5 5M8 8l5 5m0-5-5 5");
      icon.append(lens, handle);
      searchStatus.append(icon, makeElement("span", "", "No educators or departments found"));
      return;
    }
    searchStatus.replaceChildren();
    searchStatus.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"} found.`;
    for (const match of matches) searchList.append(makeSearchResult(match.record, match.department));
  }

  function renderRoute() {
    const route = isEmbedded ? null : window.location.hash.match(/^#department\/(.+)$/);
    const routeSlug = isEmbedded ? selectedDepartmentSlug : route ? decodeURIComponent(route[1]) : "";
    const department = routeSlug ? departmentBySlug.get(routeSlug) : null;
    const term = normalized(search.value);
    const nextSlug = department ? slugify(department.name) : "";
    const isDepartmentDetail = Boolean(department) && !term;
    if (directoryIntro) directoryIntro.hidden = isDepartmentDetail;
    if (directoryStats) directoryStats.hidden = isDepartmentDetail;
    if (searchPanel) searchPanel.hidden = isDepartmentDetail;
    homeView.hidden = Boolean(department) || Boolean(term);
    departmentView.hidden = !department || Boolean(term);
    if (department && !term) {
      renderDepartment(department);
      if (nextSlug !== lastRenderedSlug) departmentHeading.focus();
    } else if (!department && lastRenderedSlug) {
      document.querySelector("#plc-home-heading").focus();
    }
    lastRenderedSlug = nextSlug;
    renderSearch();
  }

  function clearSearchValue() {
    search.value = "";
    renderRoute();
    search.focus();
  }

  function openDepartment(department) {
    const slug = slugify(department.name);
    search.value = "";
    if (isEmbedded) {
      window.history.pushState({ ...(window.history.state || {}), plcDepartment: slug }, "", window.location.href);
      selectedDepartmentSlug = slug;
      renderRoute();
      return;
    }
    if (window.location.hash === `#department/${slug}`) {
      renderRoute();
      return;
    }
    window.location.hash = `department/${encodeURIComponent(slug)}`;
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
      const response = await fetch("assets/data/plc-data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`The directory data could not be loaded (HTTP ${response.status}).`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.departments)) throw new Error("The directory data has an unexpected format.");

      departments = payload.departments
        .filter((department) => department && typeof department.name === "string" && Array.isArray(department.educators))
        .map((department) => ({
          name: department.name.trim(),
          educators: department.educators
            .filter((record) => record && typeof record.name === "string" && record.name.trim())
            .map((record) => ({
              name: record.name.trim(),
              role: typeof record.role === "string" ? record.role.trim() : "",
              folderUrl: typeof record.folderUrl === "string" ? record.folderUrl : null,
              photoUrl: typeof record.photoUrl === "string" ? record.photoUrl : null,
            })),
        }));
      departmentBySlug = new Map(departments.map((department) => [slugify(department.name), department]));
      const total = departments.reduce((sum, department) => sum + department.educators.length, 0);
      departmentTotal.textContent = String(departments.length);
      educatorTotal.textContent = String(total);
      renderDepartmentGrid();
      status.hidden = true;
      directoryView.setAttribute("aria-busy", "false");
      renderRoute();
    } catch (error) {
      if (skeletonGrid) skeletonGrid.hidden = true;
      const message = error instanceof Error ? error.message : "An unexpected error prevented the PLC directory from loading.";
      showFailure(`${message} Check your connection and try again.`);
    }
  }

  search.addEventListener("input", renderRoute);
  clearSearch.addEventListener("click", () => {
    clearSearchValue();
  });
  emptySearchClear?.addEventListener("click", clearSearchValue);
  backButton.addEventListener("click", () => {
    search.value = "";
    if (isEmbedded) {
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
    if (isEmbedded) {
      selectedDepartmentSlug = window.history.state?.plcDepartment || "";
      search.value = "";
    }
    renderRoute();
  });
  if (isEmbedded) {
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
}
