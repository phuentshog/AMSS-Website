(() => {
  const root = document.querySelector("#academic-trial-panel");
  if (!root) return;
  const classLabels = { VI: "Class VI", VIII: "Class VIII", X: "Class X" };
  const classes = Object.keys(classLabels);
  const $ = (id) => document.getElementById(id);
  const classFilter = $("trial-class-filter"), subjectFilter = $("trial-subject-filter"), teacherFilter = $("trial-teacher-filter");
  const meansHost = $("trial-means-chart"), differenceHost = $("trial-difference-chart"), tableBody = $("trial-results-body");
  const format = (value) => Number.isFinite(value) ? value.toFixed(2) : "N/A";
  const charts = window.AMSSCharts;
  const abbreviation = (subject) => ({ English: "Eng", Dzongkha: "Dzo", "History and Civics": "Hist & Civics", "History & Civics": "Hist & Civics", Geography: "Geo", Mathematics: "Math", Maths: "Math", Science: "Sci", Chemistry: "Chem", Biology: "Bio" })[subject] || subject;
  let records = [], passStats = {};

  function selectedRows() {
    return records.filter((row) => (!classFilter.value || row.class === classFilter.value)
      && (!subjectFilter.value || row.subject === subjectFilter.value)
      && (!teacherFilter.value || row.teacher === teacherFilter.value));
  }
  function updateFilters() {
    const priorSubject = subjectFilter.value, priorTeacher = teacherFilter.value;
    const scope = records.filter((row) => !classFilter.value || row.class === classFilter.value);
    const subjects = [...new Set(scope.map((row) => row.subject))].sort();
    subjectFilter.replaceChildren(new Option("All relevant subjects", ""));
    subjects.forEach((subject) => subjectFilter.add(new Option(subject, subject)));
    subjectFilter.value = subjects.includes(priorSubject) ? priorSubject : "";
    const teacherScope = scope.filter((row) => !subjectFilter.value || row.subject === subjectFilter.value);
    const teachers = [...new Set(teacherScope.map((row) => row.teacher).filter(Boolean))].sort();
    teacherFilter.replaceChildren(new Option("All relevant teachers", ""));
    teachers.forEach((teacher) => teacherFilter.add(new Option(teacher, teacher)));
    teacherFilter.value = teachers.includes(priorTeacher) ? priorTeacher : "";
    subjectFilter.disabled = !subjects.length; teacherFilter.disabled = !teachers.length;
  }
  function chartRows(host, rows, difference = false) {
    host.replaceChildren();
    const valid = rows.filter((row) => Number.isFinite(row.meanPercent) && Number.isFinite(row.targetMean));
    if (!valid.length) {
      const empty = document.createElement("div"); empty.className = "academic-empty";
      empty.innerHTML = "<strong>No comparable results</strong>Subjects without both a Trial Exam mean and target are excluded from this chart.";
      host.append(empty); return;
    }
    host.classList.add("academic-chart-scroll");
    const grades = classFilter.value ? [classFilter.value] : classes;
    for (const grade of grades) {
      const group = valid.filter((row) => row.class === grade);
      if (!group.length) continue;
      const width = Math.max(760, host.clientWidth || 0, 78 + 30 + group.length * 112);
      const height = difference ? 470 : 500;
      const left = 78, right = width - 28, top = difference ? 50 : 54, bottom = height - 112, plotHeight = bottom - top;
      let domain = 100;
      if (difference) domain = charts.niceMax(Math.max(...group.map((row) => Math.abs(row.meanPercent - row.targetMean))), 2);
      const svg = charts.makeSvg(host, width, height, difference ? "academic-svg-chart academic-svg-gap" : "academic-svg-chart",
        `${classLabels[grade]} Trial Exam ${difference ? "differences from target" : "averages and targets"} on a 100 mark scale`);
      const y = charts.drawYAxis(svg, { left, right, top, height: plotHeight, min: difference ? -domain : 0, max: domain,
        ticks: difference ? [-domain, 0, domain] : [0, 25, 50, 75, 100],
        format: (value) => difference ? `${value > 0 ? "+" : ""}${Number(value.toFixed(1))}` : String(value),
        gridClass: difference ? "academic-svg-grid-light" : "academic-svg-grid", zeroClass: difference ? "academic-svg-zero" : "academic-svg-baseline" });
      charts.text(svg, difference ? "Marks from target" : "Marks out of 100", 8, 25, "academic-svg-axis-title", "start");
      charts.text(svg, classLabels[grade], (left + right) / 2, 27, "academic-svg-context");
      const slot = (right - left) / group.length, barWidth = Math.min(difference ? 44 : 48, slot * (difference ? .44 : .48));
      const baseline = y(0);
      group.forEach((row, index) => {
        const x = charts.scaleX(index, group.length, left, right - left);
        const delta = row.meanPercent - row.targetMean;
        if (!difference) {
          const meanY = y(row.meanPercent), targetY = y(row.targetMean);
          charts.rect(svg, x - barWidth / 2, meanY, barWidth, baseline - meanY, "academic-svg-midterm", "#455d4b", `${classLabels[grade]} ${row.subject} · Trial Exam average ${format(row.meanPercent)} · Target ${format(row.targetMean)}`);
          charts.line(svg, x - barWidth / 2 - 3, targetY, x + barWidth / 2 + 3, targetY, "academic-svg-target");
          charts.categoryTitle(svg.lastElementChild, `${row.subject} · Target marker`);
          let actualLabelY = meanY + 18, targetLabelY = Math.max(top + 12, targetY - 9);
          if (Math.abs(targetLabelY - actualLabelY) < 20) targetLabelY = Math.min(bottom - 4, targetY + 18);
          charts.text(svg, row.meanPercent.toFixed(1), x, actualLabelY, "academic-svg-data-label academic-svg-data-label--inside");
          charts.text(svg, row.targetMean.toFixed(1), x, targetLabelY, "academic-svg-target-label");
        } else {
          const endY = y(delta), status = delta >= 0 ? "At or above target" : "Below target";
          charts.rect(svg, x - barWidth / 2, Math.min(baseline, endY), barWidth, Math.abs(baseline - endY), "academic-svg-gap-bar", delta < 0 ? "#984638" : "#27623b", `${classLabels[grade]} ${row.subject} · ${format(delta)} marks · ${status}`);
          const valueY = delta >= 0 ? endY - 9 : endY + 18;
          charts.text(svg, `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`, x, Math.max(top + 15, Math.min(bottom - 3, valueY)), "academic-svg-data-label");
        }
        const category = charts.text(svg, abbreviation(row.subject), x, bottom + 28, "academic-svg-category");
        charts.categoryTitle(category, `${row.subject} · Trial Exam ${format(row.meanPercent)} · Target ${format(row.targetMean)} · ${delta >= 0 ? "At or above target" : "Below target"}`);
      });
      charts.line(svg, left, bottom, right, bottom, "academic-svg-baseline");
    }
    host.setAttribute("aria-label", `Trial Exam ${difference ? "differences from target" : "averages and targets"} for ${valid.length} assessable subjects`);
  }
  function render() {
    updateFilters();
    const rows = selectedRows(), comparable = rows.filter((r) => Number.isFinite(r.meanPercent) && Number.isFinite(r.targetMean));
    const mean = (key) => comparable.length ? comparable.reduce((sum, row) => sum + row[key], 0) / comparable.length : null;
    const achieved = comparable.filter((row) => row.meanPercent >= row.targetMean).length;
    $("trial-kpi-subjects").textContent = String(comparable.length);
    $("trial-kpi-subjects-note").textContent = `${comparable.length} with target and Trial Exam results`;
    $("trial-kpi-mean").textContent = mean("meanPercent") === null ? "—" : format(mean("meanPercent"));
    $("trial-kpi-target").textContent = mean("targetMean") === null ? "—" : format(mean("targetMean"));
    $("trial-kpi-target-met").textContent = comparable.length ? `${Math.round(achieved / comparable.length * 100)}%` : "—";
    $("trial-kpi-target-met-note").textContent = comparable.length ? `${achieved} of ${comparable.length} subjects at or above target` : "No assessable results";
    $("trial-filter-status").textContent = `${rows.length} matching subject ${rows.length === 1 ? "result" : "results"}.`;
    const scope = classFilter.value ? [classFilter.value] : classes;
    const official = scope.map((grade) => passStats[grade]).filter((item) => item && Number.isFinite(item.passRate));
    const passed = official.reduce((sum, item) => sum + item.passed, 0), failed = official.reduce((sum, item) => sum + item.failed, 0), total = passed + failed;
    $("trial-pass-note").textContent = total
      ? `${((passed / total) * 100).toFixed(1)}% official pass rate · ${passed} passed · ${failed} failed · ${total} class results. Source worksheet Result values; VI is excluded because it has no Result column.`
      : "Official pass/fail unavailable for this selection: the VI worksheet has no Result field or documented pass threshold.";
    $("trial-means-caption").textContent = `${classFilter.value ? classLabels[classFilter.value] : "All classes"} · marks out of 100.`;
    chartRows(meansHost, rows); chartRows(differenceHost, rows, true);
    const sorted = [...rows].sort((a, b) => classes.indexOf(a.class) - classes.indexOf(b.class) || a.subject.localeCompare(b.subject));
    tableBody.replaceChildren();
    $("trial-table-caption").textContent = `${classFilter.value ? classLabels[classFilter.value] : "All classes"} · ${rows.length} subject rows`;
    if (!sorted.length) { const tr = document.createElement("tr"), td = document.createElement("td"); td.colSpan = 9; td.textContent = "No matching results. Change or clear the filters."; tr.append(td); tableBody.append(tr); }
    sorted.forEach((row) => {
      const comparableRow = Number.isFinite(row.meanPercent) && Number.isFinite(row.targetMean), delta = comparableRow ? row.meanPercent - row.targetMean : null;
      const values = [classLabels[row.class], row.subject, row.teacher || "Unable to verify", row.assessed ? `${row.assessed} / ${row.roster}` : "N/A", format(row.meanOutOf60), format(row.meanPercent), format(row.targetMean), delta === null ? "N/A" : `${delta > 0 ? "+" : ""}${format(delta)}`, comparableRow ? (delta >= 0 ? "Achieved" : "Below Target") : "Unable to Assess"];
      const tr = document.createElement("tr");
      values.forEach((value, index) => { const td = document.createElement("td"); td.textContent = value; if (index === 8) td.className = `academic-status academic-status--${value.toLocaleLowerCase().replaceAll(" ", "-")}`; tr.append(td); });
      tableBody.append(tr);
    });
  }
  fetch("assets/data/trial-exam-2026.json").then((response) => response.ok ? response.json() : Promise.reject(new Error("Trial Exam data unavailable"))).then((data) => {
    if (!Array.isArray(data.records) || !data.passStats) throw new Error("Trial Exam data is incomplete");
    records = data.records; passStats = data.passStats;
    $("trial-method-text").textContent = `${data.method} Target achievement uses the same rule as Midterm: a mean at or above the target is achieved. Means and targets are displayed on a 100-mark scale.`;
    const notes = $("trial-limitations"); notes.replaceChildren();
    data.limitations.forEach((limitation) => { const li = document.createElement("li"); li.textContent = limitation; notes.append(li); });
    classFilter.addEventListener("change", render); subjectFilter.addEventListener("change", render); teacherFilter.addEventListener("change", render);
    if ("ResizeObserver" in window) {
      let redrawFrame = 0;
      const observer = new ResizeObserver((entries) => {
        if (!entries.some(({ contentRect }) => contentRect.width > 0)) return;
        cancelAnimationFrame(redrawFrame);
        redrawFrame = requestAnimationFrame(render);
      });
      observer.observe(meansHost); observer.observe(differenceHost);
    }
    render();
  }).catch(() => {
    meansHost.innerHTML = '<div class="academic-empty"><strong>Trial Exam results are unavailable.</strong>The Trial Exam data could not be loaded.</div>';
    differenceHost.innerHTML = '<div class="academic-empty"><strong>Trial Exam results are unavailable.</strong>The Trial Exam data could not be loaded.</div>';
    tableBody.innerHTML = '<tr><td colspan="9">Trial Exam data could not be loaded.</td></tr>';
  });
})();
