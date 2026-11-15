const DATA_URL = "assets/data/public/academic-performance.json";
const classLabels = { VI: "Class VI", VIII: "Class VIII", X: "Class X" };
const academicRoot = document.querySelector("#academic");

if (academicRoot) {
  const chartTools = window.AMSSCharts;
  let activeClass = "";
  let records = [];
  const classFilter = document.querySelector("#academic-class-filter");
  const subjectFilter = document.querySelector("#academic-subject-filter");
  const teacherFilter = document.querySelector("#academic-teacher-filter");
  const subjectSearch = document.querySelector("#academic-subject-search");
  const clearSearch = document.querySelector("#academic-search-clear");
  const filterStatus = document.querySelector("#academic-filter-status");
  const format = (value) => Number.isFinite(value) ? Number(value).toFixed(2) : "N/A";
  const searchable = (record) => `${record.subject || ""} ${record.department || ""}`.toLocaleLowerCase();
  const canonicalSubject = (subject) => {
    const value = String(subject || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
    return ["history", "history and civics", "hcg (history & civics)"].includes(value) ? "History and Civics" : String(subject || "").trim();
  };

  function buildRecord(record) {
    const target = Number.isFinite(record.targetMean) ? record.targetMean : null;
    const midterm = Number.isFinite(record.midtermMean) ? record.midtermMean : null;
    const valid = target !== null && midterm !== null;
    const difference = valid ? midterm - target : null;
    return { ...record, subject: canonicalSubject(record.subject), target, midterm, difference, status: valid ? (difference >= 0 ? "Achieved" : "Below Target") : "Unable to Assess" };
  }

  function normalizeAndDeduplicate(rawRecords) {
    const groups = new Map();
    for (const source of rawRecords) {
      const record = { ...source, subject: canonicalSubject(source.subject) };
      const key = `${record.class}\u0000${record.subject.toLocaleLowerCase()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    const normalized = [];
    for (const group of groups.values()) {
      if (group.length === 1) { normalized.push(group[0]); continue; }
      const signatures = new Set(group.map((r) => JSON.stringify([r.department, r.targetMean, r.midtermMean])));
      if (signatures.size === 1) normalized.push(group[0]);
      else normalized.push({ ...group[0], department: null, targetMean: null, midtermMean: null, duplicateConflict: true, limitation: "Conflicting duplicate records were found for this class and subject; the result is excluded until reconciled." });
    }
    return normalized;
  }

  function selectedRecords() {
    const query = (subjectSearch?.value || "").trim().toLocaleLowerCase();
    const selectedSubject = subjectFilter?.value || "";
    const selectedDepartment = teacherFilter?.value || "";
    return records.map(buildRecord).filter((record) => (!activeClass || record.class === activeClass)
      && (!selectedSubject || record.subject === selectedSubject)
      && (!selectedDepartment || record.department === selectedDepartment)
      && (!query || searchable(record).includes(query)));
  }

  function setChartDensity(host, count) {
    const filtered = Boolean(activeClass || subjectFilter?.value || teacherFilter?.value || subjectSearch?.value.trim());
    host.classList.toggle("is-filtered", filtered);
    host.classList.toggle("is-focused", filtered && count <= 3);
  }

  function rowsForFilterOptions() {
    const query = (subjectSearch?.value || "").trim().toLocaleLowerCase();
    return records.filter((record) => (!activeClass || record.class === activeClass)
      && (!query || searchable(record).includes(query)));
  }

  function replaceOptions(select, label, values, selectedValue = "") {
    if (!select) return "";
    const validValues = new Set(values);
    const nextValue = validValues.has(selectedValue) ? selectedValue : "";
    select.replaceChildren(new Option(label, ""));
    for (const value of values) select.add(new Option(value, value));
    select.value = nextValue;
    select.disabled = values.length === 0;
    return nextValue;
  }

  function renderOptions() {
    const context = rowsForFilterOptions();
    const oldSubject = subjectFilter?.value || "";
    const subjects = [...new Set(context.map((record) => record.subject).filter(Boolean))].sort();
    replaceOptions(subjectFilter, "All relevant subjects", subjects, oldSubject);

    const searchContext = context.filter((record) => !subjectFilter?.value || record.subject === subjectFilter.value);
    const departments = [...new Set(searchContext.map((record) => record.department).filter(Boolean))].sort();
    const oldDepartment = teacherFilter?.value || "";
    replaceOptions(teacherFilter, "All relevant departments", departments, oldDepartment);
    if (subjectSearch) subjectSearch.disabled = records.length === 0;
    if (clearSearch) clearSearch.disabled = !subjectSearch?.value;
  }

  function drawMeans(host, rows) {
    host.replaceChildren();
    const validRows = rows.filter((row) => row.target !== null && row.midterm !== null);
    setChartDensity(host, validRows.length);
    if (!validRows.length) {
      const empty = document.createElement("div"); empty.className = "academic-empty";
      empty.innerHTML = "<strong>No comparable results</strong>Target markers and midterm bars are shown only for assessable subjects.";
      host.append(empty); host.setAttribute("aria-label", "No comparable subject results"); return;
    }
    host.classList.add("academic-chart-scroll");
    const grades = activeClass ? [activeClass] : ["VI", "VIII", "X"];
    const abbreviation = (subject) => ({ English: "Eng", Dzongkha: "Dzo", "History and Civics": "Hist & Civics", Geography: "Geo", Mathematics: "Math", Maths: "Math", Science: "Sci", Chemistry: "Chem", Biology: "Bio" })[subject] || subject;
    for (const grade of grades) {
      const gradeRows = validRows.filter((row) => row.class === grade);
      if (!gradeRows.length) continue;
      const chartHeight = host.classList.contains("is-focused") ? 560 : 500;
      const width = Math.max(760, host.clientWidth || 0, 78 + 30 + gradeRows.length * 112), height = chartHeight;
      const left = 78, right = width - 28, top = 54, bottom = height - 112, plotHeight = bottom - top;
      const svg = chartTools.makeSvg(host, width, height, "academic-svg-chart", `${classLabels[grade]} subject midterm averages and target markers on a zero to 100 scale`);
      const y = chartTools.drawYAxis(svg, { left, right, top, height: plotHeight, min: 0, max: 100, ticks: [0, 25, 50, 75, 100], format: (value) => String(value), gridClass: "academic-svg-grid", zeroClass: "academic-svg-baseline" });
      chartTools.text(svg, "Marks out of 100", 8, 25, "academic-svg-axis-title", "start");
      chartTools.text(svg, classLabels[grade], (left + right) / 2, 27, "academic-svg-context");
      const slot = (right - left) / gradeRows.length, barWidth = Math.min(48, slot * 0.48);
      const labels = [], markers = [];
      gradeRows.forEach((row, index) => {
        const x = chartTools.scaleX(index, gradeRows.length, left, right - left);
        const midY = y(row.midterm), targetY = y(row.target), baseY = y(0);
        const label = `${classLabels[grade]} ${row.subject}`;
        chartTools.rect(svg, x - barWidth / 2, midY, barWidth, baseY - midY, "academic-svg-midterm", "#455d4b", `${label} · Midterm average: ${Number(row.midterm).toFixed(1)} marks · Target: ${Number(row.target).toFixed(1)} marks`);
        markers.push({ x, targetY, label });
        labels.push({ x, midY, targetY, row, label });
      });
      chartTools.line(svg, left, bottom, right, bottom, "academic-svg-baseline");
      markers.forEach(({ x, targetY, label }) => {
        chartTools.line(svg, x - barWidth / 2 - 3, targetY, x + barWidth / 2 + 3, targetY, "academic-svg-target");
        chartTools.categoryTitle(svg.lastElementChild, `${label} · Target marker`);
      });
      labels.forEach(({ x, midY, targetY, row }) => {
        const actualLabelY = midY + 18;
        const targetLabelAboveY = Math.max(top + 12, targetY - 9);
        const targetLabelBelowY = targetY + 18;
        let targetLabelY = targetLabelAboveY;
        if (Math.abs(targetLabelY - actualLabelY) < 20) {
          const targetLabelFarAboveY = Math.max(top + 12, targetY - 24);
          if (targetLabelBelowY < bottom - 4 && Math.abs(targetLabelBelowY - actualLabelY) >= 20) targetLabelY = targetLabelBelowY;
          else if (Math.abs(targetLabelFarAboveY - actualLabelY) >= 20) targetLabelY = targetLabelFarAboveY;
        }
        chartTools.text(svg, Number(row.midterm).toFixed(1), x, actualLabelY, "academic-svg-data-label academic-svg-data-label--inside");
        chartTools.text(svg, Number(row.target).toFixed(1), x, targetLabelY, "academic-svg-target-label");
        const category = chartTools.text(svg, abbreviation(row.subject), x, bottom + 28, "academic-svg-category");
        chartTools.categoryTitle(category, `${row.subject} · Midterm ${Number(row.midterm).toFixed(1)} · Target ${Number(row.target).toFixed(1)}`);
      });
    }
    host.setAttribute("aria-label", `Midterm averages and targets for ${validRows.length} subject results on a 0 to 100 scale`);
  }

  function drawDifferences(host, rows) {
    host.replaceChildren();
    const validRows = rows.filter((row) => row.difference !== null);
    setChartDensity(host, validRows.length);
    if (!validRows.length) {
      const empty = document.createElement("div"); empty.className = "academic-empty";
      empty.innerHTML = "<strong>No comparable results</strong>Unable to Assess subjects are excluded from the difference graph.";
      host.append(empty); host.setAttribute("aria-label", "No assessable subject differences"); return;
    }
    host.classList.add("academic-chart-scroll");
    const limit = chartTools.niceMax(Math.max(...validRows.map((row) => Math.abs(row.difference))), 2);
    const abbreviation = (subject) => ({ English: "Eng", Dzongkha: "Dzo", "History and Civics": "Hist & Civics", Geography: "Geo", Mathematics: "Math", Maths: "Math", Science: "Sci", Chemistry: "Chem", Biology: "Bio" })[subject] || subject;
    for (const grade of (activeClass ? [activeClass] : ["VI", "VIII", "X"])) {
      const gradeRows = validRows.filter((row) => row.class === grade);
      if (!gradeRows.length) continue;
      const height = host.classList.contains("is-focused") ? 520 : 470;
      const width = Math.max(760, host.clientWidth || 0, 78 + 30 + gradeRows.length * 108);
      const left = 78, right = width - 28, top = 50, bottom = height - 102, plotHeight = bottom - top;
      const svg = chartTools.makeSvg(host, width, height, "academic-svg-chart academic-svg-gap", `${classLabels[grade]} subject gaps to target on a symmetric scale from minus ${limit} to plus ${limit} marks`);
      const ticks = [-limit, 0, limit];
      const y = chartTools.drawYAxis(svg, { left, right, top, height: plotHeight, min: -limit, max: limit, ticks, format: (value) => `${value > 0 ? "+" : ""}${Number(value.toFixed(1))}`, gridClass: "academic-svg-grid-light", zeroClass: "academic-svg-zero" });
      chartTools.text(svg, "Marks from target", 8, 25, "academic-svg-axis-title", "start");
      chartTools.text(svg, classLabels[grade], (left + right) / 2, 27, "academic-svg-context");
      const zeroY = y(0), slot = (right - left) / gradeRows.length, barWidth = Math.min(44, slot * 0.44);
      const labels = [];
      gradeRows.forEach((row, index) => {
        const x = chartTools.scaleX(index, gradeRows.length, left, right - left), endY = y(row.difference);
        const color = row.difference < 0 ? "#984638" : "#27623b";
        const status = row.difference > 0 ? "Above target" : row.difference < 0 ? "Below target" : "At target";
        chartTools.rect(svg, x - barWidth / 2, Math.min(zeroY, endY), barWidth, Math.abs(zeroY - endY), "academic-svg-gap-bar", color, `${classLabels[grade]} ${row.subject} · ${Number(row.difference).toFixed(1)} marks · ${status}`);
        labels.push({ x, endY, row, status });
      });
      labels.forEach(({ x, endY, row, status }) => {
        const valueY = row.difference >= 0 ? endY - 9 : endY + 18;
        chartTools.text(svg, `${row.difference > 0 ? "+" : ""}${Number(row.difference).toFixed(1)}`, x, Math.max(top + 15, Math.min(bottom - 3, valueY)), "academic-svg-data-label");
        const category = chartTools.text(svg, abbreviation(row.subject), x, bottom + 28, "academic-svg-category");
        chartTools.categoryTitle(category, `${row.subject} · ${status}`);
      });
    }
    host.setAttribute("aria-label", `Differences from target for ${validRows.length} assessable subjects; centered zero line`);
  }

  function renderDetails(row) {
    const host = document.querySelector("#academic-selected-detail");
    if (!host) return;
    host.replaceChildren();
    if (!row) {
      const empty = document.createElement("div"); empty.className = "academic-empty";
      const title = document.createElement("strong"); title.textContent = "No matching subject results";
      empty.append(title, document.createTextNode("Change or clear the filters to see results.")); host.append(empty); return;
    }
    const dl = document.createElement("dl"); dl.className = "academic-detail-grid";
    const details = [["Class", classLabels[row.class]], ["Subject", row.subject], ["Department", row.department || "Not specified"], ["Target mean", format(row.target)], ["Midterm mean", format(row.midterm)], ["Difference", row.difference === null ? "N/A" : `${row.difference > 0 ? "+" : ""}${format(row.difference)}`], ["Status", row.status]];
    if (row.limitation) details.push(["Note", row.limitation]);
    for (const [label, value] of details) { const wrapper = document.createElement("div"); const term = document.createElement("dt"); const valueNode = document.createElement("dd"); term.textContent = label; valueNode.textContent = value; wrapper.append(term, valueNode); dl.append(wrapper); }
    host.append(dl);
  }

  function appendDataRow(body, row, withLimitation = false) {
    const tr = document.createElement("tr");
    const values = [classLabels[row.class], row.subject, row.department || "Not specified", format(row.target), format(row.midterm), row.difference === null ? "N/A" : `${row.difference > 0 ? "+" : ""}${format(row.difference)}`, row.status];
    for (const value of values) { const td = document.createElement("td"); td.textContent = value; tr.append(td); }
    tr.lastElementChild.className = `academic-status academic-status--${row.status.toLocaleLowerCase().replaceAll(" ", "-")}`;
    if (withLimitation && row.limitation) { const trNote = document.createElement("tr"); trNote.className = "academic-limitation"; const td = document.createElement("td"); td.colSpan = 7; td.textContent = `Why unable to assess: ${row.limitation}`; trNote.append(td); body.append(tr, trNote); }
    else body.append(tr);
  }

  function renderResultsTable(rows) {
    const body = document.querySelector("#academic-table-body");
    const caption = document.querySelector("#academic-table-caption");
    if (!body) return;
    body.replaceChildren();
    if (caption) caption.textContent = `${activeClass ? classLabels[activeClass] : "All classes"} · ${rows.length} subject ${rows.length === 1 ? "row" : "rows"}`;
    if (!rows.length) { const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 7; td.textContent = "No matching results. Try another search or clear the filters."; tr.append(td); body.append(tr); renderDetails(null); return; }
    for (const row of rows) { appendDataRow(body, row); }
    renderDetails(rows[0]);
  }

  function renderSummary(rows) {
    const assessable = rows.filter((row) => row.target !== null && row.midterm !== null);
    const average = (key) => assessable.length ? assessable.reduce((sum, row) => sum + row[key], 0) / assessable.length : null;
    const met = assessable.filter((row) => row.difference >= 0).length;
    const set = (id, value) => { const node = document.querySelector(`#${id}`); if (node) node.textContent = value; };
    set("academic-kpi-subjects", assessable.length.toLocaleString());
    set("academic-kpi-subjects-note", `${assessable.length} with target and midterm results`);
    set("academic-kpi-midterm", average("midterm") === null ? "—" : format(average("midterm")));
    set("academic-kpi-target", average("target") === null ? "—" : format(average("target")));
    set("academic-kpi-target-met", assessable.length ? `${Math.round(met / assessable.length * 100)}%` : "—");
    set("academic-kpi-target-met-note", assessable.length ? `${met} of ${assessable.length} subjects at or above target` : "No assessable results");
  }

  function renderRankings(rows) {
    const body = document.querySelector("#academic-rank-body");
    const chartHost = document.querySelector("#academic-rank-chart");
    const scope = document.querySelector("#academic-rank-scope");
    const note = document.querySelector("#academic-rank-note");
    if (!body) return;
    body.replaceChildren();
    const byDepartment = new Map();
    for (const row of rows) {
      if (!row.department) continue;
      if (!byDepartment.has(row.department)) byDepartment.set(row.department, []);
      byDepartment.get(row.department).push(row);
    }
    const ranked = [];
    for (const [department, departmentRows] of byDepartment) {
      const assessable = departmentRows.filter((row) => row.difference !== null);
      if (!assessable.length) continue;
      const meanMidterm = assessable.reduce((sum, row) => sum + row.midterm, 0) / assessable.length;
      const meanTarget = assessable.reduce((sum, row) => sum + row.target, 0) / assessable.length;
      ranked.push({ department, assessable: assessable.length, meanMidterm, meanTarget, meanDifference: meanMidterm - meanTarget });
    }
    ranked.sort((a, b) => b.meanDifference - a.meanDifference || a.department.localeCompare(b.department));
    if (chartHost) {
      chartHost.replaceChildren();
      if (!ranked.length) {
        const empty = document.createElement("div"); empty.className = "academic-empty";
        const title = document.createElement("strong"); title.textContent = "Department comparison unavailable";
        empty.append(title, document.createTextNode("No department comparisons are available for these filters.")); chartHost.append(empty);
        chartHost.setAttribute("aria-label", "Department comparisons unavailable for these filters");
      } else {
        const width = Math.max(820, chartHost.clientWidth || 0, 140 + ranked.length * 180), height = 500;
        const left = 78, right = width - 28, top = 60, bottom = height - 110, plotHeight = bottom - top, plotWidth = right - left;
        const svg = chartTools.makeSvg(chartHost, width, height, "academic-svg-chart academic-svg-department", "Department midterm and target means on a shared zero to 100 marks scale");
        const y = chartTools.drawYAxis(svg, { left, right, top, height: plotHeight, min: 0, max: 100, ticks: [0, 25, 50, 75, 100], format: (value) => String(value), gridClass: "academic-svg-grid", zeroClass: "academic-svg-baseline" });
        const slot = plotWidth / ranked.length, barWidth = Math.min(32, slot * 0.24), baseY = y(0);
        const centers = ranked.map((entry, index) => {
          const center = chartTools.scaleX(index, ranked.length, left, plotWidth);
          const midX = center - barWidth - 2, targetX = center + 2;
          chartTools.rect(svg, midX, y(entry.meanMidterm), barWidth, baseY - y(entry.meanMidterm), "academic-svg-midterm", "#455d4b", `${entry.department} · Midterm mean ${entry.meanMidterm.toFixed(2)} · n = ${entry.assessable} subjects`);
          chartTools.rect(svg, targetX, y(entry.meanTarget), barWidth, baseY - y(entry.meanTarget), "academic-svg-department-target", "#b98a3e", `${entry.department} · Target mean ${entry.meanTarget.toFixed(2)} · n = ${entry.assessable} subjects`);
          return center;
        });
        chartTools.line(svg, left, bottom, right, bottom, "academic-svg-baseline");
        chartTools.text(svg, "Marks out of 100", 8, 26, "academic-svg-axis-title", "start");
        chartTools.text(svg, "Department means", (left + right) / 2, 26, "academic-svg-context");
        ranked.forEach((entry, index) => {
          const center = centers[index];
          chartTools.text(svg, `${entry.meanMidterm.toFixed(2)} / ${entry.meanTarget.toFixed(2)}`, center, top - 12, "academic-svg-department-value");
          const label = chartTools.text(svg, entry.department, center, bottom + 27, "academic-svg-category");
          chartTools.categoryTitle(label, `${entry.department} · Midterm mean ${entry.meanMidterm.toFixed(2)} · Target mean ${entry.meanTarget.toFixed(2)}`);
          chartTools.text(svg, `${entry.assessable} subjects`, center, bottom + 50, "academic-svg-secondary");
        });
        chartHost.setAttribute("aria-label", `Department midterm and target means on a zero to 100 marks scale; ${ranked.length} departments.`);
      }
    }
    if (!ranked.length) {
      const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 6; td.textContent = "No department results match these filters."; tr.append(td); body.append(tr);
    } else {
      let priorValue = null; let priorRank = 0;
      ranked.forEach((entry, index) => {
        const rank = priorValue !== null && Math.abs(entry.meanDifference - priorValue) < 1e-9 ? priorRank : index + 1;
        priorRank = rank; priorValue = entry.meanDifference;
        const tr = document.createElement("tr");
        for (const value of [rank, entry.department, entry.assessable, format(entry.meanMidterm), format(entry.meanTarget), `${entry.meanDifference > 0 ? "+" : ""}${format(entry.meanDifference)}`]) {
          const td = document.createElement("td"); td.textContent = String(value); if (typeof value === "number" || String(value).startsWith("+") || String(value).startsWith("-")) td.className = "academic-rank-value"; tr.append(td);
        }
        body.append(tr);
      });
    }
    if (scope) scope.textContent = `${activeClass ? `${classLabels[activeClass]} · ` : ""}Midterm and target means use the same assessable subjects.`;
    if (note) note.textContent = ranked.length ? "Ranked by department midterm minus target mean. Values use the same 0–100 scale." : "No department comparisons are available for these filters.";
  }

  function render() {
    const rows = selectedRecords();
    renderSummary(rows);
    const classText = activeClass ? classLabels[activeClass] : "All classes";
    const means = document.querySelector("#academic-means-chart");
    const differences = document.querySelector("#academic-difference-chart");
    const meansCaption = document.querySelector("#academic-means-caption");
    if (meansCaption) meansCaption.textContent = `${classText} · marks out of 100.`;
    if (means) drawMeans(means, rows);
    if (differences) drawDifferences(differences, rows);
    renderResultsTable(rows);
    renderRankings(rows);
    if (filterStatus) filterStatus.textContent = rows.length ? `${rows.length} matching subject ${rows.length === 1 ? "result" : "results"}.` : "No results match these filters. Change or clear your search.";
    if (clearSearch) clearSearch.disabled = !subjectSearch?.value;
  }

  const chartHosts = ["#academic-means-chart", "#academic-difference-chart", "#academic-rank-chart"]
    .map((selector) => document.querySelector(selector)).filter(Boolean);
  if ("ResizeObserver" in window) {
    let redrawFrame = 0;
    const chartSizeObserver = new ResizeObserver((entries) => {
      const needsRedraw = entries.some(({ target, contentRect }) => {
        if (contentRect.width < 1) return false;
        return [...target.querySelectorAll(".academic-svg-chart")].some((svg) =>
          svg.viewBox.baseVal.width + 1 < contentRect.width);
      });
      if (needsRedraw && records.length) {
        cancelAnimationFrame(redrawFrame);
        redrawFrame = requestAnimationFrame(render);
      }
    });
    chartHosts.forEach((host) => chartSizeObserver.observe(host));
  }

  function filtersChanged() { renderOptions(); render(); }
  classFilter?.addEventListener("change", () => { activeClass = classFilter.value; filtersChanged(); });
  subjectFilter?.addEventListener("change", filtersChanged);
  teacherFilter?.addEventListener("change", render);
  subjectSearch?.addEventListener("input", filtersChanged);
  clearSearch?.addEventListener("click", () => { if (subjectSearch) subjectSearch.value = ""; filtersChanged(); subjectSearch?.focus(); });

  fetch(DATA_URL).then((response) => response.ok ? response.json() : Promise.reject(new Error("Academic data unavailable"))).then((data) => {
    if (data?.auditStatus !== "verified" || !Array.isArray(data.records)) throw new Error("Verified academic audit data is unavailable");
    records = normalizeAndDeduplicate(data.records.filter((record) => Object.hasOwn(classLabels, record?.class)
      && typeof record?.subject === "string" && record.subject.trim().toLocaleLowerCase() !== "ss" && record.subject.trim().toLocaleLowerCase() !== "social studies"
      && (record.cohortSizeBand === "10+")
      && (record.targetMean === null || Number.isFinite(record.targetMean))
      && (record.midtermMean === null || Number.isFinite(record.midtermMean)))
      .map((record) => ({ ...record, department: typeof record.department === "string" ? record.department : null })));
    const method = document.querySelector("#academic-method-note");
    if (method) method.textContent = "A difference is the midterm mean minus the target mean. Midterm results are shown on a 100-mark scale. Missing comparisons are not assessed.";
    renderOptions(); render();
  }).catch(() => {
    if (filterStatus) filterStatus.textContent = "Exam results could not be loaded.";
  });
  render();
}
