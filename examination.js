'use strict';

(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const palette = ['#14233f', '#7a263a', '#745414', '#517a69', '#9a6841'];
  const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const nameCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  const svgElement = (tag, attributes = {}, text = null) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== null) node.textContent = String(text);
    return node;
  };

  const formatNumber = (value) => (
    typeof value === 'number' && Number.isFinite(value) ? numberFormat.format(value) : 'Not available'
  );

  const normalize = (value) => String(value ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');

  const setLoading = (root, message) => {
    root.replaceChildren(element('p', 'exam-loading', message));
    root.firstElementChild.setAttribute('role', 'status');
    root.firstElementChild.setAttribute('aria-live', 'polite');
  };

  const setError = (root, filename, retry) => {
    const panel = element('div', 'exam-error');
    panel.setAttribute('role', 'alert');
    panel.append(
      element('h3', '', 'Examination data could not be loaded'),
      element('p', '', `The page could not load ${filename}. If you opened this page using file://, open the project through VS Code Live Server or another local HTTP server and try again.`),
    );
    const button = element('button', 'button button-green', 'Retry loading data');
    button.type = 'button';
    button.addEventListener('click', retry);
    panel.append(button);
    root.replaceChildren(panel);
  };

  const loadData = async (root, filename, render) => {
    setLoading(root, 'Loading examination data…');
    try {
      const response = await fetch(filename, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      render(data);
    } catch (error) {
      console.error(`Unable to load ${filename}:`, error);
      setError(root, filename, () => loadData(root, filename, render));
    }
  };

  const makeTabs = (classes, selectedIndex, onSelect, label) => {
    const tablist = element('div', 'exam-tabs');
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', label);
    const tabs = classes.map((item, index) => {
      const button = element('button', 'exam-tab', item.label);
      button.type = 'button';
      button.id = `exam-tab-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(index === selectedIndex));
      button.setAttribute('tabindex', index === selectedIndex ? '0' : '-1');
      button.setAttribute('aria-controls', 'exam-active-panel');
      button.addEventListener('click', () => onSelect(index));
      button.addEventListener('keydown', (event) => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % classes.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + classes.length) % classes.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = classes.length - 1;
        else return;
        event.preventDefault();
        onSelect(next);
        tablist.querySelectorAll('[role="tab"]')[next].focus();
      });
      tablist.append(button);
      return button;
    });
    return { tablist, tabs };
  };

  const makePanel = (tab, contents) => {
    const panel = element('div', 'exam-tab-panel');
    panel.id = 'exam-active-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    panel.append(contents);
    return panel;
  };

  const getPhotoMatch = (classes, studentName) => {
    const key = normalize(studentName);
    for (const classData of classes) {
      for (const record of classData.records || []) {
        if (normalize(record.name) === key && record.photo) {
          return { path: record.photo, name: record.name, method: record.photoMatch };
        }
      }
    }
    const currentClass = classes.find((item) => (item.records || []).some((record) => normalize(record.name) === key));
    const record = currentClass?.records?.find((item) => normalize(item.name) === key);
    return record?.photo ? { path: record.photo, name: record.name, method: record.photoMatch } : null;
  };

  const initials = (name) => String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase() || '')
    .join('') || '?';

  const scoreRecords = (records) => records
    .filter((record) => typeof record.score === 'number' && Number.isFinite(record.score));

  const uniqueStudentRecords = (records) => {
    const students = new Map();
    for (const record of records) {
      const key = normalize(record.name);
      if (!key) continue;
      if (!students.has(key)) students.set(key, { name: record.name, records: [] });
      students.get(key).records.push(record);
    }
    return [...students.values()];
  };

  const distinctSubjectRecords = (records) => {
    const subjects = new Map();
    for (const record of scoreRecords(records)) {
      const key = normalize(record.subject);
      if (!key) continue;
      const current = subjects.get(key);
      if (!current || record.score > current.score) subjects.set(key, record);
    }
    return [...subjects.values()];
  };

  const statTile = (label, value, note) => {
    const tile = element('article', 'exam-stat');
    tile.append(element('span', 'exam-stat-label', label), element('strong', 'exam-stat-value', value));
    if (note) tile.append(element('span', 'exam-stat-note', note));
    return tile;
  };

  const buildToppersStats = (records) => {
    const students = uniqueStudentRecords(records);
    const bestBySubject = distinctSubjectRecords(records);
    const allScored = scoreRecords(records);
    const highest = allScored.reduce((best, record) => !best || record.score > best.score ? record : best, null);
    const average = bestBySubject.length
      ? bestBySubject.reduce((sum, record) => sum + record.score, 0) / bestBySubject.length
      : null;
    const stats = element('div', 'exam-stats');
    stats.append(
      statTile('Unique toppers', students.length, 'Distinct student names in this class'),
      statTile('Subjects represented', new Set(records.map((record) => normalize(record.subject)).filter(Boolean)).size, 'Distinct recorded subjects'),
      statTile('Highest score', highest ? formatNumber(highest.score) : 'Not available', highest ? `${highest.name} · ${highest.subject || 'Subject unavailable'}` : 'No valid scores recorded'),
      statTile('Average of subject highs', average === null ? 'Not available' : formatNumber(average), 'Mean of each subject’s highest valid score'),
    );
    return stats;
  };

  const showLightbox = (dialog, photo, name) => {
    if (!photo || !dialog || typeof dialog.showModal !== 'function') return;
    const image = dialog.querySelector('img');
    const caption = dialog.querySelector('#exam-lightbox-caption');
    image.src = photo;
    image.alt = `Photograph of ${name}`;
    caption.textContent = name;
    dialog.showModal();
  };

  const prepareLightbox = () => {
    const dialog = document.querySelector('.exam-lightbox');
    if (!dialog) return null;
    dialog.querySelector('.exam-lightbox-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dialog.close();
    });
    dialog.addEventListener('close', () => {
      const image = dialog.querySelector('img');
      image.removeAttribute('src');
      image.alt = '';
      dialog.querySelector('#exam-lightbox-caption').textContent = '';
    });
    return dialog;
  };

  const makePhoto = (name, photoPath, lightbox) => {
    const frame = element('div', 'exam-photo-frame');
    if (photoPath) {
      const button = element('button', 'exam-photo-button');
      button.type = 'button';
      button.setAttribute('aria-label', `Open photograph of ${name}`);
      const image = element('img', 'exam-student-photo');
      image.src = photoPath;
      image.alt = `Photograph of ${name}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => {
        const fallback = makeAvatar(name);
        frame.replaceChildren(fallback, element('span', 'exam-photo-note', 'Photo coming soon'));
      }, { once: true });
      button.append(image);
      button.addEventListener('click', () => showLightbox(lightbox, photoPath, name));
      frame.append(button);
      return frame;
    }
    frame.append(makeAvatar(name), element('span', 'exam-photo-note', 'Photo coming soon'));
    return frame;
  };

  const makeAvatar = (name) => element('span', 'exam-avatar', initials(name));

  const recordKey = (record) => [
    normalize(record.subject),
    record.score,
    record.year,
  ].join('|');

  const uniqueAchievements = (records) => {
    const found = new Set();
    return records.filter((record) => {
      if (!normalize(record.subject)) return false;
      const key = recordKey(record);
      if (found.has(key)) return false;
      found.add(key);
      return true;
    });
  };

  const makeStudentCard = (student, classData, maxScore, lightbox) => {
    const achievements = uniqueAchievements(student.records);
    const card = element('article', `exam-student-card${achievements.length > 1 ? ' exam-student-card--multi' : ''}`);
    const subjectCount = new Set(achievements.map((record) => normalize(record.subject))).size;
    const photo = getPhotoMatch([classData], student.name);
    card.append(makePhoto(student.name, photo?.path || null, lightbox));
    const content = element('div', 'exam-student-content');
    const heading = element('div', 'exam-student-heading');
    heading.append(element('h3', '', student.name), element('span', 'exam-class-tag', classData.label));
    if (subjectCount > 1) {
      heading.append(element('span', 'exam-subject-badge', `★ ${subjectCount} subjects`));
    }
    content.append(heading);
    const achievementList = element('ul', 'exam-achievements');
    for (const record of achievements) {
      const item = element('li', 'exam-achievement');
      const details = element('div', 'exam-achievement-details');
      const line = element('div', 'exam-achievement-line');
      line.append(element('strong', 'exam-achievement-subject', record.subject));
      line.append(element('span', 'exam-achievement-score', record.score === null ? 'Score unavailable' : formatNumber(record.score)));
      details.append(line);
      details.append(element('span', 'exam-achievement-year', record.year === null ? 'Year unavailable' : String(record.year)));
      item.append(details);
      if (record.score !== null && maxScore > 0) {
        const meter = element('div', 'exam-progress');
        meter.setAttribute('role', 'img');
        meter.setAttribute('aria-label', `${formatNumber(record.score)} relative to the highest recorded class score of ${formatNumber(maxScore)}`);
        const bar = element('span', 'exam-progress-value');
        bar.style.width = `${Math.max(0, Math.min(100, record.score / maxScore * 100))}%`;
        meter.append(bar);
        item.append(meter);
      }
      achievementList.append(item);
    }
    content.append(achievementList);
    card.append(content);
    return card;
  };

  const svgText = (svg, x, y, text, className, anchor = 'middle') => {
    const label = svgElement('text', { x, y, 'text-anchor': anchor, class: className }, text);
    svg.append(label);
    return label;
  };

  const drawTopperChart = (records) => {
    const chartWrap = element('div', 'exam-chart-scroll');
    const valid = distinctSubjectRecords(records).sort((a, b) => nameCollator.compare(a.subject, b.subject));
    if (!valid.length) {
      chartWrap.append(element('p', 'exam-empty', 'No valid subject scores are available for this class.'));
      return chartWrap;
    }
    const width = Math.max(640, valid.length * 122 + 90);
    const height = 320;
    const left = 56;
    const right = 20;
    const top = 28;
    const bottom = 80;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxValue = Math.max(...valid.map((item) => item.score), 1);
    const domain = maxValue * 1.12;
    const svg = svgElement('svg', {
      class: 'exam-chart',
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-labelledby': 'exam-topper-chart-title exam-topper-chart-description',
    });
    svg.append(
      svgElement('title', { id: 'exam-topper-chart-title' }, 'Highest recorded score by subject'),
      svgElement('desc', { id: 'exam-topper-chart-description' }, `Bars show the highest recorded score for ${valid.length} subjects. Bar lengths are relative to the highest score in this class, not an official percentage scale.`),
    );
    for (let tick = 0; tick <= 2; tick += 1) {
      const value = domain * tick / 2;
      const y = top + plotHeight - (value / domain) * plotHeight;
      svg.append(svgElement('line', { x1: left, x2: width - right, y1: y, y2: y, class: 'exam-chart-gridline' }));
      svgText(svg, left - 9, y + 4, formatNumber(value), 'exam-chart-axis-label', 'end');
    }
    const yLabel = svgText(svg, 15, top + plotHeight / 2, 'Score', 'exam-chart-axis-title');
    yLabel.setAttribute('transform', `rotate(-90 15 ${top + plotHeight / 2})`);
    const step = plotWidth / valid.length;
    valid.forEach((record, index) => {
      const barWidth = Math.min(48, step * 0.55);
      const barHeight = record.score / domain * plotHeight;
      const x = left + step * index + (step - barWidth) / 2;
      const y = top + plotHeight - barHeight;
      const group = svgElement('g', { class: 'exam-chart-bar' });
      const title = svgElement('title', {}, `${record.subject}: ${formatNumber(record.score)}`);
      group.append(title, svgElement('rect', {
        x, y, width: barWidth, height: barHeight, rx: 3,
        fill: palette[index % palette.length],
      }));
      svg.append(group);
      svgText(svg, x + barWidth / 2, y - 7, formatNumber(record.score), 'exam-chart-value');
      const label = svgText(svg, left + step * index + step / 2, top + plotHeight + 22, record.subject, 'exam-chart-subject');
      if (record.subject.length > 17) {
        label.setAttribute('transform', `rotate(-28 ${left + step * index + step / 2} ${top + plotHeight + 22})`);
        label.setAttribute('text-anchor', 'end');
      }
    });
    chartWrap.append(svg);
    const summary = element('ul', 'exam-chart-summary');
    for (const record of valid) summary.append(element('li', '', `${record.subject}: ${formatNumber(record.score)}`));
    chartWrap.append(summary);
    return chartWrap;
  };

  const spotlightRecord = (records) => {
    const valid = scoreRecords(records);
    if (!valid.length) return null;
    const highest = Math.max(...valid.map((record) => record.score));
    return {
      highest,
      ties: valid.filter((record) => record.score === highest),
    };
  };

  const renderSpotlight = (records, classData, lightbox) => {
    const section = element('section', 'exam-spotlight');
    section.setAttribute('aria-labelledby', 'exam-spotlight-title');
    section.append(element('p', 'eyebrow', 'Top performer'), element('h3', '', 'Top Performer Spotlight'));
    const best = spotlightRecord(records);
    if (!best) {
      section.append(element('p', 'exam-empty', 'No valid scores are available for this class.'));
      return section;
    }
    const lead = best.ties[0];
    const details = element('div', 'exam-spotlight-content');
    const photo = getPhotoMatch([classData], lead.name);
    details.append(makePhoto(lead.name, photo?.path || null, lightbox));
    const text = element('div', 'exam-spotlight-details');
    text.append(
      element('h4', '', lead.name || 'Student name unavailable'),
      element('p', 'exam-spotlight-score', `${formatNumber(best.highest)} · ${lead.subject || 'Subject unavailable'}`),
      element('p', '', `Year: ${lead.year === null ? 'Not recorded' : lead.year}`),
    );
    if (best.ties.length > 1) {
      const tieNames = [...new Set(best.ties.map((record) => `${record.name || 'Student name unavailable'} — ${record.subject || 'Subject unavailable'}`))];
      text.append(element('p', 'exam-tie-note', `Tie: ${tieNames.length} highest-scoring subject entries share this score. ${tieNames.join('; ')}`));
    }
    details.append(text);
    section.append(details);
    return section;
  };

  const renderToppersClass = (host, classData, allClasses, lightbox) => {
    const records = Array.isArray(classData.records) ? classData.records : [];
    host.replaceChildren(buildToppersStats(records));
    const top = element('div', 'exam-feature-grid');
    top.append(renderSpotlight(records, classData, lightbox));
    const chartCard = element('section', 'exam-subpanel');
    chartCard.append(element('h3', '', 'Top Score by Subject'), drawTopperChart(records));
    top.append(chartCard);
    host.append(top);

    const hall = element('section', 'exam-hall');
    hall.append(element('div', 'exam-panel-heading', ''));
    const hallHeading = hall.firstElementChild;
    hallHeading.append(element('h3', '', 'Hall of Fame'));
    const searchLabel = element('label', 'exam-search-label');
    searchLabel.append(element('span', '', 'Search by student or subject'));
    const search = element('input', 'exam-search');
    search.type = 'search';
    search.placeholder = 'Type a name or subject';
    search.autocomplete = 'off';
    searchLabel.append(search);
    hallHeading.append(searchLabel);
    const count = element('p', 'exam-result-count');
    count.setAttribute('aria-live', 'polite');
    const grid = element('div', 'exam-hall-grid');
    const empty = element('p', 'exam-empty');
    const students = uniqueStudentRecords(records).map((student) => ({
      ...student,
      achievements: uniqueAchievements(student.records),
      subjectCount: new Set(uniqueAchievements(student.records).map((record) => normalize(record.subject))).size,
      best: Math.max(...scoreRecords(student.records).map((record) => record.score), -Infinity),
    }));
    students.sort((a, b) => (
      b.subjectCount - a.subjectCount
      || b.best - a.best
      || nameCollator.compare(a.name, b.name)
    ));
    const maxScore = Math.max(0, ...scoreRecords(records).map((record) => record.score));
    const display = () => {
      const term = normalize(search.value);
      const filtered = students.filter((student) => (
        !term
        || normalize(student.name).includes(term)
        || student.achievements.some((record) => normalize(record.subject).includes(term))
      ));
      count.textContent = `${filtered.length} of ${students.length} students`;
      grid.replaceChildren(...filtered.map((student) => makeStudentCard(student, classData, maxScore, lightbox)));
      empty.textContent = filtered.length ? '' : (students.length ? 'No students match your search.' : 'No topper records are available for this class.');
      empty.hidden = filtered.length > 0;
      if (!filtered.length) grid.append(empty);
    };
    search.addEventListener('input', display);
    hall.append(count, grid);
    host.append(hall);
    display();
  };

  const initToppers = (root) => loadData(root, 'examination/data/toppers.json', (data) => {
    const classes = Array.isArray(data.classes) ? data.classes : [];
    if (!classes.length) throw new Error('The toppers dataset has no classes.');
    let selected = 0;
    const lightbox = prepareLightbox();
    const host = element('div', 'exam-data-view');
    const panelHost = element('div', 'exam-panel-host');
    const update = () => {
      tabs.forEach((tab, index) => {
        tab.setAttribute('aria-selected', String(index === selected));
        tab.tabIndex = index === selected ? 0 : -1;
      });
      panelHost.replaceChildren(makePanel(tabs[selected], (() => {
        const panel = element('div', 'exam-toppers-content');
        renderToppersClass(panel, classes[selected], classes, lightbox);
        return panel;
      })()));
    };
    const { tablist, tabs } = makeTabs(classes, selected, (index) => {
      selected = index;
      update();
    }, 'Choose class for subject toppers');
    host.append(tablist, panelHost);
    root.replaceChildren(host);
    update();
  });

  const latestNumeric = (classData, subject) => {
    for (const year of [...classData.years].sort((a, b) => b - a)) {
      const value = subject.scores?.[String(year)];
      if (typeof value === 'number' && Number.isFinite(value)) return { year, value };
    }
    return null;
  };

  const statusFor = (score, target) => {
    if (typeof score !== 'number' || typeof target !== 'number') {
      return { label: 'Data unavailable', className: 'exam-status--missing', detail: 'A score or target is not recorded.' };
    }
    const gap = score - target;
    if (gap > 0) return { label: `Target met (+${formatNumber(gap)})`, className: 'exam-status--met', detail: `Above target by ${formatNumber(gap)} points.` };
    if (gap === 0) return { label: 'Target met (on target)', className: 'exam-status--met', detail: 'The score matches the target.' };
    return { label: `${formatNumber(Math.abs(gap))} pts to target`, className: 'exam-status--below', detail: `${formatNumber(Math.abs(gap))} points below target.` };
  };

  const getOverall = (classData) => classData.subjects.find((item) => normalize(item.subject) === 'overall');

  const buildResultsStats = (classData) => {
    const latestYear = Math.max(...classData.years);
    const overall = getOverall(classData);
    const overallScore = overall?.scores?.[String(latestYear)];
    const overallTarget = overall?.target;
    const status = statusFor(overallScore, overallTarget);
    const ordinary = classData.subjects.filter((subject) => normalize(subject.subject) !== 'overall');
    const values = ordinary.map((subject) => subject.scores?.[String(latestYear)]).filter((value) => typeof value === 'number' && Number.isFinite(value));
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const met = ordinary.filter((subject) => (
      typeof subject.scores?.[String(latestYear)] === 'number'
      && typeof subject.target === 'number'
      && subject.scores[String(latestYear)] >= subject.target
    )).length;
    const stats = element('div', 'exam-stats exam-results-stats');
    const headline = element('article', 'exam-stat exam-stat--headline');
    headline.append(
      element('span', 'exam-stat-label', `Overall · ${latestYear}`),
      element('strong', 'exam-stat-value', formatNumber(overallScore)),
      element('span', 'exam-stat-note', `Target: ${formatNumber(overallTarget)}`),
      element('span', `exam-status ${status.className}`, status.label),
    );
    stats.append(
      headline,
      statTile(`Average subject score · ${latestYear}`, mean === null ? 'Not available' : formatNumber(mean), `${values.length} subjects with recorded scores; Overall excluded`),
      statTile('Subjects meeting target', `${met} / ${ordinary.length}`, `Based on available scores for ${latestYear}`),
      statTile('Years recorded', classData.years.join(', '), `${classData.subjects.length} source rows, including Overall if present`),
    );
    return stats;
  };

  const makeYearChips = (subjects, selected, onSelect) => {
    const chips = element('div', 'exam-filter-chips');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', 'Filter chart by subject');
    const names = ['All subjects', ...subjects];
    for (const name of names) {
      const button = element('button', `exam-chip${name === selected ? ' exam-chip--active' : ''}`, name);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(name === selected));
      button.addEventListener('click', () => onSelect(name));
      chips.append(button);
    }
    return chips;
  };

  const drawResultsChart = (classData, selectedSubject) => {
    const chartWrap = element('div', 'exam-chart-scroll');
    const visibleSubjects = selectedSubject === 'All subjects'
      ? classData.subjects
      : classData.subjects.filter((subject) => subject.subject === selectedSubject);
    const years = [...classData.years].sort((a, b) => a - b);
    const chartValues = visibleSubjects.flatMap((subject) => years
      .map((year) => subject.scores?.[String(year)])
      .filter((value) => typeof value === 'number' && Number.isFinite(value)));
    const oneSubject = selectedSubject !== 'All subjects' && visibleSubjects.length === 1;
    const target = oneSubject && typeof visibleSubjects[0].target === 'number' ? visibleSubjects[0].target : null;
    if (!chartValues.length && target === null) {
      chartWrap.append(element('p', 'exam-empty', 'No result scores are available for this selection.'));
      return chartWrap;
    }
    const width = Math.max(720, visibleSubjects.length * 112 + 100);
    const height = 390;
    const left = 58;
    const right = 22;
    const top = 34;
    const bottom = 102;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxValue = Math.max(1, ...chartValues, ...(target === null ? [] : [target]));
    const domain = maxValue * 1.12;
    const svg = svgElement('svg', {
      class: 'exam-chart',
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-labelledby': 'exam-results-chart-title exam-results-chart-description',
    });
    svg.append(
      svgElement('title', { id: 'exam-results-chart-title' }, `Examination result trends for ${classData.label}`),
      svgElement('desc', { id: 'exam-results-chart-description' }, `Grouped bars compare recorded subject scores for ${years.join(', ')}. Blank values are omitted. ${target === null ? 'Target lines are not shown in the all-subjects view.' : `Dashed line marks the ${formatNumber(target)} target.`}`),
    );
    for (let tick = 0; tick <= 4; tick += 1) {
      const value = domain * tick / 4;
      const y = top + plotHeight - value / domain * plotHeight;
      svg.append(svgElement('line', { x1: left, x2: width - right, y1: y, y2: y, class: 'exam-chart-gridline' }));
      svgText(svg, left - 9, y + 4, formatNumber(value), 'exam-chart-axis-label', 'end');
    }
    const yLabel = svgText(svg, 15, top + plotHeight / 2, 'Score', 'exam-chart-axis-title');
    yLabel.setAttribute('transform', `rotate(-90 15 ${top + plotHeight / 2})`);
    const groupWidth = plotWidth / Math.max(visibleSubjects.length, 1);
    const barWidth = Math.max(8, Math.min(24, groupWidth / (years.length + 1)));
    visibleSubjects.forEach((subject, subjectIndex) => {
      const groupCenter = left + groupWidth * subjectIndex + groupWidth / 2;
      const visibleYears = years.filter((year) => typeof subject.scores?.[String(year)] === 'number' && Number.isFinite(subject.scores[String(year)]));
      visibleYears.forEach((year, validIndex) => {
        const value = subject.scores[String(year)];
        const x = groupCenter - visibleYears.length * barWidth / 2 + validIndex * barWidth;
        const barHeight = value / domain * plotHeight;
        const y = top + plotHeight - barHeight;
        const group = svgElement('g', { class: 'exam-chart-bar' });
        group.append(
          svgElement('title', {}, `${subject.subject}, ${year}: ${formatNumber(value)}`),
          svgElement('rect', { x: x + 1, y, width: barWidth - 2, height: barHeight, rx: 2, fill: palette[years.indexOf(year) % palette.length] }),
        );
        svg.append(group);
      });
      const subjectLabel = svgText(svg, groupCenter, top + plotHeight + 22, subject.subject, 'exam-chart-subject');
      if (subject.subject.length > 15) {
        subjectLabel.setAttribute('transform', `rotate(-30 ${groupCenter} ${top + plotHeight + 22})`);
        subjectLabel.setAttribute('text-anchor', 'end');
      }
      const latest = latestNumeric(classData, subject);
      const accessibleValues = years.map((year) => `${year}: ${formatNumber(subject.scores?.[String(year)])}`).join('; ');
      subjectLabel.setAttribute('aria-label', `${subject.subject}; ${accessibleValues}${latest ? `; latest ${latest.year} ${formatNumber(latest.value)}` : ''}`);
    });
    if (target !== null) {
      const targetY = top + plotHeight - target / domain * plotHeight;
      svg.append(svgElement('line', { x1: left, x2: width - right, y1: targetY, y2: targetY, class: 'exam-target-line' }));
      svgText(svg, width - right, targetY - 7, `Target ${formatNumber(target)}`, 'exam-target-label', 'end');
    }
    chartWrap.append(svg);
    const summary = element('ul', 'exam-chart-summary');
    summary.setAttribute('aria-label', 'Chart legend and data summary');
    years.forEach((year, index) => {
      const item = element('li', 'exam-legend-item');
      const swatch = element('span', 'exam-legend-swatch');
      swatch.style.backgroundColor = palette[index % palette.length];
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, element('span', '', String(year)));
      summary.append(item);
    });
    if (target !== null) {
      const item = element('li', 'exam-legend-item');
      item.append(element('span', 'exam-legend-swatch exam-legend-swatch--target'), element('span', '', `Target ${formatNumber(target)}`));
      summary.append(item);
    }
    for (const subject of visibleSubjects) {
      const detail = years.map((year) => `${year}: ${formatNumber(subject.scores?.[String(year)])}`).join(', ');
      summary.append(element('li', '', `${subject.subject} — ${detail}; target: ${formatNumber(subject.target)}`));
    }
    chartWrap.append(summary);
    return chartWrap;
  };

  const makeResultsTable = (classData) => {
    const section = element('section', 'exam-table-section');
    section.append(element('h3', '', 'Subject summary'));
    const scroll = element('div', 'exam-table-scroll');
    const table = element('table', 'exam-results-table');
    table.append(element('caption', 'exam-visually-hidden', `Latest available results, target gaps and trends for ${classData.label}`));
    const head = element('thead');
    const headerRow = element('tr');
    for (const label of ['Subject', 'Latest', 'Target', 'Gap', 'Trend', 'Status']) {
      const th = element('th', '', label);
      th.scope = 'col';
      headerRow.append(th);
    }
    head.append(headerRow);
    const body = element('tbody');
    const years = [...classData.years].sort((a, b) => a - b);
    for (const subject of classData.subjects) {
      const row = element('tr', normalize(subject.subject) === 'overall' ? 'exam-overall-row' : '');
      const latest = latestNumeric(classData, subject);
      const numeric = years.map((year) => ({ year, value: subject.scores?.[String(year)] }))
        .filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));
      const previous = numeric.length > 1 ? numeric[numeric.length - 2] : null;
      const gap = latest && typeof subject.target === 'number' ? latest.value - subject.target : null;
      const trend = latest && previous
        ? latest.value > previous.value ? `↑ +${formatNumber(latest.value - previous.value)}`
          : latest.value < previous.value ? `↓ -${formatNumber(previous.value - latest.value)}`
            : '→ flat'
        : 'Insufficient data';
      const status = statusFor(latest?.value, subject.target);
      const cells = [
        subject.subject,
        latest ? `${formatNumber(latest.value)} (${latest.year})` : 'Not available',
        formatNumber(subject.target),
        gap === null ? 'Not available' : `${gap > 0 ? '+' : ''}${formatNumber(gap)}`,
        trend,
        status.label,
      ];
      cells.forEach((value, index) => {
        const cell = element(index === 0 ? 'th' : 'td', index === 5 ? `exam-status-cell ${status.className}` : '', value);
        if (index === 0) cell.scope = 'row';
        row.append(cell);
      });
      body.append(row);
    }
    table.append(head, body);
    scroll.append(table);
    section.append(scroll);
    return section;
  };

  const renderResultsClass = (host, classData) => {
    host.replaceChildren(buildResultsStats(classData));
    const chartSection = element('section', 'exam-subpanel');
    chartSection.append(element('h3', '', 'Trend by subject'));
    const chartHost = element('div', 'exam-results-chart-host');
    const subjects = classData.subjects.map((item) => item.subject);
    let selected = 'All subjects';
    const updateChart = () => {
      chartHost.replaceChildren(drawResultsChart(classData, selected));
      chips.querySelectorAll('button').forEach((button) => {
        const active = button.textContent === selected;
        button.classList.toggle('exam-chip--active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    };
    const chips = makeYearChips(subjects, selected, (value) => {
      selected = value;
      updateChart();
    });
    chartSection.append(chips, chartHost);
    host.append(chartSection, makeResultsTable(classData));
    updateChart();
  };

  const initResults = (root) => loadData(root, 'examination/data/results.json', (data) => {
    const classes = Array.isArray(data.classes) ? data.classes : [];
    if (!classes.length) throw new Error('The results dataset has no classes.');
    let selected = 0;
    const host = element('div', 'exam-data-view');
    const panelHost = element('div', 'exam-panel-host');
    const update = () => {
      tabs.forEach((tab, index) => {
        tab.setAttribute('aria-selected', String(index === selected));
        tab.tabIndex = index === selected ? 0 : -1;
      });
      const panel = element('div', 'exam-results-content');
      renderResultsClass(panel, classes[selected]);
      panelHost.replaceChildren(makePanel(tabs[selected], panel));
    };
    const { tablist, tabs } = makeTabs(classes, selected, (index) => {
      selected = index;
      update();
    }, 'Choose examination results class');
    host.append(tablist, panelHost);
    root.replaceChildren(host);
    update();
  });

  const toppersRoot = document.querySelector('#exam-toppers-app');
  const resultsRoot = document.querySelector('#exam-results-app');
  if (toppersRoot) initToppers(toppersRoot);
  if (resultsRoot) initResults(resultsRoot);
})();
