#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const root = path.resolve(__dirname, '..');
const sourceDirectory = path.join(root, 'Examination ');
const photoDirectory = path.join(sourceDirectory, 'subject toppers Photo');
const outputDirectory = path.join(root, 'examination', 'data');
const topperWorkbook = path.join(sourceDirectory, 'Subject Toppers.xlsx');
const resultsWorkbook = path.join(sourceDirectory, 'high stake results.xlsx');

const topperSheetSpecs = [
  { sheet: 'CE VI', label: 'Class VI' },
  { sheet: 'CE VIII', label: 'Class VIII' },
  { sheet: 'BCSE', label: 'Class X' },
];
const resultSheetSpecs = [
  { sheet: 'CE VI', label: 'CE VI' },
  { sheet: 'CE VIII', label: 'CE VIII' },
  { sheet: 'BCSE X', label: 'BCSE X' },
];
const expectedTopperColumns = ['serial', 'name', 'photo', 'subject', 'score', 'year'];
const topperAliases = {
  serial: ['slno', 'serial', 'serialnumber', 'sno'],
  name: ['name', 'studentname', 'student'],
  photo: ['photo', 'photograph', 'image', 'picture'],
  subject: ['subject', 'course'],
  score: ['score', 'marks', 'mark', 'points'],
  year: ['year', 'academicyear'],
};

function fail(message) {
  throw new Error(message);
}

function normalizeHeader(value) {
  return String(value ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim());
}

function cleanText(value) {
  if (isBlank(value)) return null;
  return String(value).replace(/\s+/g, ' ').trim();
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.trim().replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function sheetRows(sheet) {
  if (!sheet) fail('Requested worksheet is missing.');
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
  for (const merge of sheet['!merges'] || []) {
    const anchor = rows[merge.s.r]?.[merge.s.c] ?? null;
    if (isBlank(anchor)) continue;
    for (let row = merge.s.r; row <= merge.e.r; row += 1) {
      rows[row] ||= [];
      for (let column = merge.s.c; column <= merge.e.c; column += 1) {
        if (isBlank(rows[row][column])) rows[row][column] = anchor;
      }
    }
  }
  return rows;
}

function loadWorkbook(filename) {
  if (!fs.existsSync(filename)) fail(`Workbook not found: ${path.relative(root, filename)}`);
  try {
    return XLSX.readFile(filename, { cellDates: false, raw: true });
  } catch (error) {
    fail(`Could not read ${path.relative(root, filename)}: ${error.message}`);
  }
}

function locateTopperColumns(header, filename, sheetName) {
  const normalizedHeaders = header.map(normalizeHeader);
  const result = {};
  for (const key of expectedTopperColumns) {
    const matches = normalizedHeaders.flatMap((value, index) => (
      topperAliases[key].includes(value) ? [index] : []
    ));
    if (matches.length > 1) {
      fail(`${path.relative(root, filename)} sheet "${sheetName}" has ambiguous "${key}" headers.`);
    }
    if (matches.length === 1) result[key] = matches[0];
  }
  const missing = expectedTopperColumns.filter((key) => result[key] === undefined);
  if (missing.length) {
    const fallback = Object.fromEntries(expectedTopperColumns.map((key, index) => [key, index]));
    const fallbackIsUsable = expectedTopperColumns.every((key) => (
      header[fallback[key]] !== undefined && !isBlank(header[fallback[key]])
    ));
    if (!fallbackIsUsable) {
      fail(`${path.relative(root, filename)} sheet "${sheetName}" is missing required headers: ${missing.join(', ')}.`);
    }
    console.warn(
      `Warning: ${path.relative(root, filename)} sheet "${sheetName}" has unrecognized headers; ` +
      'using the documented Sl. No, Name, Photo, Subject, Score, Year column order.',
    );
    return fallback;
  }
  return result;
}

function normalizeStudentName(value) {
  return normalizeHeader(value);
}

function editDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function photoKey(filename) {
  const stem = path.parse(filename).name
    .replace(/[-_ ]+removebg[-_ ]preview$/i, '')
    .replace(/[-_ ]+preview$/i, '');
  return normalizeStudentName(stem);
}

function collectPhotos() {
  if (!fs.existsSync(photoDirectory)) {
    fail(`Photo directory not found: ${path.relative(root, photoDirectory)}`);
  }
  const supported = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  return fs.readdirSync(photoDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && supported.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({ filename: entry.name, key: photoKey(entry.name) }));
}

function findLocalPhoto(studentName, photos) {
  const key = normalizeStudentName(studentName);
  if (!key) return { photo: null, photoMatch: null };
  const exact = photos.filter((photo) => photo.key === key);
  let selected = exact;
  let matchType = 'normalized filename';
  if (!selected.length) {
    selected = photos.filter((photo) => editDistance(key, photo.key) <= 2);
    matchType = 'unambiguous spelling variant';
  }
  if (selected.length !== 1) return { photo: null, photoMatch: null };
  const filename = selected[0].filename;
  const absolutePath = path.resolve(photoDirectory, filename);
  const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
  if (relativePath.startsWith('../') || path.isAbsolute(relativePath)) {
    fail(`Photo path escapes project directory: ${filename}`);
  }
  return { photo: relativePath, photoMatch: matchType };
}

function parseToppers(workbook, photos) {
  const classes = topperSheetSpecs.map(({ sheet: sheetName, label }) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) fail(`${path.relative(root, topperWorkbook)} is missing sheet "${sheetName}".`);
    const rows = sheetRows(sheet);
    const columns = locateTopperColumns(rows[1] || [], topperWorkbook, sheetName);
    const records = [];
    const carried = { name: null, subject: null, score: null, year: null };
    for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const values = Object.fromEntries(expectedTopperColumns.map((key) => [key, row[columns[key]] ?? null]));
      if (expectedTopperColumns.every((key) => isBlank(values[key]))) break;

      let name = cleanText(values.name);
      if (!name && isBlank(values.serial)) name = carried.name;
      if (name) carried.name = name;

      const subject = cleanText(values.subject) || carried.subject;
      if (subject) carried.subject = subject;
      const score = isBlank(values.score) ? carried.score : asNumber(values.score);
      if (score !== null) carried.score = score;
      const year = isBlank(values.year) ? carried.year : asNumber(values.year);
      if (year !== null) carried.year = year;

      if (!name && !subject && score === null && year === null) {
        console.warn(`${path.relative(root, topperWorkbook)} sheet "${sheetName}" row ${rowIndex + 1} has no usable record values.`);
        continue;
      }
      const { photo, photoMatch } = findLocalPhoto(name, photos);
      records.push({
        name,
        subject,
        score,
        year,
        photo,
        photoMatch,
        sourceRow: rowIndex + 1,
      });
    }
    return { sheet: sheetName, label, records };
  });
  return { source: path.relative(root, topperWorkbook).split(path.sep).join('/'), classes };
}

function locateResultColumns(header, filename, sheetName) {
  const normalized = header.map(normalizeHeader);
  const subjectIndices = normalized.flatMap((value, index) => value === 'subject' ? [index] : []);
  const targetIndices = normalized.flatMap((value, index) => value === 'target' ? [index] : []);
  if (subjectIndices.length !== 1) {
    fail(`${path.relative(root, filename)} sheet "${sheetName}" needs exactly one Subject header.`);
  }
  if (targetIndices.length > 1) {
    fail(`${path.relative(root, filename)} sheet "${sheetName}" has duplicate Target headers.`);
  }
  const years = [];
  const seenYears = new Set();
  for (let index = 0; index < header.length; index += 1) {
    if (index === subjectIndices[0] || index === targetIndices[0] || isBlank(header[index])) continue;
    const value = asNumber(header[index]);
    if (value === null || !Number.isInteger(value) || value < 1900 || value > 2200) continue;
    if (seenYears.has(value)) {
      fail(`${path.relative(root, filename)} sheet "${sheetName}" has duplicate year header ${value}.`);
    }
    seenYears.add(value);
    years.push({ year: value, index });
  }
  years.sort((left, right) => left.year - right.year);
  if (!years.length) fail(`${path.relative(root, filename)} sheet "${sheetName}" has no valid year columns.`);
  return { subject: subjectIndices[0], target: targetIndices[0] ?? null, years };
}

function parseResults(workbook) {
  const classes = resultSheetSpecs.map(({ sheet: sheetName, label }) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) fail(`${path.relative(root, resultsWorkbook)} is missing sheet "${sheetName}".`);
    const rows = sheetRows(sheet);
    const columns = locateResultColumns(rows[0] || [], resultsWorkbook, sheetName);
    const subjects = [];
    let hasOverall = false;
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      if (row.every(isBlank)) break;
      const subject = cleanText(row[columns.subject]);
      if (!subject) {
        console.warn(`${path.relative(root, resultsWorkbook)} sheet "${sheetName}" row ${rowIndex + 1} has no subject; skipped.`);
        continue;
      }
      const scores = {};
      for (const { year, index } of columns.years) scores[String(year)] = asNumber(row[index]);
      const target = columns.target === null ? null : asNumber(row[columns.target]);
      if (normalizeHeader(subject) === 'overall') hasOverall = true;
      subjects.push({ subject, scores, target, sourceRow: rowIndex + 1 });
    }
    if (!hasOverall) {
      console.warn(`Warning: ${path.relative(root, resultsWorkbook)} sheet "${sheetName}" has no Overall row.`);
    }
    return {
      sheet: sheetName,
      label,
      years: columns.years.map(({ year }) => year),
      targetAvailable: columns.target !== null,
      subjects,
      warnings: hasOverall ? [] : ['Overall row is missing from the source sheet.'],
    };
  });
  return { source: path.relative(root, resultsWorkbook).split(path.sep).join('/'), classes };
}

function writeJson(filename, data) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(root, filename)}`);
}

function main() {
  const toppersWorkbook = loadWorkbook(topperWorkbook);
  const resultsSourceWorkbook = loadWorkbook(resultsWorkbook);
  const photos = collectPhotos();
  const toppers = parseToppers(toppersWorkbook, photos);
  const results = parseResults(resultsSourceWorkbook);
  writeJson(path.join(outputDirectory, 'toppers.json'), toppers);
  writeJson(path.join(outputDirectory, 'results.json'), results);
  for (const entry of toppers.classes) {
    const students = new Set(entry.records.map((record) => normalizeStudentName(record.name)).filter(Boolean));
    const matched = entry.records.filter((record) => record.photo).length;
    console.log(`${entry.sheet}: ${entry.records.length} topper rows, ${students.size} student names, ${matched} row photo matches.`);
  }
  for (const entry of results.classes) {
    console.log(`${entry.sheet}: ${entry.subjects.length} result rows; years ${entry.years.join(', ')}.`);
  }
  const unmatched = new Map();
  for (const entry of toppers.classes) {
    for (const record of entry.records) {
      if (!record.name || record.photo) continue;
      const key = `${entry.sheet}:${normalizeStudentName(record.name)}`;
      const item = unmatched.get(key) || { sheet: entry.sheet, name: record.name, rows: [] };
      item.rows.push(record.sourceRow);
      unmatched.set(key, item);
    }
  }
  if (unmatched.size) {
    const details = [...unmatched.values()].map((item) => (
      `${item.sheet}: ${item.name} (rows ${item.rows.join(', ')})`
    ));
    console.warn(`No unambiguous local photo match for: ${details.join('; ')}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Examination conversion failed: ${error.message}`);
  process.exitCode = 1;
}
