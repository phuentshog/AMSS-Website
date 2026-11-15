(() => {
  const root = document.querySelector("#annual-exam-content");
  if (!root) return;
  const fmt = value => value == null || value === "" ? "—" : String(value);
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const cell = value => `<td>${escape(fmt(value))}</td>`;
  const rowList = rows => rows.map(row => `<tr>${row.map(cell).join("")}</tr>`).join("");
  const table = (headers, rows, label) => `<div class="annual-table-wrap"><table aria-label="${escape(label)}"><thead><tr>${headers.map(h => `<th scope="col">${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const card = (title, content) => `<section class="annual-card"><h3>${escape(title)}</h3>${content}</section>`;
  fetch("assets/data/annual-exam-2026.json")
    .then(response => { if (!response.ok) throw new Error(`Data request failed (${response.status})`); return response.json(); })
    .then(data => {
      const timeline = data.timeline.events;
      root.querySelector("[data-annual-timeline]").innerHTML = `<ol class="annual-timeline-list" aria-label="Annual examination timeline">${timeline.map(x => `<li class="annual-timeline-item"><time>${escape(x.date)}</time><div><h3>${escape(x.event)}</h3><p>Duration: ${escape(x.duration)}</p></div></li>`).join("")}</ol>`;
      root.querySelector("[data-annual-timeline-note]").innerHTML = [...data.timeline.notes.map(n => `<p>${escape(n)}</p>`), `<p class="annual-source-note">${escape(data.timeline.asteriskNote)}</p>`].join("");

      const timetable = data.timetable;
      const timetableRows = timetable.rows.map(r => [r.date, r.day, r.classIV, r.classV, r.classVII, r.classIX.paperI, r.classIX.paperII]);
      root.querySelector("[data-annual-timetable]").innerHTML = table(["Date", "Day", "Class IV", "Class V", "Class VII", "Class IX · Paper I", "Class IX · Paper II"], rowList(timetableRows), "Annual examination timetable") +
        `<p class="annual-source-note">${escape(timetable.timingNote)} ${escape(timetable.breaks.join(", "))} is marked as a weekend break in the timetable.</p>` +
        card("Class IX paper times", table(["Date", "Day", "Session", "Paper", "Subject", "Start", "End"], rowList(timetable.classIXPaperTimes.map(r => [r.date, r.day, r.exam, r.paper, r.subject, r.start, r.end])), "Class IX paper timings")) +
        `<div class="annual-timing-variants">${timetable.dayTimingVariants.map(v => card(v.name, table(["Time", "Activity"], rowList(v.events.map(e => [e.time, e.activity])), `${v.name} schedule`))).join("")}</div>`;

      const examInfo = data.invigilation;
      const duties = examInfo.duties;
      const staff = examInfo.staffTotals;
      const filters = root.querySelector("[data-duty-filters]");
      const dateOptions = [...new Set(duties.map(d => d.date))];
      const staffOptions = [...new Set(duties.map(d => d.teacher))].sort((a,b) => a.localeCompare(b));
      const roomOptions = [...new Set(duties.map(d => d.room))].sort((a,b) => a.localeCompare(b));
      filters.innerHTML = `<label>Date<select data-duty-date><option value="">All dates</option>${dateOptions.map(d => `<option>${escape(d)}</option>`).join("")}</select></label><label>Session<select data-duty-session><option value="">Both sessions</option><option>Exam 1</option><option>Exam 2</option></select></label><label>Room<select data-duty-room><option value="">All rooms</option>${roomOptions.map(r => `<option>${escape(r)}</option>`).join("")}</select></label><label>Invigilator<select data-duty-staff><option value="">All staff</option>${staffOptions.map(n => `<option>${escape(n)}</option>`).join("")}</select></label><label>Search duties<input type="search" data-duty-search placeholder="Room, subject, class…" autocomplete="off"></label>`;
      const dutyBody = root.querySelector("[data-duty-rows]");
      const summary = root.querySelector("[data-duty-summary]");
      const renderDuties = () => {
        const date = filters.querySelector("[data-duty-date]").value;
        const session = filters.querySelector("[data-duty-session]").value;
        const room = filters.querySelector("[data-duty-room]").value;
        const teacher = filters.querySelector("[data-duty-staff]").value;
        const q = filters.querySelector("[data-duty-search]").value.trim().toLowerCase();
        const matches = duties.filter(d => (!date || d.date === date) && (!session || d.session === session) && (!room || d.room === room) && (!teacher || d.teacher === teacher) && (!q || Object.values(d).join(" ").toLowerCase().includes(q)));
        dutyBody.innerHTML = matches.map(d => `<tr>${[d.date,d.day,d.session,d.time,d.class,d.subjectPaper,d.room,d.teacher,d.initials,`${fmt(d.creditedDutyHours)} h`].map(cell).join("")}</tr>`).join("");
        summary.textContent = `${matches.length} of ${duties.length} duty assignments`;
      };
      filters.addEventListener("input", renderDuties);
      filters.addEventListener("change", renderDuties);
      renderDuties();
      root.querySelector("[data-annual-staff]").innerHTML = table(["Invigilator", "Initials", "Duties", "Credited hours"], rowList(staff.map(s => [s.name,s.initials,s.totalDuties,`${fmt(s.totalHours)} h`])), "Invigilator duty summary");
      root.querySelector("[data-annual-duty-notes]").innerHTML = examInfo.notes.map(n => `<p>${escape(n)}</p>`).join("");
      root.querySelector("[data-annual-binders]").innerHTML = table(["Binder", "Department", data.binders.sourceColumnHeading], rowList(data.binders.records.map(x => [x.binder,x.department,x.English])), "Annual exam paper binders") + `<p class="annual-source-note">${escape(data.binders.note)}</p>`;
      root.querySelector("[data-annual-source-checks]").innerHTML = examInfo.checks.length ? `<ul>${examInfo.checks.map(c => `<li><strong>${escape(c.check)}</strong>: ${escape(c.result)} ${escape(c.status)}</li>`).join("")}</ul>` : "";
    })
    .catch(error => {
      console.error("Annual Exam 2026 data:", error);
    });
})();
