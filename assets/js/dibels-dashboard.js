(() => {
  const charts = window.AMSSCharts;
  const DATA_URL = "assets/data/dibels-assessments.json";
  const $ = (id) => document.getElementById(id);
  const filters = {
    round: $("dibels-round-filter"), grade: $("dibels-grade-filter"),
    className: $("dibels-class-filter"), stage: $("dibels-stage-filter"),
  };
  const CLASS_ORDER = ["IV A", "IV B", "V A", "V B", "VI A", "VI B"];
  const SERIES_COLORS = {
    "1st round .xlsx|Beginning": "#476b59", "1st round .xlsx|End": "#7d5d87",
    "2nd round .xlsx|Beginning": "#3e7187", "2nd round .xlsx|End": "#a1703d",
  };
  const PAGE_SIZE = 25;
  const score = (record, field) => record?.scores?.[field] ?? null;
  const numeric = (value) => typeof value === "number" && Number.isFinite(value);
  const roundLabel = (round) => String(round || "").startsWith("1st") ? "Round 1" : "Round 2";
  const display = (value, field = "") => {
    if (value === null || value === undefined || value === "") return "Missing";
    if (numeric(value)) return field === "ORF accuracy" ? `${(value * 100).toFixed(1)}%` : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
    return String(value);
  };
  const identityKey = (record) => `${record.class || ""}\u0000${record.id ?? ""}\u0000${record.id == null ? String(record.name || "").trim().toLocaleLowerCase() : ""}`;
  const recordKey = (record) => String(allRecords.indexOf(record));
  let allRecords = [];
  let selectedIdentity = "";
  let tablePage = 0;
  let comparePage = 0;

  function filteredRecords() {
    return allRecords.filter((record) => (!filters.round.value || record.round === filters.round.value)
      && (!filters.grade.value || record.grade === filters.grade.value)
      && (!filters.className.value || record.class === filters.className.value)
      && (!filters.stage.value || record.stage === filters.stage.value));
  }

  function refreshClassOptions() {
    const previous = filters.className.value;
    const candidates = allRecords.filter((record) => (!filters.round.value || record.round === filters.round.value)
      && (!filters.grade.value || record.grade === filters.grade.value)
      && (!filters.stage.value || record.stage === filters.stage.value));
    const classes = [...new Set(candidates.map((record) => record.class).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    filters.className.replaceChildren(new Option("All classes", ""));
    classes.forEach((className) => filters.className.add(new Option(className, className)));
    filters.className.value = classes.includes(previous) ? previous : "";
  }

  function renderSummary(records) {
    const identities = new Set(records.map(identityKey));
    const grades = new Set(records.map((record) => record.grade).filter(Boolean));
    const classes = new Set(records.map((record) => record.class).filter(Boolean));
    $("dibels-count-records").textContent = records.length.toLocaleString();
    $("dibels-count-students").textContent = identities.size.toLocaleString();
    $("dibels-count-grades").textContent = grades.size.toLocaleString();
    $("dibels-count-classes").textContent = classes.size.toLocaleString();
    const selection = [filters.round.value ? roundLabel(filters.round.value) : "All rounds", filters.grade.value ? `Grade ${filters.grade.value}` : "All grades", filters.className.value || "All classes", filters.stage.value || "Beginning and End"].join(" · ");
    $("dibels-filter-summary").textContent = `${selection} · ${records.length} assessment records`;
  }

  function histogramRange(values, { percent, composite }) {
    if (percent) return { min: 0, max: 100 };
    const rawMin = Math.min(...values), rawMax = Math.max(...values);
    if (composite) {
      if (rawMin === rawMax) {
        const padding = Math.max(Math.abs(rawMin) * 0.02, 1);
        return { min: rawMin - padding, max: rawMax + padding };
      }
      return { min: rawMin, max: rawMax };
    }
    return { min: 0, max: charts.niceMax(rawMax, 5) };
  }

  function renderHistogram(hostId, records, { field, title, unit, percent = false, composite = false }) {
    const host = $(hostId); host.replaceChildren();
    const values = records.map((record) => ({ record, value: score(record, field) }))
      .filter((entry) => numeric(entry.value))
      .map((entry) => ({ ...entry, plottedValue: percent ? entry.value * 100 : entry.value }));
    const classes = CLASS_ORDER.filter((className) => records.some((record) => record.class === className));
    if (!classes.length || !values.length) {
      const note = document.createElement("p"); note.className = "dibels-empty-chart";
      note.textContent = records.length ? "No numeric scores are available for this measure in the current selection. Missing values are excluded." : "No assessment records match the current filters.";
      host.append(note); return;
    }
    const contexts = [...new Set(values.map(({ record }) => `${record.round}|${record.stage}`))].sort((a, b) => {
      const [ar, as] = a.split("|"), [br, bs] = b.split("|");
      return ar.localeCompare(br) || as.localeCompare(bs);
    });
    const legend = document.createElement("div"); legend.className = "dibels-chart-legend"; legend.setAttribute("aria-label", "Assessment context legend");
    contexts.forEach((context) => {
      const [round, stage] = context.split("|");
      const item = document.createElement("span"); item.className = "dibels-legend-item";
      const swatch = document.createElement("i"); swatch.style.backgroundColor = SERIES_COLORS[context] || "#526a72"; swatch.setAttribute("aria-hidden", "true");
      const label = document.createElement("span"); label.textContent = `${roundLabel(round)} · ${stage}`;
      item.append(swatch, label); legend.append(item);
    });
    host.append(legend);

    const { min, max } = histogramRange(values.map((entry) => entry.plottedValue), { percent, composite });
    const mobile = window.innerWidth <= 700;
    const binCount = mobile ? 4 : 6;
    const columns = mobile || classes.length === 1 ? 1 : 2;
    const width = mobile ? 680 : 1200;
    const outer = 18, columnGap = 28, facetWidth = (width - outer * 2 - columnGap * (columns - 1)) / columns;
    const facetHeight = composite ? (mobile ? 286 : 310) : (mobile ? 248 : 264);
    const rowCount = Math.ceil(classes.length / columns), topPad = 8, rowGap = 16;
    const height = topPad + rowCount * facetHeight + (rowCount - 1) * rowGap + 12;
    const bins = Array.from({ length: binCount }, (_, index) => ({
      min: min + (max - min) * index / binCount,
      max: min + (max - min) * (index + 1) / binCount,
      counts: new Map(),
    }));
    const countByClass = new Map(classes.map((className) => [className, bins.map(() => new Map(contexts.map((context) => [context, 0])))]));
    values.forEach(({ record, plottedValue }) => {
      const classBins = countByClass.get(record.class); if (!classBins) return;
      const binIndex = Math.min(binCount - 1, Math.max(0, Math.floor(((plottedValue - min) / (max - min || 1)) * binCount)));
      const context = `${record.round}|${record.stage}`;
      classBins[binIndex].set(context, (classBins[binIndex].get(context) || 0) + 1);
    });
    const maxFrequency = Math.max(1, ...[...countByClass.values()].flatMap((classBins) => classBins.flatMap((bin) => [...bin.values()])));
    const yMax = charts.niceMax(maxFrequency, 4), yTicks = charts.niceTicks(yMax, 4);
    const formatScore = (value) => percent ? `${Number(value.toFixed(0))}%` : Number(value.toFixed(composite ? 1 : 0)).toLocaleString(undefined, { maximumFractionDigits: composite ? 1 : 0 });
    const svg = charts.makeSvg(host, width, height, "dibels-histogram-svg", `${title}: grouped bar distribution by class. Horizontal axis: recorded score ranges in ${unit}. Vertical axis: number of students. ${values.length} numeric results plotted.`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.height = "auto";

    classes.forEach((className, classIndex) => {
      const col = classIndex % columns, row = Math.floor(classIndex / columns);
      const x0 = outer + col * (facetWidth + columnGap), y0 = topPad + row * (facetHeight + rowGap);
      const plotLeft = x0 + 48, plotRight = x0 + facetWidth - 12, plotTop = y0 + 40, plotBottom = y0 + facetHeight - 54;
      const plotWidth = plotRight - plotLeft, plotHeight = plotBottom - plotTop;
      const classBins = countByClass.get(className);
      charts.text(svg, className, x0 + 3, y0 + 22, "dibels-facet-title", "start");
      charts.text(svg, "Students", x0 + 3, y0 + 39, "dibels-facet-unit", "start");
      const y = (count) => plotBottom - (count / yMax) * plotHeight;
      yTicks.forEach((tick) => {
        const tickY = y(tick);
        charts.line(svg, plotLeft, tickY, plotRight, tickY, tick === 0 ? "dibels-zero-line" : "dibels-grid-line");
        charts.text(svg, tick, plotLeft - 7, tickY + 4, "dibels-facet-tick", "end");
      });
      const binWidth = plotWidth / binCount;
      const barGap = contexts.length > 2 ? 2 : 4;
      const barWidth = Math.min(32, Math.max(8, (binWidth - 10 - barGap * (contexts.length - 1)) / contexts.length));
      classBins.forEach((binCounts, binIndex) => {
        const bin = bins[binIndex];
        const center = plotLeft + binWidth * (binIndex + 0.5);
        const groupWidth = contexts.length * barWidth + Math.max(0, contexts.length - 1) * barGap;
        contexts.forEach((context, contextIndex) => {
          const count = binCounts.get(context) || 0;
          if (!count) return;
          const x = center - groupWidth / 2 + contextIndex * (barWidth + barGap);
          const valueY = y(count);
          const rangeLabel = `${formatScore(bin.min)}–${formatScore(bin.max)}${percent ? "" : ` ${unit}`}`;
          charts.verticalBar(svg, {
            x, baseline: plotBottom, valueY, width: barWidth,
            className: "dibels-histogram-bar", fill: SERIES_COLORS[context] || "#526a72",
            tooltip: `${className} · ${roundLabel(context.split("|")[0])} · ${context.split("|")[1]} · ${rangeLabel} · ${count} ${count === 1 ? "student" : "students"}`,
          });
          charts.text(svg, count, x + barWidth / 2, Math.max(plotTop + 10, valueY - 4), "dibels-bar-count");
        });
        const rangeLabel = `${formatScore(bin.min)}–${formatScore(bin.max)}`;
        const label = charts.text(svg, rangeLabel, center, plotBottom + 17, "dibels-bin-label");
        charts.categoryTitle(label, `${formatScore(bin.min)} to ${formatScore(bin.max)} ${unit}`);
      });
      charts.text(svg, `Recorded score range · ${unit}`, (plotLeft + plotRight) / 2, y0 + facetHeight - 9, "dibels-facet-axis-title");
      charts.line(svg, plotLeft, plotBottom, plotRight, plotBottom, "dibels-zero-line");
    });

    const missing = records.length - values.length;
    const foot = document.createElement("p"); foot.className = "dibels-chart-footnote";
    foot.textContent = `${values.length} numeric ${values.length === 1 ? "result" : "results"} grouped into score ranges · ${missing} missing or unavailable. Ranges describe the observed distribution; they are not performance bands.`;
    if (composite) foot.textContent += " Composite score scale and interpretation remain unverified.";
    host.append(foot);
  }

  function matchingIdentities(records) {
    const map = new Map();
    records.forEach((record) => { const key = identityKey(record); if (!map.has(key)) map.set(key, record); });
    return [...map].sort((a, b) => String(a[1].name || "").localeCompare(String(b[1].name || "")) || String(a[1].class).localeCompare(String(b[1].class)) || Number(a[1].id) - Number(b[1].id));
  }

  function renderStudentCard(records) {
    const input = $("dibels-student-search"), suggestions = $("dibels-student-suggestions"), controls = $("dibels-student-record-controls"), recordSelect = $("dibels-student-record"), card = $("dibels-student-card");
    const identities = matchingIdentities(records);
    if (selectedIdentity && !identities.some(([key]) => key === selectedIdentity)) selectedIdentity = "";
    suggestions.replaceChildren();
    const query = input.value.trim().toLocaleLowerCase();
    const results = selectedIdentity || query.length < 2 ? [] : identities.filter(([, record]) => `${record.name || ""} ${record.class || ""} ${record.id ?? ""}`.toLocaleLowerCase().includes(query)).slice(0, 12);
    results.forEach(([key, record]) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "dibels-student-suggestion"; button.setAttribute("role", "option");
      button.textContent = `${record.name || "Unnamed"} · ${record.class || "Unknown class"} · ID ${record.id ?? "—"}`;
      button.setAttribute("aria-selected", String(key === selectedIdentity));
      button.addEventListener("click", () => {
        selectedIdentity = key;
        input.value = `${record.name || "Unnamed"} · ${record.class || "Unknown class"} · ID ${record.id ?? "—"}`;
        renderStudentCard(records);
      });
      suggestions.append(button);
    });
    if (!selectedIdentity && query.length >= 2 && !results.length) {
      const noMatch = document.createElement("p"); noMatch.className = "dibels-search-note"; noMatch.textContent = "No matching students in the current filters."; suggestions.append(noMatch);
    }
    if (!selectedIdentity) {
      controls.hidden = true; recordSelect.replaceChildren(); card.replaceChildren();
      const note = document.createElement("p"); note.textContent = "Search for a student to view their available assessment results."; card.append(note); return;
    }
    const studentRecords = records.filter((record) => identityKey(record) === selectedIdentity);
    if (!studentRecords.length) return;
    controls.hidden = false;
    const previous = recordSelect.value;
    recordSelect.replaceChildren();
    studentRecords.forEach((record) => recordSelect.add(new Option(`${roundLabel(record.round)} · ${record.stage}`, recordKey(record))));
    recordSelect.value = studentRecords.some((record) => recordKey(record) === previous) ? previous : recordKey(studentRecords[0]);
    const record = allRecords[Number(recordSelect.value)];
    card.replaceChildren();
    const heading = document.createElement("div"); heading.className = "dibels-selected-identity";
    const name = document.createElement("h3"); name.textContent = record.name || "Unnamed";
    const context = document.createElement("p"); context.textContent = `${record.class || "Unknown class"} · Grade ${record.grade || "Unknown"} · ID ${record.id ?? "—"} · ${roundLabel(record.round)} · ${record.stage}`;
    heading.append(name, context); card.append(heading);
    const measures = [
      ["Reading accuracy (ORF)", display(score(record, "ORF accuracy"), "ORF accuracy")],
      ["Correct words read", display(score(record, "Total correct words (ORF)") )],
      ["MAZE adjusted score", display(score(record, "Maze Adjusted Score"))],
      ["Beginning Composite score", display(score(record, "Beginning Composite score"))],
    ];
    const grid = document.createElement("dl"); grid.className = "dibels-student-measures";
    measures.forEach(([label, value]) => { const wrapper = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = label; dd.textContent = value; wrapper.append(dt, dd); grid.append(wrapper); });
    card.append(grid);
    const note = document.createElement("p"); note.className = "dibels-student-score-note"; note.textContent = "Composite score meaning and scale are unverified."; card.append(note);
  }

  function renderResults(records) {
    const query = $("dibels-table-search").value.trim().toLocaleLowerCase();
    const rows = records.filter((record) => !query || `${record.name || ""} ${record.class || ""} ${record.id ?? ""} ${record.round || ""} ${record.stage || ""}`.toLocaleLowerCase().includes(query));
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    tablePage = Math.min(tablePage, pages - 1);
    const start = tablePage * PAGE_SIZE;
    const body = $("dibels-results-body"); body.replaceChildren();
    rows.slice(start, start + PAGE_SIZE).forEach((record) => {
      const row = document.createElement("tr");
      const id = document.createElement("td"); id.textContent = `${record.name || "Unnamed"} · ID ${record.id ?? "—"}`; row.append(id);
      const values = [record.class || "Unknown class", roundLabel(record.round), record.stage || "Unknown", display(score(record, "Total correct words (ORF)")), display(score(record, "ORF accuracy"), "ORF accuracy"), display(score(record, "Maze Adjusted Score")), display(score(record, "Beginning Composite score")), record.qualityFlags?.length ? "Review" : "—"];
      values.forEach((value) => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); }); body.append(row);
    });
    if (!rows.length) { const row = document.createElement("tr"), cell = document.createElement("td"); cell.colSpan = 9; cell.textContent = "No results match the current filters and search."; row.append(cell); body.append(row); }
    $("dibels-table-count").textContent = `${rows.length} matching assessment records · showing ${rows.length ? start + 1 : 0}–${Math.min(start + PAGE_SIZE, rows.length)}`;
    $("dibels-page-label").textContent = `Page ${tablePage + 1} of ${pages}`;
    $("dibels-page-prev").disabled = tablePage === 0;
    $("dibels-page-next").disabled = tablePage >= pages - 1;
  }

  function renderQuality(records) {
    const body = $("dibels-quality-body"); body.replaceChildren();
    const flags = records.flatMap((record) => (record.qualityFlags || []).map((flag) => ({ flag, record })));
    const labels = { suspicious_value: "Unusual score", missing_formula: "Score unavailable", duplicate_name: "Name appears more than once", missing_value: "Score unavailable", inconsistent_identifier: "Student details differ between results", formula_error: "Score unavailable" };
    const fieldLabels = { "Total correct words (ORF)": "Correct words", "Total Incorrect Word (ORF)": "Reading errors", "ORF accuracy": "Reading accuracy", "MAZE Correct Point": "MAZE correct", "MAZE Incorrect Point": "MAZE incorrect", "Maze Adjusted Score": "MAZE adjusted", "Beginning Composite score": "Beginning Composite" };
    const counts = new Map(); flags.forEach(({ flag }) => { const label = labels[flag.type] || "Review needed"; counts.set(label, (counts.get(label) || 0) + 1); });
    const countHost = $("dibels-quality-counts"); countHost.replaceChildren();
    if (!counts.size) { const item = document.createElement("span"); item.className = "dibels-quality-count"; item.textContent = "No review notes"; countHost.append(item); }
    counts.forEach((count, label) => { const item = document.createElement("span"); item.className = "dibels-quality-count"; item.textContent = `${label} · ${count}`; countHost.append(item); });
    flags.slice(0, 250).forEach(({ flag, record }) => {
      const row = document.createElement("tr");
      [labels[flag.type] || "Review needed", `${record.name || "Unnamed"} · ${record.class || "Unknown class"} · ID ${record.id ?? "—"}`, fieldLabels[flag.field] || "Reading score", "Check this recorded result."].forEach((value) => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); });
      body.append(row);
    });
    if (!flags.length) { const row = document.createElement("tr"), cell = document.createElement("td"); cell.colSpan = 4; cell.textContent = "No scores need review."; row.append(cell); body.append(row); }
  }

  function renderComparisons() {
    const body = $("dibels-comparison-body"); if (!body) return;
    body.replaceChildren();
    const mode = $("dibels-compare-mode").value;
    const grade = filters.grade.value, className = filters.className.value;
    const base = allRecords.filter((record) => (!grade || record.grade === grade) && (!className || record.class === className));
    let left = [], right = [], note = "";
    if (mode === "within") {
      if (filters.stage.value) note = "Choose Both stages to compare Beginning and End records.";
      else {
        const round = filters.round.value || "1st round .xlsx";
        left = base.filter((record) => record.round === round && record.stage === "Beginning");
        right = base.filter((record) => record.round === round && record.stage === "End");
        note = `${roundLabel(round)} · Beginning compared with End. Timing and score comparability are unconfirmed.`;
      }
    } else if (filters.round.value) note = "Choose All rounds to compare records across rounds.";
    else {
      const stages = filters.stage.value ? [filters.stage.value] : ["Beginning", "End"];
      left = base.filter((record) => record.round === "1st round .xlsx" && stages.includes(record.stage));
      right = base.filter((record) => record.round === "2nd round .xlsx" && stages.includes(record.stage));
      note = `Round 1 and Round 2 · same stage${stages.length > 1 ? " shown separately" : ` · ${stages[0]}`}. Differences do not imply improvement.`;
    }
    $("dibels-comparison-note").textContent = note;
    const keyFor = (record) => `${record.class}\u0000${record.id}\u0000${mode === "rounds" ? record.stage : ""}`;
    const leftMap = new Map(left.filter((record) => record.class && record.id != null).map((record) => [keyFor(record), record]));
    const rightMap = new Map(right.filter((record) => record.class && record.id != null).map((record) => [keyFor(record), record]));
    const pairs = [...new Set([...leftMap.keys(), ...rightMap.keys()])].map((key) => [leftMap.get(key), rightMap.get(key)]);
    const sorted = pairs.sort((a, b) => String((a[0] || a[1])?.class).localeCompare(String((b[0] || b[1])?.class)) || Number((a[0] || a[1])?.id) - Number((b[0] || b[1])?.id));
    const comparePages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    comparePage = Math.min(comparePage, comparePages - 1);
    sorted.slice(comparePage * PAGE_SIZE, (comparePage + 1) * PAGE_SIZE).forEach(([first, second]) => {
      const record = first || second, matched = first && second && String(first.name || "").trim().toLocaleLowerCase() === String(second.name || "").trim().toLocaleLowerCase();
      const row = document.createElement("tr");
      const accuracyDiff = matched && numeric(score(first, "ORF accuracy")) && numeric(score(second, "ORF accuracy")) ? `${((score(second, "ORF accuracy") - score(first, "ORF accuracy")) * 100).toFixed(1)} percentage points` : "Missing";
      const cells = [record.class, `${record.name || "Unnamed"} · ID ${record.id ?? "—"}`, !first || !second ? "No matching result" : matched ? "Matched" : "Name mismatch", matched ? `${display(score(first, "ORF accuracy"), "ORF accuracy")} / ${display(score(second, "ORF accuracy"), "ORF accuracy")}` : "Withheld", accuracyDiff, matched ? `${display(score(first, "Total correct words (ORF)"))} / ${display(score(second, "Total correct words (ORF)"))}` : "Withheld", matched ? `${display(score(first, "Maze Adjusted Score"))} / ${display(score(second, "Maze Adjusted Score"))}` : "Withheld"];
      cells.forEach((value) => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); }); body.append(row);
    });
    if (!sorted.length) { const row = document.createElement("tr"), cell = document.createElement("td"); cell.colSpan = 7; cell.textContent = note || "No matched results."; row.append(cell); body.append(row); }
    $("dibels-compare-page-label").textContent = `Page ${comparePage + 1} of ${comparePages}`;
    $("dibels-compare-page-prev").disabled = comparePage === 0;
    $("dibels-compare-page-next").disabled = comparePage >= comparePages - 1;
  }

  function render() {
    const records = filteredRecords();
    renderSummary(records);
    renderHistogram("dibels-chart-composite", records, { field: "Beginning Composite score", title: "Beginning Composite score", unit: "recorded score", composite: true });
    renderHistogram("dibels-chart-accuracy", records, { field: "ORF accuracy", title: "Reading accuracy (ORF)", unit: "percent", percent: true });
    renderHistogram("dibels-chart-words", records, { field: "Total correct words (ORF)", title: "Correct words read", unit: "words" });
    renderHistogram("dibels-chart-maze", records, { field: "Maze Adjusted Score", title: "MAZE adjusted score", unit: "score points" });
    renderStudentCard(records); renderResults(records); renderQuality(records); renderComparisons();
  }

  function populateFilters() {
    const rounds = [...new Set(allRecords.map((record) => record.round))].sort();
    rounds.forEach((round, index) => filters.round.add(new Option(`Round ${index + 1}`, round)));
    [...new Set(allRecords.map((record) => record.grade).filter(Boolean))].sort((a, b) => Number(a) - Number(b)).forEach((grade) => filters.grade.add(new Option(`Grade ${grade}`, grade)));
    refreshClassOptions();
  }

  [filters.round, filters.grade, filters.stage].forEach((filter) => filter.addEventListener("change", () => { refreshClassOptions(); tablePage = 0; render(); }));
  filters.className.addEventListener("change", () => { tablePage = 0; render(); });
  $("dibels-student-search").addEventListener("input", () => { selectedIdentity = ""; renderStudentCard(filteredRecords()); });
  $("dibels-student-record").addEventListener("change", () => renderStudentCard(filteredRecords()));
  $("dibels-table-search").addEventListener("input", () => { tablePage = 0; renderResults(filteredRecords()); });
  $("dibels-page-prev").addEventListener("click", () => { tablePage = Math.max(0, tablePage - 1); renderResults(filteredRecords()); });
  $("dibels-page-next").addEventListener("click", () => { tablePage += 1; renderResults(filteredRecords()); });
  $("dibels-compare-mode").addEventListener("change", renderComparisons);
  $("dibels-compare-page-prev").addEventListener("click", () => { comparePage = Math.max(0, comparePage - 1); renderComparisons(); });
  $("dibels-compare-page-next").addEventListener("click", () => { comparePage += 1; renderComparisons(); });

  fetch(DATA_URL).then((response) => {
    if (!response.ok) throw new Error(`Could not load reading results (${response.status})`);
    return response.json();
  }).then((data) => {
    if (data?.schemaVersion !== 1 || !Array.isArray(data.records)) throw new Error("Reading results could not be displayed.");
    allRecords = data.records;
    populateFilters(); render();
    $("dibels-load-status").textContent = `${allRecords.length} assessment records ready`;
  }).catch((error) => {
    console.error("DIBELS dashboard failed to initialize:", error);
    $("dibels-load-status").textContent = "Reading results are temporarily unavailable.";
  });
})();
