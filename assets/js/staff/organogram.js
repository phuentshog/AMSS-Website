(() => {
  const root = document.querySelector("#staff-directory-groups");
  const data = window.AMSS_STAFF_DIRECTORY;
  if (!root || !data) return;

  const groups = new Map(data.groups.map((group) => [group.id, group]));
  const people = new Map(data.staff.map((person) => [person.id, person]));
  const categories = document.querySelector("#staff-category-nav");
  const departmentTrigger = document.querySelector("#department-trigger");
  const departmentMenu = document.querySelector("#department-menu");
  const searchInput = document.querySelector("#staff-search");
  const status = document.querySelector("#staff-results-status");
  const viewButtons = [...document.querySelectorAll("[data-staff-view]")];
  const profileDialog = document.querySelector(".staff-profile-dialog");
  const profileContent = document.querySelector("#staff-profile-content");

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const asValues = (values) => (Array.isArray(values) ? values : []).filter(Boolean);
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const personName = (person) => person.name || "Name not listed";
  const hasValue = (values) => asValues(values).length > 0;
  const membershipFor = (person, groupId) => person.memberships.find((membership) => membership.group === groupId);
  const groupTitle = (groupId) => groups.get(groupId)?.title || "";
  const departmentsSection = data.sections.find((section) => section.id === "departments");
  const departmentGroups = (departmentsSection?.groups || [])
    .map((id) => groups.get(id))
    .filter((group) => group && group.members.some((id) => people.has(id)));
  const smtGroup = groups.get("smt");

  const designationValues = (person, membership) => unique([
    ...asValues(membership?.designation),
    ...asValues(person.designation),
  ]);
  const groupNames = (person) => unique(person.memberships.map((membership) => groupTitle(membership.group)));
  const departmentNames = (person) => unique(person.memberships
    .filter((membership) => groups.get(membership.group)?.section === "departments")
    .map((membership) => groupTitle(membership.group)));
  const isDepartmentHead = (person, groupId) => {
    const membership = membershipFor(person, groupId);
    const values = [
      ...asValues(membership?.designation),
      ...asValues(membership?.responsibilities),
    ];
    return values.some((value) => /\b(?:HOD|head\s+of\s+department)\b/i.test(value));
  };
  const headFor = (group) => group.members
    .map((id) => people.get(id))
    .find((person) => person && isDepartmentHead(person, group.id));

  const leadership = (smtGroup?.members || [])
    .map((id) => people.get(id))
    .filter(Boolean);
  const principal = leadership.find((person) =>
    asValues(person.designation).some((value) => value.trim().toLowerCase() === "principal"));
  const vicePrincipal = leadership.find((person) =>
    asValues(person.designation).some((value) => value.trim().toLowerCase() === "vice principal"));
  const otherSmt = leadership.filter((person) => person !== principal && person !== vicePrincipal);
  const leadershipIds = new Set(leadership.map((person) => person.id));

  let selectedCategory = "all";
  let selectedDepartment = "";
  let selectedView = "grid";
  let query = "";

  const personSearchText = (person) => {
    const memberships = person.memberships.flatMap((membership) => [
      groupTitle(membership.group),
      ...asValues(membership.designation),
      ...asValues(membership.subject),
      ...asValues(membership.responsibilities),
    ]);
    return [
      person.name,
      ...asValues(person.designation),
      ...asValues(person.subject),
      ...asValues(person.responsibilities),
      ...asValues(person.qualification),
      ...groupNames(person),
      ...memberships,
    ].join(" ").toLocaleLowerCase();
  };
  const matchesSearch = (person) => !query || personSearchText(person).includes(query);

  const makeBadge = (text, className = "") => make("span", `staff-profile-badge ${className}`.trim(), text);

  const createCard = (person, options = {}) => {
    const { groupId = "", size = "standard", badge = "" } = options;
    const membership = groupId ? membershipFor(person, groupId) : undefined;
    const card = make("article", `staff-profile-card staff-profile-card--${size}`);
    const button = make("button", "staff-profile-trigger");
    button.type = "button";
    button.dataset.profileId = person.id;
    button.setAttribute("aria-label", `View profile for ${personName(person)}`);

    const photoFrame = make("span", "staff-photo-frame");
    const image = make("img");
    image.src = person.photo;
    image.alt = `Portrait of ${personName(person)}`;
    image.loading = "lazy";
    image.decoding = "async";
    photoFrame.append(image);

    const content = make("span", "staff-profile-card-content");
    content.append(make("span", "staff-profile-name", personName(person)));
    const designations = designationValues(person, membership);
    if (designations.length) {
      content.append(make("span", "staff-profile-designation", designations.join(" · ")));
    }

    const labels = unique([
      badge,
      ...(groupId && groups.get(groupId)?.section === "departments" ? [groupTitle(groupId)] : []),
      ...asValues(membership?.subject).slice(0, 1),
    ]);
    if (labels.length) {
      const badges = make("span", "staff-profile-badges");
      labels.forEach((label) => badges.append(makeBadge(label)));
      content.append(badges);
    }

    const roles = unique([
      ...asValues(membership?.responsibilities),
      ...asValues(person.responsibilities),
    ]);
    if (roles.length) {
      content.append(make("span", "staff-profile-role", roles.slice(0, 2).join(" · ")));
    }

    button.append(photoFrame, content);
    card.append(button);
    return card;
  };

  const createSection = (title, className = "") => {
    const section = make("section", `staff-results-section ${className}`.trim());
    const headingId = `staff-results-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const heading = make("h3", "staff-results-heading", title);
    heading.id = headingId;
    section.setAttribute("aria-labelledby", headingId);
    section.append(heading);
    return section;
  };

  const createCardGrid = () => make("div", `staff-profile-grid staff-profile-grid--${selectedView}`);

  const renderLeadership = (matchingLeadership) => {
    if (!matchingLeadership.length) return null;
    const section = createSection("School Leadership", "staff-leadership-section");
    const tree = make("div", `org-leadership-tree org-leadership-tree--${selectedView}`);
    tree.setAttribute("aria-label", "Principal, Vice Principal and School Management Team");
    const matchingIds = new Set(matchingLeadership.map((person) => person.id));

    const addTier = (title, personList, size, tierName) => {
      const visiblePeople = personList.filter((person) => matchingIds.has(person.id));
      if (!visiblePeople.length) return false;
      const tier = make("section", `org-leadership-tier org-leadership-tier--${tierName}`);
      const heading = make("h4", "org-leadership-title", title);
      tier.append(heading);
      const cards = make("div", "org-leadership-cards");
      visiblePeople.forEach((person) => cards.append(createCard(person, { size, badge: title })));
      tier.append(cards);
      tree.append(tier);
      return true;
    };
    const addConnector = () => tree.append(make("span", "org-leadership-connector"));

    let hasTier = false;
    if (addTier("Principal", principal ? [principal] : [], "principal", "principal")) hasTier = true;
    if (addTier("Vice Principal", vicePrincipal ? [vicePrincipal] : [], "vice-principal", "vice-principal")) {
      if (hasTier) tree.insertBefore(make("span", "org-leadership-connector"), tree.lastElementChild);
      hasTier = true;
    }
    if (addTier("School Management Team (SMT)", otherSmt, "leadership", "smt")) {
      if (hasTier) {
        const smtTier = tree.lastElementChild;
        tree.insertBefore(make("span", "org-leadership-connector"), smtTier);
      }
    }
    section.append(tree);
    return section;
  };

  const renderHod = (person, group) => {
    const tier = make("div", "department-head-tier");
    tier.append(make("p", "department-tree-label", "Department Head"));
    tier.append(createCard(person, { groupId: group.id, size: "hod", badge: "HOD" }));
    tier.append(make("span", "department-tree-connector", ""));
    return tier;
  };

  const renderDepartment = (group, members) => {
    const section = createSection(`${group.title} Department`, "staff-department-section");
    const head = headFor(group);
    const visibleHead = head && members.some((person) => person.id === head.id) ? head : null;
    const remaining = members.filter((person) => person !== visibleHead);

    if (visibleHead) section.append(renderHod(visibleHead, group));
    else if (!head) {
      section.append(make("p", "staff-hierarchy-note", "A department head is not identified in the available staff data."));
    }
    if (remaining.length) {
      const staffHeading = make("h4", "department-members-heading", visibleHead ? "Department Members" : "Department Staff");
      section.append(staffHeading);
      const grid = createCardGrid();
      remaining.forEach((person) => grid.append(createCard(person, {
        groupId: group.id,
        size: "standard",
        badge: membershipFor(person, group.id)?.designation?.includes("HOD") ? "HOD" : "",
      })));
      section.append(grid);
    }
    return section;
  };

  const renderCategoryGroup = (group, members, heading = group.title) => {
    const section = createSection(heading);
    const grid = createCardGrid();
    members.forEach((person) => grid.append(createCard(person, {
      groupId: group.id,
      size: selectedCategory === "smt" || selectedCategory === "academic-board" ? "medium" : "standard",
      badge: group.title,
    })));
    section.append(grid);
    return section;
  };

  const renderAllStaff = (matchedPeople) => {
    const leaderMatches = matchedPeople.filter((person) => leadershipIds.has(person.id));
    const leadershipSection = renderLeadership(leaderMatches);
    if (leadershipSection) root.append(leadershipSection);
    if (selectedView === "tree" && matchedPeople.length) {
      root.append(make("p", "staff-hierarchy-note", "Only recorded leadership roles are connected. Other profiles are grouped by their primary staff listing; the source does not specify additional reporting lines."));
    }

    const remaining = matchedPeople.filter((person) => !leadershipIds.has(person.id));
    const groupsByPrimary = new Map();
    remaining.forEach((person) => {
      const id = person.primaryGroup;
      if (!id) return;
      if (!groupsByPrimary.has(id)) groupsByPrimary.set(id, []);
      groupsByPrimary.get(id).push(person);
    });

    const orderedGroups = [];
    for (const section of data.sections) {
      for (const groupId of section.groups) {
        const members = groupsByPrimary.get(groupId);
        const group = groups.get(groupId);
        if (members?.length && group && !orderedGroups.includes(groupId)) {
          orderedGroups.push(groupId);
          root.append(renderCategoryGroup(group, members, groupId === "academic-board" ? "Academic Board" : group.title));
        }
      }
    }
    for (const [groupId, members] of groupsByPrimary) {
      const group = groups.get(groupId);
      if (group && !orderedGroups.includes(groupId)) {
        root.append(renderCategoryGroup(group, members));
      }
    }
  };

  const render = () => {
    root.replaceChildren();
    root.className = `staff-directory-results is-view-${selectedView}`;
    const matchingPeople = data.staff.filter(matchesSearch);
    let displayedCount = 0;

    if (selectedCategory === "all") {
      displayedCount = matchingPeople.length;
      if (matchingPeople.length) renderAllStaff(matchingPeople);
    } else if (selectedCategory === "smt") {
      const members = leadership.filter(matchesSearch);
      displayedCount = members.length;
      const section = renderLeadership(members);
      if (section) root.append(section);
    } else if (selectedCategory === "academic-board") {
      const group = groups.get("academic-board");
      const members = (group?.members || []).map((id) => people.get(id)).filter((person) => person && matchesSearch(person));
      displayedCount = members.length;
      if (group && members.length) root.append(renderCategoryGroup(group, members));
    } else if (selectedCategory === "department") {
      const group = groups.get(selectedDepartment);
      const members = (group?.members || []).map((id) => people.get(id)).filter((person) => person && matchesSearch(person));
      displayedCount = members.length;
      if (group && members.length) root.append(renderDepartment(group, members));
    } else {
      const group = groups.get(selectedCategory);
      const members = (group?.members || []).map((id) => people.get(id)).filter((person) => person && matchesSearch(person));
      displayedCount = members.length;
      if (selectedView === "tree" && members.length) {
        root.append(make("p", "staff-hierarchy-note", "The staff record lists group membership but does not specify reporting lines. Profiles are shown without an invented hierarchy."));
      }
      if (group && members.length) root.append(renderCategoryGroup(group, members));
    }

    if (!displayedCount) {
      const empty = make("p", "staff-empty-state", query ? "No staff profiles match your search in this category." : "No staff profiles are listed in this category.");
      root.append(empty);
    }
    if (status) {
      const noun = displayedCount === 1 ? "profile" : "profiles";
      status.textContent = `${displayedCount} ${noun}${query ? ` matching “${searchInput.value.trim()}”` : ""}`;
    }
  };

  const setCategory = (category, departmentId = "") => {
    selectedCategory = category;
    selectedDepartment = departmentId;
    categories?.querySelectorAll("[data-staff-category]").forEach((button) => {
      const active = button.dataset.staffCategory === category && category !== "department";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    departmentTrigger?.classList.toggle("is-active", category === "department");
    if (departmentTrigger) {
      departmentTrigger.setAttribute("aria-expanded", "false");
      departmentTrigger.setAttribute("aria-pressed", String(category === "department"));
      departmentTrigger.querySelector(".department-current-label")?.remove();
      const currentGroup = groups.get(departmentId);
      if (currentGroup) {
        const label = make("span", "department-current-label", currentGroup.title);
        departmentTrigger.insertBefore(label, departmentTrigger.querySelector(".category-chevron"));
      }
    }
    menuButtons.forEach((button) => {
      const active = button.dataset.departmentId === departmentId && category === "department";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (departmentMenu) departmentMenu.hidden = true;
    render();
  };

  const menuButtons = departmentGroups.map((group) => {
    const button = make("button", "department-menu-item", group.title);
    button.type = "button";
    button.dataset.departmentId = group.id;
    departmentMenu?.append(button);
    return button;
  });

  categories?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-staff-category]");
    if (button) setCategory(button.dataset.staffCategory);
  });
  departmentTrigger?.addEventListener("click", () => {
    const expanded = departmentTrigger.getAttribute("aria-expanded") === "true";
    departmentTrigger.setAttribute("aria-expanded", String(!expanded));
    if (departmentMenu) departmentMenu.hidden = expanded;
    if (!expanded) menuButtons[0]?.focus();
  });
  departmentMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-department-id]");
    if (button) setCategory("department", button.dataset.departmentId);
  });
  departmentMenu?.addEventListener("keydown", (event) => {
    const currentIndex = menuButtons.indexOf(document.activeElement);
    if (event.key === "Escape") {
      departmentMenu.hidden = true;
      departmentTrigger?.setAttribute("aria-expanded", "false");
      departmentTrigger?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      menuButtons[(currentIndex + direction + menuButtons.length) % menuButtons.length]?.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".department-filter")) {
      if (departmentMenu) departmentMenu.hidden = true;
      departmentTrigger?.setAttribute("aria-expanded", "false");
    }
  });
  searchInput?.addEventListener("input", () => {
    query = searchInput.value.trim().toLocaleLowerCase();
    render();
  });
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchInput.value) {
      searchInput.value = "";
      query = "";
      render();
    }
  });
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedView = button.dataset.staffView;
      viewButtons.forEach((viewButton) => {
        const active = viewButton === button;
        viewButton.classList.toggle("is-active", active);
        viewButton.setAttribute("aria-pressed", String(active));
      });
      render();
    });
  });
  root.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-profile-id]");
    if (!trigger) return;
    const person = people.get(trigger.dataset.profileId);
    if (person) openProfile(person, trigger);
  });

  function openProfile(person, trigger) {
    if (!profileDialog || !profileContent || typeof profileDialog.showModal !== "function") return;
    profileContent.replaceChildren();

    const header = make("div", "staff-profile-modal-header");
    const image = make("img", "staff-profile-modal-photo");
    image.src = person.photo;
    image.alt = `Portrait of ${personName(person)}`;
    const identity = make("div", "staff-profile-modal-identity");
    const name = make("h2", "staff-profile-modal-name", personName(person));
    name.id = "staff-profile-name";
    profileDialog.setAttribute("aria-labelledby", name.id);
    identity.append(name);
    const designations = designationValues(person);
    if (designations.length) identity.append(make("p", "staff-profile-modal-designation", designations.join(" · ")));
    const badges = make("div", "staff-profile-badges");
    groupNames(person).forEach((group) => badges.append(makeBadge(group)));
    if (badges.childElementCount) identity.append(badges);
    header.append(image, identity);
    profileContent.append(header);

    const fields = [
      ["Department", departmentNames(person)],
      ["Subject", asValues(person.subject)],
      ["Qualification", asValues(person.qualification)],
      ["Roles & responsibilities", asValues(person.responsibilities)],
      ["Group memberships", groupNames(person)],
    ];
    person.memberships.forEach((membership) => {
      const title = groupTitle(membership.group);
      const roleValues = unique([
        ...asValues(membership.designation),
        ...asValues(membership.responsibilities),
      ]);
      if (membership.group === "wellbeing" && roleValues.length) fields.push(["Wellbeing role", roleValues]);
      if (membership.group === "esp-gsp" && roleValues.length) fields.push(["ESP & GSP role", roleValues]);
      if (membership.group === "academic-board" && roleValues.length) fields.push([`${title} role`, roleValues]);
    });

    const details = make("dl", "staff-profile-modal-details");
    const added = new Set();
    fields.forEach(([label, values]) => {
      const validValues = unique(asValues(values));
      if (!validValues.length) return;
      const key = `${label}:${validValues.join("|")}`;
      if (added.has(key)) return;
      added.add(key);
      const row = make("div", "staff-profile-modal-row");
      row.append(make("dt", "", label), make("dd", "", validValues.join(" · ")));
      details.append(row);
    });
    if (details.childElementCount) profileContent.append(details);

    profileDialog.showModal();
    profileDialog.querySelector(".staff-profile-close")?.focus();
    profileDialog.addEventListener("close", () => trigger?.focus(), { once: true });
  }

  profileDialog?.querySelector(".staff-profile-close")?.addEventListener("click", () => profileDialog.close());
  profileDialog?.addEventListener("click", (event) => {
    if (event.target === profileDialog) profileDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && profileDialog?.open) {
      profileDialog.close();
      return;
    }
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey
      && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      searchInput?.focus();
    }
  });

  render();
})();
