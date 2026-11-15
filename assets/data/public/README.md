# Public data boundary

Everything placed in this directory is public to anyone who can reach the
website or repository. Store only reviewed, approved display data here. Never
copy source workbooks, student-level records, staff email addresses, private
Drive links, login records, internal notes, or source-row metadata here.

The adjacent `schemas/` directory documents data shapes for a later approved
export. It contains no school records. Existing UI code has not been rewired in
Stage 1; the original local files remain in place and continue to support local
preview. Do not publish a release that removes their tracked copies until
approved public replacements are prepared and the relevant UI is connected to
them.

## Proposed public fields

- Academic performance: school year, class, subject or department, target mean,
  and aggregate midterm mean. Exclude teacher names unless separately approved.
- Trial examination: school year, class, subject, aggregate means, pass rate,
  and cohort counts only when the cohort is large enough to prevent identifying
  individual students.
- Reading/DIBELS: class or grade, round, stage, aggregate measures, and broad
  performance-band counts. Do not include names, student IDs, gender, row
  numbers, quality flags tied to a child, or individual scores. Suppress small
  groups using a school-approved threshold.
- Annual examination: public timeline, timetable, and approved binder or
  subject summaries. Do not include named invigilation assignments, initials,
  source sheet names, or private staffing notes.
- PLC: department labels, aggregate membership counts, and the teacher folder
  shortcuts and photo references explicitly approved for publication by school
  administration. Folder contents remain governed by their existing Google
  Drive permissions; do not include workbook contents, credentials, or private
  staff account data.
- Examination results: school/class/subject-level summaries only. Keep student
  names, individual scores, source workbook names, and source-row references
  private unless an explicit public-release decision is made.
- Staff directory: no dataset is approved by this template. If later approved,
  use only the minimum public display fields (display name, public role,
  department, and approved portrait path); never include email, staff ID, or
  login/authorisation data.
- Attendance: aggregate period and class/grade summaries only; no staff or
  student names, IDs, or individual attendance histories.
- Announcements and teaching resources: public title, date/subject, and URLs
  that have been deliberately made public. Do not expose private Drive folder
  URLs.

Existing dashboard sections, filters, and charts should remain in the interface.
Some per-person lookup or filtering cannot safely be retained for a public
audience; replace that dimension with an approved aggregate (such as class,
round, department, or subject) rather than exposing individual records.
