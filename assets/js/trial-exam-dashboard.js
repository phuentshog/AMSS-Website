(() => {
  const root = document.querySelector("#academic-trial-panel");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const labels = { VI: "Class VI", VIII: "Class VIII", X: "Class X" };
  const classFilter = $("trial-class-filter");
  const subjectFilter = $("trial-subject-filter");
  const groupFilter = $("trial-teacher-filter");
  const body = $("trial-results-body");
  const charts = window.AMSSCharts;
  const format = (value) => Number.isFinite(value) ? value.toFixed(1) : "—";
  let rows = [];
  let groupFilterMode = "release";

  const selectedRows = () => rows.filter((row) =>
    (!classFilter.value || row.class === classFilter.value)
    && (!subjectFilter.value || row.subject === subjectFilter.value)
    && (!groupFilter.value || (groupFilterMode === "department"
      ? row.department === groupFilter.value
      : groupFilter.value === "Released" ? !row.suppressed : row.suppressed))
  );

  const draw = (host, selected, showDifference = false) => {
    if (!host) return;
    host.replaceChildren();
    const released = selected.filter((row) => !row.suppressed
      && Number.isFinite(row.meanPercent) && Number.isFinite(row.targetPercent));
    if (!released.length || !charts) {
      host.textContent = "No released aggregate results match these filters.";
      return;
    }
    const classes = classFilter.value ? [classFilter.value] : ["VI", "VIII", "X"];
    classes.forEach((grade) => {
      const data = released.filter((row) => row.class === grade);
      if (!data.length) return;
      const width = Math.max(760, host.clientWidth || 0, data.length * 110 + 120);
      const height = 470;
      const left = 76;
      const right = width - 24;
      const top = 45;
      const bottom = height - 100;
      const limit = showDifference
        ? charts.niceMax(Math.max(1, ...data.map((row) => Math.abs(row.difference || 0))), 2)
        : 100;
      const svg = charts.makeSvg(host, width, height, "academic-svg-chart", `${labels[grade] || grade} aggregate trial exam results`);
      const y = charts.drawYAxis(svg, {
        left, right, top, height: bottom - top,
        min: showDifference ? -limit : 0, max: limit,
        ticks: showDifference ? [-limit, 0, limit] : [0, 25, 50, 75, 100],
        format, gridClass: "academic-svg-grid", zeroClass: "academic-svg-baseline",
      });
      charts.text(svg, showDifference ? "Difference from target" : "Average and target marks", left, 24, "academic-svg-axis-title", "start");
      data.forEach((row, index) => {
        const x = charts.scaleX(index, data.length, left, right - left);
        const value = showDifference ? row.difference : row.meanPercent;
        const baseline = y(0);
        const endpoint = y(value);
        charts.rect(svg, x - 18, Math.min(baseline, endpoint), 36, Math.max(1, Math.abs(baseline - endpoint)),
          "academic-svg-midterm", showDifference ? (value < 0 ? "#984638" : "#27623b") : "#455d4b",
          `${row.subject}: ${format(value)}; cohort ${row.cohortSizeBand}`);
        if (!showDifference) {
          const targetY = y(row.targetPercent);
          charts.line(svg, x - 21, targetY, x + 21, targetY, "academic-svg-target");
        }
        charts.text(svg, format(value), x, endpoint + (value >= 0 ? -8 : 18), "academic-svg-data-label");
        charts.text(svg, row.subject, x, bottom + 24, "academic-svg-category");
      });
      charts.line(svg, left, bottom, right, bottom, "academic-svg-baseline");
    });
  };

  const render = () => {
    const previousSubject = subjectFilter.value;
    const previousGroup = groupFilter.value;
    const departments = [...new Set(rows.map((row) => row.department).filter((value) => typeof value === "string" && value.trim()))]
      .sort((a, b) => a.localeCompare(b));
    groupFilterMode = departments.length ? "department" : "release";
    const groupLabel = groupFilter.closest("label");
    if (groupLabel?.firstChild?.nodeType === Node.TEXT_NODE) {
      groupLabel.firstChild.textContent = groupFilterMode === "department" ? "Department" : "Release status";
    }

    subjectFilter.replaceChildren(new Option("All subjects", ""), ...[...new Set(rows.map((row) => row.subject).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)).map((value) => new Option(value, value)));
    if ([...subjectFilter.options].some((option) => option.value === previousSubject)) subjectFilter.value = previousSubject;

    const groupOptions = groupFilterMode === "department"
      ? departments.map((value) => new Option(value, value))
      : [new Option("Released", "Released"), new Option("Suppressed", "Suppressed")];
    groupFilter.replaceChildren(new Option(groupFilterMode === "department" ? "All departments" : "All release states", ""), ...groupOptions);
    if ([...groupFilter.options].some((option) => option.value === previousGroup)) groupFilter.value = previousGroup;

    const selected = selectedRows();
    const released = selected.filter((row) => !row.suppressed);
    const mean = (key) => {
      const values = released.map((row) => row[key]).filter(Number.isFinite);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    };
    $("trial-kpi-subjects").textContent = String(released.length);
    $("trial-kpi-subjects-note").textContent = "released class/subject aggregates";
    $("trial-kpi-mean").textContent = format(mean("meanPercent"));
    $("trial-kpi-target").textContent = format(mean("targetPercent"));
    const met = released.filter((row) => Number.isFinite(row.meanPercent) && Number.isFinite(row.targetPercent) && row.meanPercent >= row.targetPercent).length;
    $("trial-kpi-target-met").textContent = released.length ? `${Math.round(met / released.length * 100)}%` : "—";
    $("trial-kpi-target-met-note").textContent = "of released aggregates at or above target";
    const suppressedCount = selected.length - released.length;
    $("trial-filter-status").textContent = `${released.length} released aggregates${suppressedCount ? `; ${suppressedCount} suppressed groups withhold results` : ""}`;
    draw($("trial-means-chart"), selected);
    draw($("trial-difference-chart"), selected, true);
    body.replaceChildren();
    selected.forEach((row) => {
      const values = [
        labels[row.class] || row.class,
        row.subject,
        row.cohortSizeBand || "—",
        row.suppressed ? "Suppressed" : format(row.meanPercent),
        row.suppressed ? "—" : format(row.targetPercent),
        row.suppressed ? "—" : format(row.difference),
        row.suppressed ? "Suppressed" : `${format(row.passRate)}%`,
      ];
      const tr = document.createElement("tr");
      values.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = String(value ?? "—");
        tr.append(td);
      });
      body.append(tr);
    });
  };

  fetch("assets/data/public/trial-exam.json", { headers: { Accept: "application/json" } })
    .then((response) => {
      if (!response.ok) throw new Error(`Public trial exam data request failed (${response.status})`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.records)) throw new Error("Public trial exam aggregates are unavailable.");
      rows = data.records;
      const method = $("trial-method-text");
      if (method) method.textContent = `${data.method || "Approved public cohort summaries."} Only aggregate class and subject results are shown.`;
      const passResult = $("trial-pass-result");
      if (passResult) passResult.textContent = "Pass-rate values are included only for released cohorts meeting the public minimum size. Suppressed counts and individual student results are not published.";
      const note = $("trial-pass-note");
      if (note) note.textContent = "Class pass-rate summaries are shown only where the cohort meets the public minimum of 10.";
      const limitations = $("trial-limitations");
      if (limitations) {
        const notes = [...(data.limitations || [])];
        if (!rows.some((row) => row.department)) notes.push("Department classification is not present in the approved public trial dataset; release status is available as a filter instead.");
        limitations.replaceChildren();
        notes.forEach((text) => {
          const item = document.createElement("li");
          item.textContent = text;
          limitations.append(item);
        });
      }
      render();
      classFilter.addEventListener("change", render);
      subjectFilter.addEventListener("change", render);
      groupFilter.addEventListener("change", render);
    })
    .catch((error) => {
      console.error(error);
      $("trial-filter-status").textContent = "Public aggregate data could not be loaded.";
    });
})();
