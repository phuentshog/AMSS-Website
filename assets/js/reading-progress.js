(function () {
  'use strict';

  const DATA = window.READING_DATA;
  const CLASSES = DATA?.classes || ['IV A', 'IV B', 'V A', 'V B', 'VI A', 'VI B'];
  const ROUNDS = DATA?.rounds || ['Round 1', 'Round 2'];
  const RANGE_START = 200;
  const RANGE_WIDTH = 20;
  const RANGE_COUNT = 15;
  const PALETTE = ['#315f92', '#b17b25'];
  const byId = (id) => document.getElementById(id);
  const roundFilter = byId('reading-round');
  if (!roundFilter) return;

  const classFilter = byId('reading-class');
  const genderFilter = byId('reading-gender');
  const rows = Array.isArray(DATA?.aggregates) ? DATA.aggregates : [];
  const selectedRounds = () => roundFilter.value === 'both' ? ROUNDS : [roundFilter.value];
  const classMatches = (row, selected) => selected === 'all' || row.class === selected || row.grade === selected;
  const filtered = (round, selectedClass, gender) => rows.filter((row) => row.round === round && classMatches(row, selectedClass) && (gender === 'all' || row.gender === gender));
  const classesFor = (selected) => selected === 'all' ? CLASSES : selected === 'IV' || selected === 'V' || selected === 'VI' ? CLASSES.filter((name) => name.startsWith(selected + ' ')) : [selected];
  const total = (rs, cls, gender) => {
    const found = rows.filter((row) => rs.includes(row.round) && classMatches(row, cls) && (gender === 'all' || row.gender === gender));
    return found.reduce((acc, row) => ({ count: acc.count + row.count, sum: acc.sum + row.sum }), { count: 0, sum: 0 });
  };
  const fmt = (value, digits = 1) => Number(value).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function createBarChart(target, series, options = {}) {
    const host = byId(target);
    if (!host) return;
    const categories = options.categories || [];
    const width = Math.max(780, categories.length * 154 + 112);
    const height = options.main ? 430 : 370;
    const margin = { top: 34, right: 26, bottom: 78, left: 68 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const values = series.flatMap((s) => s.values.map((v) => Number.isFinite(v.value) ? v.value : 0));
    const max = Math.max(1, ...(options.maxValue ? [options.maxValue] : []), ...values);
    const yMax = Math.ceil(max / (options.tickStep || 50)) * (options.tickStep || 50);
    const groupW = plotW / Math.max(categories.length, 1);
    const barW = Math.min(options.main ? 34 : 26, groupW / Math.max(series.length + 1, 2));
    const offset = (series.length * barW + (series.length - 1) * 7) / 2;
    const desc = options.description || options.title || 'Bar chart';
    let svg = `<svg class="reading-svg${options.main ? ' reading-svg--main' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(desc)}"><title>${escapeHtml(desc)}</title>`;
    for (let tick = 0; tick <= yMax; tick += options.tickStep || 50) {
      const y = margin.top + plotH - (tick / yMax) * plotH;
      svg += `<line class="reading-gridline" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"/><text class="reading-tick" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${options.tickFormat ? options.tickFormat(tick) : tick}</text>`;
    }
    svg += `<line class="reading-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}"/><line class="reading-axis" x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}"/>`;
    categories.forEach((category, index) => {
      const center = margin.left + groupW * (index + 0.5);
      series.forEach((item, seriesIndex) => {
        const datum = item.values[index] || { value: null, label: 'Missing' };
        const value = Number.isFinite(datum.value) ? datum.value : null;
        if (value === null) return;
        const h = (value / yMax) * plotH;
        const x = center - offset + seriesIndex * (barW + 7);
        const y = margin.top + plotH - h;
        const title = `${category} · ${item.name}: ${datum.label ?? fmt(value)}${datum.count != null ? ` (n=${datum.count})` : ''}`;
        svg += `<g class="reading-bar-group" tabindex="0" role="img" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}</title><rect class="reading-bar" x="${x}" y="${y}" width="${barW}" height="${Math.max(h, 1)}" rx="3" fill="${item.color || PALETTE[seriesIndex % PALETTE.length]}"/><text class="reading-value-label" x="${x + barW / 2}" y="${Math.max(margin.top + 13, y - 7)}" text-anchor="middle">${escapeHtml(datum.label ?? fmt(value))}</text></g>`;
      });
      svg += `<text class="reading-category-label" x="${center}" y="${height - margin.bottom + 24}" text-anchor="middle">${escapeHtml(category)}</text>`;
    });
    svg += `<text class="reading-y-label" transform="translate(18 ${margin.top + plotH / 2}) rotate(-90)" text-anchor="middle">${escapeHtml(options.yLabel || '')}</text></svg>`;
    host.innerHTML = svg;
  }

  function legend(target, items) {
    byId(target).innerHTML = items.map((item) => `<span class="reading-legend-item"><i style="--legend-color:${item.color}" aria-hidden="true"></i>${escapeHtml(item.name)}</span>`).join('');
  }
  function table(target, headers, values) {
    const host = byId(target);
    host.innerHTML = `<table><caption class="visually-hidden">${escapeHtml(headers.join(', '))}</caption><thead><tr>${headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${values.map((row) => `<tr>${row.map((cell, i) => `<${i === 0 ? 'th scope="row"' : 'td'}>${escapeHtml(cell)}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function render() {
    if (!DATA || !rows.length) {
      document.querySelector('.reading-dashboard .container').insertAdjacentHTML('afterbegin', '<p class="reading-data-error" role="alert">Reading progress data is unavailable. Please try again later.</p>');
      return;
    }
    const roundNames = selectedRounds();
    const selectedClass = classFilter.value;
    const selectedGender = genderFilter.value;
    const classNames = classesFor(selectedClass);
    const summaryTotals = roundNames.map((round) => total([round], selectedClass, selectedGender));
    byId('reading-count').textContent = summaryTotals.length === 2 ? (summaryTotals[0].count === summaryTotals[1].count ? `${summaryTotals[0].count} each round` : `${summaryTotals[0].count} / ${summaryTotals[1].count}`) : summaryTotals[0].count.toLocaleString();
    byId('reading-count-note').textContent = summaryTotals.length === 2 ? 'Valid assessed students (Round 1 / Round 2)' : `${roundNames[0]} valid assessed students`;
    byId('reading-average').textContent = summaryTotals.map((item) => item.count ? fmt(item.sum / item.count) : 'Missing').join(' / ');
    byId('reading-average-note').textContent = summaryTotals.length === 2 ? 'Round 1 / Round 2; recorded values' : `Recorded values · ${roundNames[0]}`;
    if (roundNames.length === 2 && summaryTotals.every((item) => item.count)) {
      const delta = summaryTotals[1].sum / summaryTotals[1].count - summaryTotals[0].sum / summaryTotals[0].count;
      byId('reading-change').textContent = `${delta > 0 ? '+' : ''}${fmt(delta)}`;
    byId('reading-change-note').textContent = 'Descriptive difference; comparability is unverified.';
    } else {
      byId('reading-change').textContent = '—';
      byId('reading-change-note').textContent = 'Select both rounds to see the recorded difference.';
    }

    const mainSeries = roundNames.map((round, ri) => ({ name: round, color: PALETTE[ri], values: classNames.map((cls) => {
      const matching = filtered(round, cls, selectedGender);
      const count = matching.reduce((n, row) => n + row.count, 0);
      const sum = matching.reduce((n, row) => n + row.sum, 0);
      return count ? { value: sum / count, label: fmt(sum / count), count } : { value: null };
    }) }));
    byId('reading-class-heading').textContent = selectedClass === 'all' ? 'Average Beginning Composite score by class' : `Average Beginning Composite score · ${selectedClass}`;
    byId('reading-class-subtitle').textContent = `${roundNames.join(' and ')} average${roundNames.length === 1 ? '' : 's'} by class`;
    legend('reading-class-legend', mainSeries.map(({ name, color }) => ({ name, color })));
    createBarChart('reading-class-chart', mainSeries, { categories: classNames, yLabel: 'Recorded composite score', main: true, tickStep: 50, description: 'Average recorded Beginning Composite score by class and round' });
    table('reading-class-table', ['Class', ...roundNames], classNames.map((cls, i) => [cls, ...mainSeries.map((s) => s.values[i].value == null ? 'Missing' : `${s.values[i].label} (n=${s.values[i].count})`)]));

    const rangeKeys = ['below', ...Array.from({ length: RANGE_COUNT }, (_, i) => `${RANGE_START + i * RANGE_WIDTH}-<${RANGE_START + (i + 1) * RANGE_WIDTH}`), 'above'];
    const rangeSeries = roundNames.map((round, ri) => ({ name: round, color: PALETTE[ri], values: rangeKeys.map((key) => {
      const n = filtered(round, selectedClass, selectedGender).reduce((sum, row) => sum + (row.scoreRanges[key] || 0), 0);
      return { value: n, label: String(n) };
    }) }));
    legend('reading-range-legend', rangeSeries.map(({ name, color }) => ({ name, color })));
    byId('reading-range-subtitle').textContent = `Recorded score range · ${selectedClass === 'all' ? 'all classes' : selectedClass}${selectedGender === 'all' ? '' : ` · ${selectedGender}`}`;
    createBarChart('reading-range-chart', rangeSeries, { categories: rangeKeys.map((key) => key === 'below' ? `<${RANGE_START}` : key === 'above' ? `≥${RANGE_START + RANGE_COUNT * RANGE_WIDTH}` : key), yLabel: 'Number of students', tickStep: 5, description: 'Number of students in each recorded Beginning Composite score range' });
    table('reading-range-table', ['Score range', ...roundNames], rangeKeys.map((key, i) => [key === 'below' ? `Below ${RANGE_START}` : key === 'above' ? `${RANGE_START + RANGE_COUNT * RANGE_WIDTH} and above` : key, ...rangeSeries.map((s) => s.values[i].label)]));

    const genderSeries = roundNames.flatMap((round, ri) => ['Girls', 'Boys'].map((gender, gi) => ({ name: `${gender} · ${round}`, color: gi ? (ri ? '#9e713a' : '#6387ad') : (ri ? '#c3a16a' : '#315f92'), values: classNames.map((cls) => {
      const matching = filtered(round, cls, gender);
      const count = matching.reduce((n, row) => n + row.count, 0);
      const sum = matching.reduce((n, row) => n + row.sum, 0);
      return count ? { value: sum / count, label: fmt(sum / count), count } : { value: null };
    }) })));
    legend('reading-gender-legend', genderSeries.map(({ name, color }) => ({ name, color })));
    createBarChart('reading-gender-chart', genderSeries, { categories: classNames, yLabel: 'Recorded composite score', tickStep: 50, description: 'Average recorded composite score by class, gender, and round' });
    table('reading-gender-table', ['Class', ...genderSeries.map((s) => s.name)], classNames.map((cls, i) => [cls, ...genderSeries.map((s) => s.values[i].value == null ? 'Missing' : `${s.values[i].label} (n=${s.values[i].count})`)]));
  }
  [roundFilter, classFilter, genderFilter].forEach((control) => control.addEventListener('change', render));
  render();
}());
