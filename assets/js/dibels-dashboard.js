(() => {
  const $ = (id) => document.getElementById(id);
  const root = $("academic-dibels-panel");
  if (!root) return;

  const rowsHost = $("dibels-results-body");
  const comparisonHost = $("dibels-comparison-body");
  const qualityHost = $("dibels-quality-body");
  const charts = window.AMSSCharts;
  const filters = ["dibels-round-filter", "dibels-grade-filter", "dibels-class-filter", "dibels-stage-filter"].map($);
  const metrics = [
    ["meanBeginningCompositeScore", "Composite score"],
    ["meanOrfAccuracy", "ORF accuracy"],
    ["meanOrfWords", "ORF words correct"],
    ["meanMazeAdjustedScore", "MAZE adjusted score"],
  ];
  const tableMetrics = [metrics[2], metrics[1], metrics[3], metrics[0]];
  const pageSize = 10;
  let groups = [];
  let tablePage = 0;
  let comparisonPage = 0;

  const formatMetric = (value, key) => {
    if (value === null || value === undefined || value === "") return "—";
    if (!Number.isFinite(Number(value))) return "—";
    return key === "meanOrfAccuracy" ? `${(Number(value) * 100).toFixed(1)}%` : Number(value).toFixed(1);
  };
  const selectedGroups = () => {
    const query = ($("dibels-student-search")?.value || "").trim().toLocaleLowerCase();
    return groups.filter((group) =>
      filters.every((filter, index) => !filter?.value || [group.round, group.grade, group.class, group.stage][index] === filter.value)
      && (!query || `${group.class} ${group.round} ${group.stage}`.toLocaleLowerCase().includes(query))
    );
  };

  const updateOptions = () => {
    [["Round", "round"], ["Grade", "grade"], ["Class", "class"], ["Stage", "stage"]].forEach(([label, key], index) => {
      const filter = filters[index];
      if (!filter) return;
      const previous = filter.value;
      const values = [...new Set(groups.map((group) => group[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      filter.replaceChildren(new Option(`All ${label.toLocaleLowerCase()}s`, ""), ...values.map((value) => new Option(value, value)));
      if (values.includes(previous)) filter.value = previous;
    });
  };

  const drawChart = (id, key, title, rows) => {
    const host = $(id);
    if (!host || !charts) return;
    host.replaceChildren();
    const usable = rows.filter((group) => Number.isFinite(Number(group[key])));
    if (!usable.length) {
      host.textContent = "No released aggregate groups for this selection.";
      return;
    }
    const width = Math.max(680, host.clientWidth || 0);
    const height = 310;
    const left = 56;
    const right = width - 20;
    const top = 24;
    const bottom = height - 62;
    const chartValue = (group) => Number(group[key]) * (key === "meanOrfAccuracy" ? 100 : 1);
    const maximum = Math.max(1, ...usable.map(chartValue)) * 1.12;
    const svg = charts.makeSvg(host, width, height, "dibels-aggregate-chart", `${title}, class group averages`);
    const y = charts.drawYAxis(svg, {
      left, right, top, height: bottom - top, min: 0, max: maximum,
      ticks: [0, maximum / 2, maximum],
      format: (value) => key === "meanOrfAccuracy" ? `${Number(value).toFixed(0)}%` : Number(value).toFixed(0),
      gridClass: "dibels-grid",
    });
    usable.forEach((group, index) => {
      const x = charts.scaleX(index, usable.length, left, right - left);
      const value = chartValue(group);
      const yValue = y(value);
      const display = formatMetric(value, key);
      charts.rect(svg, x - 14, yValue, 28, bottom - yValue, "dibels-bar", "#455d4b",
        `${group.class}, ${group.round}, ${group.stage}: ${display}; cohort ${group.cohortSizeBand}`);
      charts.text(svg, display, x, yValue - 6, "dibels-label");
      charts.text(svg, group.class, x, bottom + 18, "dibels-category");
    });
  };

  const fillRows = (host, rows, metricsToShow, emptyText, includeBand) => {
    if (!host) return;
    host.replaceChildren();
    if (!rows.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = metricsToShow.length + (includeBand ? 4 : 3);
      cell.textContent = emptyText;
      row.append(cell);
      host.append(row);
      return;
    }
    rows.forEach((group) => {
      const row = document.createElement("tr");
      const values = [group.class, group.round, group.stage];
      if (includeBand) values.push(group.cohortSizeBand);
      metricsToShow.forEach(([key]) => values.push(formatMetric(group[key], key)));
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value ?? "—");
        row.append(cell);
      });
      host.append(row);
    });
  };

  const renderResults = (rows) => {
    const query = ($("dibels-table-search")?.value || "").trim().toLocaleLowerCase();
    const matches = rows.filter((group) =>
      !query || [group.class, group.round, group.stage, group.cohortSizeBand, ...tableMetrics.map(([key]) => group[key])]
        .join(" ").toLocaleLowerCase().includes(query)
    );
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    tablePage = Math.min(tablePage, pages - 1);
    const start = tablePage * pageSize;
    fillRows(rowsHost, matches.slice(start, start + pageSize), tableMetrics, "No aggregate groups match this search.", true);
    const count = $("dibels-table-count");
    if (count) count.textContent = matches.length ? `Showing ${start + 1}–${Math.min(start + pageSize, matches.length)} of ${matches.length} released aggregate groups.` : "No released aggregate groups match this search.";
    const label = $("dibels-page-label");
    if (label) label.textContent = `Page ${tablePage + 1} of ${pages}`;
    const previous = $("dibels-page-prev");
    const next = $("dibels-page-next");
    if (previous) previous.disabled = tablePage === 0;
    if (next) next.disabled = tablePage >= pages - 1;
  };

  const renderComparisons = (rows) => {
    const mode = $("dibels-compare-mode")?.value || "within";
    const usable = rows.filter((group) => mode === "rounds" ? ["Round 1", "Round 2"].includes(group.round) : ["Beginning", "End"].includes(group.stage));
    usable.sort((a, b) => {
      const first = String(a.class).localeCompare(String(b.class), undefined, { numeric: true });
      if (first) return first;
      if (mode === "rounds") return String(a.stage).localeCompare(String(b.stage)) || String(a.round).localeCompare(String(b.round));
      return String(a.round).localeCompare(String(b.round)) || String(a.stage).localeCompare(String(b.stage));
    });
    const pages = Math.max(1, Math.ceil(usable.length / pageSize));
    comparisonPage = Math.min(comparisonPage, pages - 1);
    const start = comparisonPage * pageSize;
    fillRows(comparisonHost, usable.slice(start, start + pageSize), tableMetrics, "No released aggregate groups match this comparison.", false);
    const note = $("dibels-comparison-note");
    if (note) {
      const roundLimited = mode === "rounds" && filters[0]?.value;
      const stageLimited = mode === "within" && filters[3]?.value;
      note.textContent = mode === "rounds"
        ? `${roundLimited ? "The selected round filter limits this view to one round. Choose All rounds to view Round 1 and Round 2 together. " : "Round 1 and Round 2 cohort means are listed separately by stage. "}Cohort summaries do not link individual learners or establish individual growth.`
        : `${stageLimited ? `The selected stage filter shows ${filters[3].value} only. ` : "Beginning and End cohort means are listed separately. "}These are aggregate groups and do not link individual learners.`;
    }
    const label = $("dibels-compare-page-label");
    if (label) label.textContent = `Page ${comparisonPage + 1} of ${pages}`;
    const previous = $("dibels-compare-page-prev");
    const next = $("dibels-compare-page-next");
    if (previous) previous.disabled = comparisonPage === 0;
    if (next) next.disabled = comparisonPage >= pages - 1;
  };

  const render = () => {
    updateOptions();
    const rows = selectedGroups();
    const status = $("dibels-load-status");
    if (status) status.textContent = `${rows.length} public class/round/stage groups; groups below 10 are suppressed.`;
    if ($("dibels-count-records")) $("dibels-count-records").textContent = String(rows.length);
    if ($("dibels-count-students")) $("dibels-count-students").textContent = "10+";
    if ($("dibels-count-grades")) $("dibels-count-grades").textContent = String(new Set(rows.map((group) => group.grade)).size);
    if ($("dibels-count-classes")) $("dibels-count-classes").textContent = String(new Set(rows.map((group) => group.class)).size);
    const studentSearch = $("dibels-student-search");
    if (studentSearch) {
      studentSearch.placeholder = "Search class, round, or stage";
      studentSearch.setAttribute("aria-autocomplete", "none");
      studentSearch.removeAttribute("aria-controls");
    }
    const suggestions = $("dibels-student-suggestions");
    if (suggestions) suggestions.hidden = true;
    const studentCard = $("dibels-student-card");
    if (studentCard) studentCard.textContent = "Individual student lookup is not published. This dashboard uses cohort summaries only.";
    const recordControls = $("dibels-student-record-controls");
    if (recordControls) recordControls.hidden = true;
    const lookupHeading = $("dibels-student-search")?.closest(".dibels-lookup-panel")?.querySelector(".dibels-panel-heading h2");
    if (lookupHeading) lookupHeading.textContent = "Public cohort summaries";
    const lookupDescription = lookupHeading?.parentElement?.querySelector("p");
    if (lookupDescription) lookupDescription.textContent = "Search released class, round, and stage summaries. Individual learner records are not published.";
    const searchLabel = document.querySelector('label[for="dibels-student-search"]');
    if (searchLabel) searchLabel.textContent = "Search class, round, or stage";
    renderResults(rows);
    renderComparisons(rows);
    const qualityCounts = $("dibels-quality-counts");
    if (qualityCounts) qualityCounts.textContent = "Individual assessment review records are not included in the public dataset.";
    const resultsCaption = rowsHost?.closest("table")?.querySelector("caption");
    if (resultsCaption) resultsCaption.textContent = "Released public DIBELS cohort summaries";
    const qualityHeading = qualityHost?.closest(".dibels-detail-section")?.querySelector("h2");
    if (qualityHeading) qualityHeading.textContent = "Public data and suppression notes";
    const qualityCaption = qualityHost?.closest("table")?.querySelector("caption");
    if (qualityCaption) qualityCaption.textContent = "Public DIBELS aggregate release notes";
    if (qualityHost) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "Individual score-review details are withheld; only released cohort summaries are shown.";
      row.append(cell);
      qualityHost.replaceChildren(row);
    }
    const summary = $("dibels-filter-summary");
    if (summary) summary.textContent = "Public cohort summaries only";
    metrics.forEach(([key, title], index) => drawChart(
      ["dibels-chart-composite", "dibels-chart-accuracy", "dibels-chart-words", "dibels-chart-maze"][index], key, title, rows,
    ));
  };

  const movePage = (delta, comparison = false) => {
    if (comparison) {
      comparisonPage = Math.max(0, comparisonPage + delta);
      renderComparisons(selectedGroups());
    } else {
      tablePage = Math.max(0, tablePage + delta);
      renderResults(selectedGroups());
    }
  };

  fetch("assets/data/public/reading-assessment.json", { headers: { Accept: "application/json" } })
    .then((response) => {
      if (!response.ok) throw new Error(`Public DIBELS data request failed (${response.status})`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.groups)) throw new Error("Public DIBELS aggregate data is unavailable.");
      groups = data.groups.filter((group) => !group.suppressed && group.cohortSizeBand === "10+");
      filters.forEach((filter) => filter?.addEventListener("change", () => { tablePage = 0; comparisonPage = 0; render(); }));
      $("dibels-student-search")?.addEventListener("input", () => { tablePage = 0; comparisonPage = 0; render(); });
      $("dibels-table-search")?.addEventListener("input", () => { tablePage = 0; renderResults(selectedGroups()); });
      $("dibels-compare-mode")?.addEventListener("change", () => { comparisonPage = 0; renderComparisons(selectedGroups()); });
      $("dibels-page-prev")?.addEventListener("click", () => movePage(-1));
      $("dibels-page-next")?.addEventListener("click", () => movePage(1));
      $("dibels-compare-page-prev")?.addEventListener("click", () => movePage(-1, true));
      $("dibels-compare-page-next")?.addEventListener("click", () => movePage(1, true));
      render();
    })
    .catch((error) => {
      const status = $("dibels-load-status");
      if (status) status.textContent = "Could not load the public DIBELS aggregate dataset.";
      console.error(error);
    });
})();
