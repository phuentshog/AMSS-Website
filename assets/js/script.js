// ============================================================
// SPMS DATA — OFFICIAL DATA SOURCE
// Source: SPMS Excel workbooks, Sheet1
// Update this object only when official results are added.
// ============================================================
document.documentElement.classList.add("js");

const SPMS_DATA = {
  sources: ["SPMS Score.xlsx", "Academic Learning Score.xlsx", "Non Academic Score.xlsx"],
  years: [
    { year: 2022, classes: { VI: 17.01, VIII: 25.6, X: 24.8, Overall: 22.5 }, nonAcademic: 56.5, total: 79.0 },
    { year: 2023, classes: { VI: 23.42, VIII: 27.09, X: 27.6, Overall: 26.0 }, nonAcademic: 56.5, total: 83.0 },
    { year: 2024, classes: { VI: 33.98, VIII: 31.58, X: 27.2, Overall: 30.9 }, nonAcademic: 59.25, total: 90.2 },
    { year: 2025, classes: { VI: 37.46, VIII: 29.1, X: 37.03, Overall: 34.5 }, nonAcademic: 54.13, total: 88.6 },
  ],
};

const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");
const mobileNavigationMedia = window.matchMedia("(max-width: 1279px)");

function setMenuOpen(isOpen) {
  if (!menuToggle || !primaryNavigation) return;
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  primaryNavigation.classList.toggle("is-open", isOpen);
  primaryNavigation.setAttribute("aria-hidden", String(mobileNavigationMedia.matches && !isOpen));
  document.documentElement.classList.toggle("mobile-nav-open", mobileNavigationMedia.matches && isOpen);
}

setMenuOpen(false);
menuToggle?.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

document.addEventListener("click", (event) => {
  if (menuToggle?.getAttribute("aria-expanded") !== "true") return;
  if (primaryNavigation?.contains(event.target) || menuToggle?.contains(event.target)) return;
  setMenuOpen(false);
});

mobileNavigationMedia.addEventListener("change", () => setMenuOpen(false));

primaryNavigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (link.hasAttribute("aria-haspopup") && window.matchMedia("(max-width: 1279px)").matches) {
      event.preventDefault();
      return;
    }
    setMenuOpen(false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});

const year = document.querySelector("#current-year");
if (year) year.textContent = String(new Date().getFullYear());

const lightbox = document.querySelector(".lightbox");
const lightboxImage = lightbox?.querySelector("img");
const lightboxClose = lightbox?.querySelector(".lightbox-close");

document.querySelectorAll(".gallery-item").forEach((item) => {
  item.addEventListener("click", () => {
    if (!lightbox || !lightboxImage || typeof lightbox.showModal !== "function") return;
    const image = item.querySelector("img");
    const fullImage = item.getAttribute("data-full");
    if (!image || !fullImage) return;
    lightboxImage.src = fullImage;
    lightboxImage.alt = image.alt;
    lightbox.showModal();
  });
});

lightboxClose?.addEventListener("click", () => lightbox?.close());
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});
lightbox?.addEventListener("close", () => {
  if (lightboxImage) lightboxImage.removeAttribute("src");
});

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!(contactForm instanceof HTMLFormElement) || !contactForm.reportValidity()) return;

  const formData = new FormData(contactForm);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const recipient = contactForm.dataset.recipient;
  if (!recipient) {
    if (formStatus) formStatus.textContent = "Message delivery is not available yet. The school's official email address has not been provided.";
    return;
  }
  const subject = encodeURIComponent(`Website enquiry from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
  const mailto = `mailto:${recipient}?subject=${subject}&body=${body}`;

  if (formStatus) formStatus.textContent = "Your email app should open with your message ready to send.";
  window.location.href = mailto;
});

const initSPMS = () => {
  const root = document.querySelector('#spms-dashboard-root');
  const routeTabs = document.querySelector('#spms-route-tabs');
  if (!root || !routeTabs) return;

  const classNames = ['VI', 'VIII', 'X', 'Overall'];
  const seriesColors = {
    VI: '#14233f',
    VIII: '#7a263a',
    X: '#745414',
    Overall: '#c8993a',
    'Non-Academic': '#14233f',
    ALS: '#7a263a',
    Total: '#745414',
  };
  const dashboardDefinitions = {
    'spms-als': {
      title: 'Academic Learning Score',
      icon: 'A',
      subtitle: 'Academic Learning Scores across classes VI, VIII and X.',
      tabs: ['Overview', 'By Class', 'Data Table'],
    },
    'spms-non-academic': {
      title: 'Non-Academic Score',
      icon: 'N',
      subtitle: 'Whole-school non-academic results across recorded years.',
      tabs: ['Overview', 'Data Table'],
    },
    'spms-score': {
      title: 'School Performance Management System (SPMS) Score',
      icon: 'S',
      subtitle: 'Academic and non-academic contributions to the official SPMS total.',
      tabs: ['Overview', 'Composition', 'Data Table'],
    },
  };
  const states = Object.fromEntries(Object.keys(dashboardDefinitions).map((key) => [key, {
    tab: 'Overview',
    selectedClass: 'VI',
    rankingYear: SPMS_DATA.years.at(-1).year,
    hiddenSeries: {},
  }]));
  const latest = () => SPMS_DATA.years.at(-1);
  const previous = () => SPMS_DATA.years.at(-2);
  const first = () => SPMS_DATA.years[0];
  const fmt = (value, decimals = 2) => Number(value).toFixed(decimals);
  const short = (value) => Number(value.toFixed(2)).toString();
  const signed = (value, decimals = 2) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${fmt(Math.abs(value), decimals)}`;
  const delta = (current, before) => Number((current - before).toFixed(2));
  const calculatePercentage = (value, maximum) => value / maximum * 100;
  const maxBy = (records, valueFor) => records.reduce((best, record) => valueFor(record) > valueFor(best) ? record : best);
  const minBy = (records, valueFor) => records.reduce((best, record) => valueFor(record) < valueFor(best) ? record : best);
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const svgElement = (tag, attributes = {}, text) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const renderKPICards = (cards) => `<div class="spms-summary-grid" aria-label="Key performance indicators">${cards.map((card) => {
    const value = typeof card.value === 'number'
      ? `${card.signedValue && card.value > 0 ? '+' : card.signedValue && card.value < 0 ? '−' : ''}<span data-count-up="${card.signedValue ? Math.abs(card.value) : card.value}" data-decimals="${card.decimals ?? 2}">0</span>`
      : escapeHTML(card.value);
    const trend = typeof card.change === 'number'
      ? `<p class="spms-summary-change is-${card.change > 0 ? 'positive' : card.change < 0 ? 'negative' : 'neutral'}"><span aria-hidden="true">${card.change > 0 ? '↑' : card.change < 0 ? '↓' : '•'}</span> ${signed(card.change)}${card.changeLabel ? ` ${escapeHTML(card.changeLabel)}` : ''}</p>`
      : `<p class="spms-summary-change">${escapeHTML(card.detail || '')}</p>`;
    return `<article class="spms-summary-card"><h3 class="spms-summary-label">${escapeHTML(card.label)}</h3><p class="spms-summary-score">${value}${card.suffix ? `<span class="spms-summary-denominator">${escapeHTML(card.suffix)}</span>` : ''}</p>${trend}</article>`;
  }).join('')}</div>`;

  const renderChartCard = (title, subtitle, id, className = '') => `<article class="spms-chart-card ${className}" aria-labelledby="${id}-title"><div class="spms-card-heading"><div><p class="eyebrow">${escapeHTML(subtitle)}</p><h3 id="${id}-title">${escapeHTML(title)}</h3></div><p>Data: ${SPMS_DATA.years[0].year}–${latest().year}</p></div><div id="${id}" class="spms-chart-host"></div></article>`;

  const renderInsights = (items) => `<section class="spms-insights" aria-labelledby="spms-insights-title"><div class="spms-card-heading"><div><p class="eyebrow">From the results</p><h3 id="spms-insights-title">Key insights</h3></div></div><div class="spms-insight-grid" role="list">${items.map((item, index) => `<article class="spms-insight-card" role="listitem"><span class="spms-insight-number">${String(index + 1).padStart(2, '0')}</span><p>${escapeHTML(item)}</p></article>`).join('')}</div></section>`;

  const renderTable = (columns, rows, filename, caption) => {
    const csvRows = [columns.map((column) => column.label), ...rows.map((row) => row.map((cell) => cell.csv ?? cell.text))];
    const tableRows = rows.map((row) => `<tr>${row.map((cell, index) => `<${index === 0 ? 'th scope="row"' : 'td'}${cell.best ? ' class="spms-best-value" aria-label="Best score for this column"' : ''}>${escapeHTML(cell.text)}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('');
    return `<section class="spms-table-card"><div class="spms-card-heading"><div><p class="eyebrow">Verified results</p><h3>${escapeHTML(caption)}</h3></div><button type="button" class="button button-green spms-download" data-csv="${escapeHTML(JSON.stringify(csvRows))}" data-filename="${escapeHTML(filename)}">Download CSV</button></div><div class="spms-table-scroll" tabindex="0" role="region" aria-label="Scrollable ${escapeHTML(caption)} table"><table class="spms-table"><caption class="visually-hidden">${escapeHTML(caption)}</caption><thead><tr>${columns.map((column) => `<th scope="col">${escapeHTML(column.label)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></div></section>`;
  };

  const chartObservers = new WeakMap();
  const animatedCharts = new Set();
  const renderBarChart = ({ container, id, title, years, series, mode = 'grouped', yMax, yTitle, targetLine, averageLine, totals, underBarLabels, highlightIndex, hidden = new Set() }) => {
    if (!container) return;
    const compact = window.matchMedia('(max-width: 600px)').matches;
    const width = 760;
    const height = 410;
    const margin = { left: 58, right: 24, top: 32, bottom: underBarLabels ? 87 : 56 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const bottom = margin.top + plotHeight;
    const activeSeries = series.filter((item) => !hidden.has(item.name));
    const safeSeries = activeSeries;
    const svg = svgElement('svg', {
      class: 'spms-svg',
      viewBox: `0 0 ${width} ${height}`,
      role: 'group',
      'aria-roledescription': 'chart',
      'aria-label': title,
      preserveAspectRatio: 'xMidYMid meet',
    });
    const tooltip = document.createElement('div');
    tooltip.className = 'spms-tooltip';
    tooltip.hidden = true;
    tooltip.setAttribute('role', 'status');
    tooltip.setAttribute('aria-live', 'polite');
    const yFor = (value) => bottom - Math.max(0, Math.min(value, yMax)) / yMax * plotHeight;
    const steps = yMax <= 40 ? 4 : yMax <= 60 ? 4 : 5;
    for (let index = 0; index <= steps; index += 1) {
      const value = yMax * index / steps;
      const y = yFor(value);
      svg.append(svgElement('line', { x1: margin.left, y1: y, x2: width - margin.right, y2: y, class: 'spms-grid-line' }));
      svg.append(svgElement('text', { x: margin.left - 9, y: y + 4, 'text-anchor': 'end', class: 'spms-axis-label' }, fmt(value, Number.isInteger(value) ? 0 : 2)));
    }
    svg.append(svgElement('line', { x1: margin.left, y1: margin.top, x2: margin.left, y2: bottom, class: 'spms-axis-line' }));
    if (yTitle) svg.append(svgElement('text', { x: 15, y: margin.top + plotHeight / 2, transform: `rotate(-90 15 ${margin.top + plotHeight / 2})`, 'text-anchor': 'middle', class: 'spms-axis-title' }, yTitle));

    const drawReference = (reference, className, label) => {
      if (typeof reference !== 'number') return;
      const y = yFor(reference);
      svg.append(svgElement('line', { x1: margin.left, y1: y, x2: width - margin.right, y2: y, class: `spms-reference-line ${className}` }));
      svg.append(svgElement('text', { x: width - margin.right - 2, y: y - 6, 'text-anchor': 'end', class: 'spms-reference-label' }, `${label}: ${fmt(reference)}`));
    };
    drawReference(targetLine, 'spms-target-line', 'Target');
    drawReference(averageLine, 'spms-average-line', 'Average');

    const categoryStep = plotWidth / years.length;
    if (!safeSeries.length) svg.append(svgElement('text', { x: width / 2, y: margin.top + plotHeight / 2, 'text-anchor': 'middle', class: 'spms-axis-label' }, 'Select a series in the legend to display it.'));
    years.forEach((yearEntry, categoryIndex) => {
      const center = margin.left + categoryStep * (categoryIndex + 0.5);
      svg.append(svgElement('text', { x: center, y: bottom + 24, 'text-anchor': 'middle', class: 'spms-axis-label' }, String(yearEntry.year)));
      if (mode === 'stacked') {
        let accumulated = 0;
        safeSeries.forEach((item, seriesIndex) => {
          const value = Number(item.values[categoryIndex]);
          const barWidth = compact ? 56 : Math.min(78, categoryStep * 0.48);
          const top = yFor(accumulated + value);
          const segmentHeight = yFor(accumulated) - top;
          const group = svgElement('g', { class: 'spms-series spms-animated-bar', 'data-series': item.name });
          const rect = svgElement('rect', { x: center - barWidth / 2, y: top, width: barWidth, height: segmentHeight, rx: 2, fill: item.color, tabindex: 0, role: 'img', 'aria-label': `${item.name}, ${yearEntry.year}: ${fmt(value)}`, 'data-tooltip': `${item.name} · ${yearEntry.year}: ${fmt(value)}` });
          const nativeTitle = svgElement('title', {}, `${item.name} · ${yearEntry.year}: ${fmt(value)}`);
          rect.append(nativeTitle);
          group.append(rect);
          if (segmentHeight > 21) group.append(svgElement('text', { x: center, y: top + segmentHeight / 2 + 4, 'text-anchor': 'middle', class: 'spms-segment-label' }, fmt(value)));
          svg.append(group);
          accumulated += value;
        });
        if (safeSeries.length) {
          const totalValue = totals ? totals[categoryIndex] : accumulated;
          svg.append(svgElement('text', { x: center, y: yFor(totalValue) - 9, 'text-anchor': 'middle', class: 'spms-value-label' }, fmt(totalValue, 1)));
        }
      } else {
        const groupWidth = categoryStep * (compact ? 0.82 : 0.72);
        const barGap = safeSeries.length > 1 ? (compact ? 3 : 6) : 0;
        const barWidth = Math.min(compact ? 32 : 44, (groupWidth - (safeSeries.length - 1) * barGap) / safeSeries.length);
        safeSeries.forEach((item, seriesIndex) => {
          const value = Number(item.values[categoryIndex]);
          const totalGroupWidth = safeSeries.length * barWidth + (safeSeries.length - 1) * barGap;
          const x = center - totalGroupWidth / 2 + seriesIndex * (barWidth + barGap);
          const top = yFor(value);
          const group = svgElement('g', { class: 'spms-series spms-animated-bar', 'data-series': item.name });
          const barColor = highlightIndex === categoryIndex ? 'var(--color-gold)' : item.color;
          const rect = svgElement('rect', { x, y: top, width: barWidth, height: bottom - top, rx: 2, fill: barColor, tabindex: 0, role: 'img', 'aria-label': `${item.name}, ${yearEntry.year}: ${fmt(value)}`, 'data-tooltip': `${item.name} · ${yearEntry.year}: ${fmt(value)}` });
          rect.append(svgElement('title', {}, `${item.name} · ${yearEntry.year}: ${fmt(value)}`));
          group.append(rect);
          const labelX = x + barWidth / 2;
          group.append(svgElement('text', { x: labelX, y: Math.max(margin.top + 12, top - 7), 'text-anchor': 'middle', class: 'spms-value-label' }, fmt(value)));
          svg.append(group);
        });
      }
      if (underBarLabels && underBarLabels[categoryIndex] !== undefined) {
        svg.append(svgElement('text', { x: center, y: bottom + 48, 'text-anchor': 'middle', class: 'spms-change-label' }, underBarLabels[categoryIndex]));
      }
    });

    const legend = document.createElement('div');
    legend.className = 'spms-legend';
    legend.setAttribute('aria-label', 'Chart series. Activate a series to show or hide it.');
    series.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `spms-legend-button${hidden.has(item.name) ? ' is-hidden' : ''}`;
      button.dataset.series = item.name;
      button.setAttribute('aria-pressed', String(!hidden.has(item.name)));
      button.innerHTML = `<i class="spms-legend-swatch" style="--series-color:${item.color}" aria-hidden="true"></i>${escapeHTML(item.name)}`;
      button.addEventListener('click', () => {
        if (hidden.has(item.name)) hidden.delete(item.name);
        else hidden.add(item.name);
        renderBarChart({ container, id, title, years, series, mode, yMax, yTitle, targetLine, averageLine, totals, underBarLabels, highlightIndex, hidden });
        container.querySelectorAll('.spms-legend-button').forEach((legendButton) => {
          if (legendButton.dataset.series === item.name) legendButton.focus();
        });
      });
      legend.append(button);
    });
    const chartScroll = document.createElement('div');
    chartScroll.className = 'spms-chart-scroll';
    chartScroll.append(svg);
    container.replaceChildren(legend, chartScroll, tooltip);
    const showTooltip = (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-tooltip]') : null;
      if (!target) return;
      tooltip.textContent = target.getAttribute('data-tooltip');
      tooltip.hidden = false;
    };
    svg.addEventListener('pointerover', showTooltip);
    svg.addEventListener('focusin', showTooltip);
    svg.addEventListener('click', showTooltip);
    svg.addEventListener('pointerout', (event) => {
      if (event.pointerType === 'touch') return;
      if (event.target instanceof Element && event.target.closest('[data-tooltip]') && !(event.relatedTarget instanceof Element && event.relatedTarget.closest('[data-tooltip]'))) tooltip.hidden = true;
    });
    svg.addEventListener('focusout', () => { tooltip.hidden = true; });
    if (animatedCharts.has(id)) {
      svg.classList.add('is-chart-settled');
      return;
    }
    if (!('IntersectionObserver' in window)) {
      animatedCharts.add(id);
      svg.classList.add('is-chart-visible');
      return;
    }
    chartObservers.get(container)?.disconnect();
    const observer = new IntersectionObserver((entries, currentObserver) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      animatedCharts.add(id);
      svg.classList.add('is-chart-visible');
      currentObserver.disconnect();
    }, { threshold: 0.12 });
    chartObservers.set(container, observer);
    observer.observe(svg);
  };

  const renderKPICountups = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startCount = (element) => {
      if (element.dataset.countStarted) return;
      element.dataset.countStarted = 'true';
      const target = Number(element.dataset.countUp);
      const decimals = Number(element.dataset.decimals || 2);
      if (reduceMotion) {
        element.textContent = fmt(target, decimals);
        return;
      }
      const started = performance.now();
      const frame = (now) => {
        const progress = Math.min((now - started) / 600, 1);
        element.textContent = fmt(target * (1 - (1 - progress) ** 3), decimals);
        if (progress < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    const cards = root.querySelectorAll('[data-count-up]');
    if (!('IntersectionObserver' in window)) {
      cards.forEach(startCount);
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      startCount(entry.target);
      currentObserver.unobserve(entry.target);
    }), { threshold: 0.1 });
    cards.forEach((card) => observer.observe(card));
  };

  const downloadCSV = (rows, filename) => {
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const getALSInsights = () => {
    const data = SPMS_DATA.years;
    const improvements = classNames.slice(0, 3).map((name) => ({ name, value: delta(latest().classes[name], first().classes[name]) }));
    const strongest = maxBy(improvements, (item) => item.value);
    const declines = classNames.slice(0, 3).map((name) => ({ name, value: delta(latest().classes[name], previous().classes[name]) })).filter((item) => item.value < 0);
    const highestOverall = maxBy(data, (item) => item.classes.Overall);
    return [
      `Class ${strongest.name} made the largest improvement from ${first().year} to ${latest().year}, increasing by ${short(strongest.value)} points.`,
      declines.length ? `Class ${declines.map((item) => item.name).join(' and ')} declined in ${latest().year} compared with ${previous().year}.` : `All class scores increased in ${latest().year} compared with ${previous().year}.`,
      `The highest Overall ALS was ${fmt(highestOverall.classes.Overall)} in ${highestOverall.year}.`,
      `Overall ALS changed by ${signed(delta(latest().classes.Overall, first().classes.Overall))} points from ${first().year} to ${latest().year}.`,
    ];
  };

  const getNonAcademicInsights = () => {
    const data = SPMS_DATA.years;
    const best = maxBy(data, (item) => item.nonAcademic);
    const lowest = minBy(data, (item) => item.nonAcademic);
    const changes = data.slice(1).map((item, index) => ({ from: data[index], to: item, change: delta(item.nonAcademic, data[index].nonAcademic) }));
    const largestIncrease = maxBy(changes, (item) => item.change);
    const largestDecrease = minBy(changes, (item) => item.change);
    const average = data.reduce((sum, item) => sum + item.nonAcademic, 0) / data.length;
    return [
      `The best year was ${best.year}, with ${fmt(best.nonAcademic)} out of 60.`,
      `The lowest result was ${fmt(lowest.nonAcademic)} in ${lowest.year}.`,
      `The largest year-over-year increase was ${signed(largestIncrease.change)} points (${largestIncrease.from.year}–${largestIncrease.to.year}); the largest decrease was ${signed(largestDecrease.change)} points (${largestDecrease.from.year}–${largestDecrease.to.year}).`,
      `The four-year average is ${fmt(average)}; the score changed by ${signed(delta(latest().nonAcademic, first().nonAcademic))} points from ${first().year} to ${latest().year}.`,
    ];
  };

  const getSPMSInsights = () => {
    const totalChange = delta(latest().total, previous().total);
    const nonAcademicChange = delta(latest().nonAcademic, previous().nonAcademic);
    const alsChange = delta(latest().classes.Overall, previous().classes.Overall);
    const offset = alsChange + nonAcademicChange;
    const best = maxBy(SPMS_DATA.years, (item) => item.total);
    return [
      totalChange < 0 ? `The SPMS total decreased by ${short(Math.abs(totalChange))} points in ${latest().year} compared with ${previous().year}.` : `The SPMS total increased by ${short(totalChange)} points in ${latest().year} compared with ${previous().year}.`,
      `The Non-Academic Score changed by ${signed(nonAcademicChange)} points, while Overall ALS changed by ${signed(alsChange)} points.`,
      offset < 0 ? `The ALS increase did not fully offset the Non-Academic decrease; the two component changes combine to ${signed(offset)} points.` : `The ALS change offset the Non-Academic movement, for a combined component change of ${signed(offset)} points.`,
      `The highest official SPMS total was ${fmt(best.total, 1)} in ${best.year}; recorded workbook totals are used where displayed components round differently.`,
    ];
  };

  const renderProgressBars = () => {
    const average = SPMS_DATA.years.reduce((sum, entry) => sum + entry.nonAcademic, 0) / SPMS_DATA.years.length;
    return `<section class="spms-progress-card"><div class="spms-card-heading"><div><p class="eyebrow">Relative performance</p><h3>Percentage of 60</h3></div><p>Dashed marker indicates the four-year average.</p></div><div class="spms-progress-list">${SPMS_DATA.years.map((entry) => `<div class="spms-progress-row"><span>${entry.year}</span><div class="spms-progress-track" role="img" aria-label="${entry.year}: ${fmt(calculatePercentage(entry.nonAcademic, 60))} percent of 60"><span style="width:${calculatePercentage(entry.nonAcademic, 60)}%;--progress-color:${entry === maxBy(SPMS_DATA.years, (item) => item.nonAcademic) ? 'var(--color-gold)' : 'var(--color-primary)'}"></span><i style="left:${calculatePercentage(average, 60)}%" aria-hidden="true"></i></div><strong>${fmt(calculatePercentage(entry.nonAcademic, 60))}%</strong></div>`).join('')}</div></section>`;
  };

  const renderContributionBars = () => `<section class="spms-progress-card"><div class="spms-card-heading"><div><p class="eyebrow">Score composition</p><h3>Contribution to the official SPMS total</h3></div></div><div class="spms-progress-list">${SPMS_DATA.years.map((entry) => `<div class="spms-contribution-row"><strong>${entry.year}</strong><span>Non-Academic: ${fmt(calculatePercentage(entry.nonAcademic, entry.total))}%</span><span>ALS: ${fmt(calculatePercentage(entry.classes.Overall, entry.total))}%</span></div>`).join('')}</div></section>`;

  const buildDashboardContent = (route, tab) => {
    const data = SPMS_DATA.years;
    const last = latest();
    const before = previous();
    const state = states[route];
    if (route === 'spms-als') {
      if (tab === 'Overview') {
        const cards = classNames.map((name) => ({ label: name === 'Overall' ? 'Overall' : `Class ${name}`, value: last.classes[name], suffix: '/ 40', decimals: 2, change: delta(last.classes[name], before.classes[name]), changeLabel: `points from ${before.year}` }));
        return `${renderKPICards(cards)}<div class="spms-charts">${renderChartCard('Score by Year (All Classes)', 'Academic learning · score out of 40', 'als-overview-chart')}</div>${renderInsights(getALSInsights())}`;
      }
      if (tab === 'By Class') {
        const name = state.selectedClass;
        const labels = data.map((entry, index) => index === 0 ? '—' : signed(delta(entry.classes[name], data[index - 1].classes[name])));
        const classButtons = classNames.map((item) => `<button type="button" class="spms-pill${item === name ? ' is-active' : ''}" data-class-select="${item}" aria-pressed="${item === name}">${item}</button>`).join('');
        const years = data.map((entry) => `<option value="${entry.year}"${entry.year === state.rankingYear ? ' selected' : ''}>${entry.year}</option>`).join('');
        return `<div class="spms-selection-row"><div class="spms-pill-group" role="group" aria-label="Select class">${classButtons}</div><p>Year-over-year change is shown beneath each bar.</p></div><div class="spms-charts">${renderChartCard(`Class ${name} ALS by Year`, 'Academic learning · target 40', 'als-class-chart')}<article class="spms-chart-card"><div class="spms-card-heading"><div><p class="eyebrow">Class comparison</p><h3>Ranking by Year</h3></div><label class="spms-year-select-label">Select year <select id="spms-ranking-year">${years}</select></label></div><div id="als-ranking-chart" class="spms-chart-host"></div></article></div><p class="spms-chart-note">Values below the bars show change from the previous recorded year.</p>`;
      }
      const columns = [{ label: 'Class' }, ...data.map((entry) => ({ label: String(entry.year) }))];
      const maxForYear = data.map((entry) => Math.max(...classNames.map((name) => entry.classes[name])));
      const rows = classNames.map((name) => [{ text: name }, ...data.map((entry, index) => ({ text: fmt(entry.classes[name]), csv: entry.classes[name], best: entry.classes[name] === maxForYear[index] }))]);
      return renderTable(columns, rows, 'amss-academic-learning-score.csv', 'Academic Learning Score by class and year');
    }
    if (route === 'spms-non-academic') {
      if (tab === 'Overview') {
        const best = maxBy(data, (entry) => entry.nonAcademic);
        const average = data.reduce((sum, entry) => sum + entry.nonAcademic, 0) / data.length;
        const changes = data.slice(1).map((entry, index) => delta(entry.nonAcademic, data[index].nonAcademic));
        const columns = [{ name: 'Non-Academic', color: seriesColors['Non-Academic'], values: data.map((entry) => entry.nonAcademic) }];
        const latestDelta = delta(last.nonAcademic, before.nonAcademic);
        const cards = [
          { label: `Latest · ${last.year}`, value: last.nonAcademic, suffix: '/ 60', decimals: 2, change: latestDelta, changeLabel: `from ${before.year}` },
          { label: 'Best Year', value: `${best.year} — ${fmt(best.nonAcademic)}`, detail: 'Highest recorded result' },
          { label: 'Four-year Average', value: average, suffix: '/ 60', decimals: 2, detail: `Across ${data.length} recorded years` },
        ];
        return `${renderKPICards(cards)}<div class="spms-charts">${renderChartCard('Score by Year', 'Non-academic · score out of 60', 'nonacademic-chart')}</div>${renderProgressBars()}${renderInsights(getNonAcademicInsights())}`;
      }
      const average = data.reduce((sum, entry) => sum + entry.nonAcademic, 0) / data.length;
      const best = maxBy(data, (entry) => entry.nonAcademic);
      const columns = [{ label: 'Year' }, { label: 'Score (60)' }, { label: '% of 60' }, { label: 'Change vs Previous Year' }];
      const rows = data.map((entry, index) => [{ text: String(entry.year) }, { text: fmt(entry.nonAcademic), csv: entry.nonAcademic, best: entry === best }, { text: `${fmt(calculatePercentage(entry.nonAcademic, 60))}%`, csv: Number(calculatePercentage(entry.nonAcademic, 60).toFixed(2)) }, { text: index === 0 ? '—' : signed(changesForNonAcademic(data, index)), csv: index === 0 ? '' : changesForNonAcademic(data, index) }]);
      return renderTable(columns, rows, 'amss-non-academic-score.csv', 'Non-Academic Score by year');
    }
    if (route === 'spms-score') {
      if (tab === 'Overview') {
        const best = maxBy(data, (entry) => entry.total);
        const overallChange = delta(last.total, first().total);
        const cards = [
          { label: 'Latest Year', value: String(last.year), detail: 'Most recent official record' },
          { label: `Latest Total · ${last.year}`, value: last.total, suffix: '/ 100', decimals: 1, change: delta(last.total, before.total), changeLabel: `from ${before.year}` },
          { label: 'Best Year', value: `${best.year} — ${fmt(best.total, 1)}`, detail: 'Highest official total' },
          { label: 'Four-year Change', value: overallChange, suffix: 'points', decimals: 1, signedValue: true, detail: `${first().year} to ${last.year}` },
        ];
        return `${renderKPICards(cards)}<div class="spms-charts">${renderChartCard('SPMS Score by Year', 'Score components · common scale 0–100', 'spms-grouped-chart')}</div>${renderInsights(getSPMSInsights())}`;
      }
      if (tab === 'Composition') return `<div class="spms-charts">${renderChartCard('SPMS Score Composition', 'Stacked official score components', 'spms-composition-chart')}</div>${renderContributionBars()}`;
      const columns = [{ label: 'Year' }, { label: 'Non-Academic (60)' }, { label: 'ALS Overall (40)' }, { label: 'Total (100)' }, { label: 'Change in Total' }];
      const best = maxBy(data, (entry) => entry.total);
      const rows = data.map((entry, index) => [{ text: String(entry.year) }, { text: fmt(entry.nonAcademic), csv: entry.nonAcademic }, { text: fmt(entry.classes.Overall), csv: entry.classes.Overall }, { text: fmt(entry.total, 1), csv: entry.total, best: entry === best }, { text: index === 0 ? '—' : signed(delta(entry.total, data[index - 1].total), 1), csv: index === 0 ? '' : delta(entry.total, data[index - 1].total) }]);
      return renderTable(columns, rows, 'amss-spms-score.csv', 'SPMS score by year');
    }
    return '';
  };

  const changesForNonAcademic = (data, index) => delta(data[index].nonAcademic, data[index - 1].nonAcademic);

  const drawCurrentCharts = (route) => {
    const state = states[route];
    const data = SPMS_DATA.years;
    const chartConfig = (id, chartTitle, years, series, mode, yMax, options = {}) => renderBarChart({
      container: root.querySelector(`#${id}`),
      id,
      title: chartTitle,
      years,
      series,
      mode,
      yMax,
      yTitle: options.yTitle || 'Score',
      targetLine: options.targetLine,
      averageLine: options.averageLine,
      totals: options.totals,
      underBarLabels: options.underBarLabels,
      highlightIndex: options.highlightIndex,
      hidden: state.hiddenSeries[id] || (state.hiddenSeries[id] = new Set()),
    });

    if (route === 'spms-als' && state.tab === 'Overview') {
      chartConfig('als-overview-chart', 'Academic Learning Score by year for all classes', data.map((entry) => ({ year: entry.year })), classNames.map((name) => ({ name, color: seriesColors[name], values: data.map((entry) => entry.classes[name]) })), 'grouped', 40, { yTitle: 'Score (0–40)' });
    } else if (route === 'spms-als' && state.tab === 'By Class') {
      const className = state.selectedClass;
      chartConfig('als-class-chart', `Class ${className} Academic Learning Score by year`, data.map((entry) => ({ year: entry.year })), [{ name: className, color: seriesColors[className], values: data.map((entry) => entry.classes[className]) }], 'single', 40, { yTitle: 'Score (0–40)', targetLine: 40, underBarLabels: data.map((entry, index) => index === 0 ? '—' : signed(delta(entry.classes[className], data[index - 1].classes[className]))) });
      const rankYear = Number(state.rankingYear);
      const rankRecord = data.find((entry) => entry.year === rankYear) || latest();
      chartConfig('als-ranking-chart', `Class scores for ${rankRecord.year}`, [{ year: rankRecord.year }], classNames.map((name) => ({ name, color: seriesColors[name], values: [rankRecord.classes[name]] })), 'grouped', 40, { yTitle: 'Score (0–40)' });
    } else if (route === 'spms-non-academic' && state.tab === 'Overview') {
      const average = data.reduce((sum, entry) => sum + entry.nonAcademic, 0) / data.length;
      const best = maxBy(data, (entry) => entry.nonAcademic);
      chartConfig('nonacademic-chart', 'Non-Academic Score by year', data.map((entry) => ({ year: entry.year })), [{ name: 'Non-Academic', color: seriesColors['Non-Academic'], values: data.map((entry) => entry.nonAcademic) }], 'single', 60, { yTitle: 'Score (0–60)', averageLine: average, highlightIndex: data.indexOf(best) });
    } else if (route === 'spms-score' && state.tab === 'Overview') {
      chartConfig('spms-grouped-chart', 'Non-Academic, ALS and Total scores by year on a 0–100 scale', data.map((entry) => ({ year: entry.year })), [
        { name: 'Non-Academic', color: seriesColors['Non-Academic'], values: data.map((entry) => entry.nonAcademic) },
        { name: 'ALS', color: seriesColors.ALS, values: data.map((entry) => entry.classes.Overall) },
        { name: 'Total', color: seriesColors.Total, values: data.map((entry) => entry.total) },
      ], 'grouped', 100, { yTitle: 'Score (0–100)' });
    } else if (route === 'spms-score' && state.tab === 'Composition') {
      chartConfig('spms-composition-chart', 'Official SPMS components stacked by year', data.map((entry) => ({ year: entry.year })), [
        { name: 'Non-Academic', color: seriesColors['Non-Academic'], values: data.map((entry) => entry.nonAcademic) },
        { name: 'ALS', color: seriesColors.ALS, values: data.map((entry) => entry.classes.Overall) },
      ], 'stacked', 100, { yTitle: 'Score (0–100)', totals: data.map((entry) => entry.total) });
    }
  };

  const renderDashboard = (route, focusSelector) => {
    const definition = dashboardDefinitions[route] || dashboardDefinitions['spms-score'];
    const state = states[route] || states['spms-score'];
    const tab = definition.tabs.includes(state.tab) ? state.tab : definition.tabs[0];
    state.tab = tab;
    const tabMarkup = definition.tabs.map((name) => `<button type="button" role="tab" id="spms-inner-tab-${name.toLowerCase().replace(/\s+/g, '-')}" aria-selected="${name === tab}" aria-controls="spms-panel" class="spms-inner-tab${name === tab ? ' is-active' : ''}" data-inner-tab="${escapeHTML(name)}">${escapeHTML(name)}</button>`).join('');
    root.innerHTML = `<header class="spms-dashboard-banner"><span class="spms-dashboard-icon" aria-hidden="true">${escapeHTML(definition.icon)}</span><div><p class="eyebrow">School performance</p><h2>${escapeHTML(definition.title)}</h2><p>${escapeHTML(definition.subtitle)}</p></div><span class="spms-data-range">Data: ${SPMS_DATA.years[0].year}–${latest().year}</span></header><div class="spms-dashboard-tools"><div class="spms-inner-tabs" role="tablist" aria-label="${escapeHTML(definition.title)} sections">${tabMarkup}</div><button type="button" class="button button-green spms-print">Print</button></div><section id="spms-panel" class="spms-dashboard-panel" role="tabpanel" aria-labelledby="spms-inner-tab-${tab.toLowerCase().replace(/\s+/g, '-')}">${buildDashboardContent(route, tab)}</section>`;
    routeTabs.querySelectorAll('[data-spms-route]').forEach((link) => {
      const active = link.dataset.spmsRoute === route;
      link.setAttribute('aria-selected', String(active));
      link.setAttribute('aria-current', active ? 'page' : 'false');
      link.classList.toggle('is-active', active);
      link.tabIndex = active ? 0 : -1;
    });
    const navGroup = document.querySelector('.nav-dropdown[data-nav-group="spms"]');
    if (navGroup) {
      navGroup.classList.add('is-current');
      const navLink = navGroup.querySelector(':scope > a[aria-haspopup="true"]');
      navLink?.removeAttribute('aria-current');
      const submenuLink = document.querySelector(`.spms-nav-menu a[href$="#${route}"]`);
      document.querySelectorAll('.spms-nav-menu a').forEach((link) => {
        if (link === submenuLink) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }
    drawCurrentCharts(route);
    renderKPICountups();
    if (focusSelector) root.querySelector(focusSelector)?.focus();
  };

  const currentRoute = () => dashboardDefinitions[window.location.hash.slice(1)] ? window.location.hash.slice(1) : 'spms-score';
  const handleSPMSRoute = () => renderDashboard(currentRoute());
  const setupSPMSTabs = () => {
    root.addEventListener('click', (event) => {
      const tabButton = event.target.closest('[data-inner-tab]');
      if (tabButton) {
        const route = currentRoute();
        states[route].tab = tabButton.dataset.innerTab;
        renderDashboard(route, `[data-inner-tab="${tabButton.dataset.innerTab}"]`);
        return;
      }
      const classButton = event.target.closest('[data-class-select]');
      if (classButton) {
        const route = currentRoute();
        states[route].selectedClass = classButton.dataset.classSelect;
        renderDashboard(route, `[data-class-select="${classButton.dataset.classSelect}"]`);
        return;
      }
      const downloadButton = event.target.closest('[data-csv]');
      if (downloadButton) {
        downloadCSV(JSON.parse(downloadButton.dataset.csv), downloadButton.dataset.filename);
        return;
      }
      if (event.target.closest('.spms-print')) window.print();
    });
    root.addEventListener('change', (event) => {
      if (event.target.id !== 'spms-ranking-year') return;
      const route = currentRoute();
      states[route].rankingYear = Number(event.target.value);
      renderDashboard(route, '#spms-ranking-year');
    });
    root.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tab = event.target.closest('[data-inner-tab]');
      if (!tab) return;
      const tabs = [...root.querySelectorAll('[data-inner-tab]')];
      const index = tabs.indexOf(tab);
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
    routeTabs.addEventListener('click', (event) => {
      const routeLink = event.target.closest('[data-spms-route]');
      if (!routeLink) return;
      if (routeLink.dataset.spmsRoute === currentRoute()) {
        event.preventDefault();
        routeTabs.querySelectorAll('[data-spms-route]').forEach((link) => { link.tabIndex = link === routeLink ? 0 : -1; });
      }
    });
    routeTabs.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...routeTabs.querySelectorAll('[data-spms-route]')];
      const currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex < 0) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (currentIndex + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    });
  };

  setupSPMSTabs();
  window.addEventListener('hashchange', handleSPMSRoute);
  handleSPMSRoute();
};

const setupSPMSNavigation = () => {
  const dropdowns = [...document.querySelectorAll('.nav-dropdown')];
  if (!dropdowns.length) return;
  const closeDropdown = (dropdown) => {
    dropdown.classList.remove('is-open');
    dropdown.querySelector(':scope > a[aria-haspopup="true"]')?.setAttribute('aria-expanded', 'false');
  };
  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(':scope > a[aria-haspopup="true"]');
    if (!trigger) return;
    trigger.addEventListener('click', (event) => {
      if (!window.matchMedia('(max-width: 1279px)').matches) return;
      event.preventDefault();
      const willOpen = !dropdown.classList.contains('is-open');
      dropdowns.forEach(closeDropdown);
      if (willOpen) {
        dropdown.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
    trigger.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      dropdown.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      dropdown.querySelector('.spms-nav-menu a')?.focus();
    });
    dropdown.addEventListener('focusin', () => trigger.setAttribute('aria-expanded', 'true'));
    dropdown.addEventListener('focusout', (event) => {
      if (event.relatedTarget instanceof Node && dropdown.contains(event.relatedTarget)) return;
      closeDropdown(dropdown);
    });
    dropdown.addEventListener('pointerenter', () => trigger.setAttribute('aria-expanded', 'true'));
    dropdown.addEventListener('pointerleave', () => {
      if (!dropdown.contains(document.activeElement)) closeDropdown(dropdown);
    });
  });
  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('.nav-dropdown')) return;
    dropdowns.forEach(closeDropdown);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    dropdowns.forEach(closeDropdown);
  });
};

setupSPMSNavigation();
initSPMS();

(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  let framePending = false;
  let previousScrolledState = null;

  const updateHeader = () => {
    const isScrolled = window.scrollY > 80;
    header.classList.toggle("is-scrolled", isScrolled);
    if (isScrolled !== previousScrolledState) {
      previousScrolledState = isScrolled;
      document.dispatchEvent(new CustomEvent("siteheaderstatechange", { detail: { isScrolled } }));
    }
    framePending = false;
  };

  window.addEventListener("scroll", () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateHeader);
  }, { passive: true });

  updateHeader();
})();

(() => {
  const form = document.querySelector("#site-search-form");
  const input = document.querySelector("#site-search-input");
  const results = document.querySelector("#site-search-results");
  if (!form || !input || !results) return;

  // Add verified pages and sections here; confirm each URL or #section ID in its HTML first.
  const SEARCH_INDEX = [
    { title: "Home", description: "Visit the Arekha Middle Secondary School homepage and its main information sections.", url: "index.html#home", category: "School", keywords: "welcome school homepage AREKHA Bongo Chhukha Bhutan" },
    { title: "School Overview", description: "Learn about the school community, location, school code and establishment.", url: "about.html#about", category: "School", keywords: "about overview school information established 2004 principal head teacher" },
    { title: "Vision and Mission", description: "Read the school’s vision, mission and guiding principles.", url: "about.html#school-purpose-title", category: "School", keywords: "vision mission purpose values learning" },
    { title: "School History and Leadership", description: "Explore the school’s history, development and principal leadership milestones.", url: "about.html#school-history-title", category: "School", keywords: "history principal head teacher leadership school established upgrade" },
    { title: "Academics", description: "Visit the Academics page for curriculum and learning programme information.", url: "academics.html#academics", category: "Academics", keywords: "academic academics curriculum class classes subjects teachers teaching learning" },
    { title: "Classes and Curriculum Information", description: "The school’s class, subject and curriculum details are pending confirmation; check the Academics page for updates.", url: "academics.html#academics", category: "Academics", keywords: "classes class levels subjects curriculum academic teacher" },
    { title: "School Staff Directory", description: "Browse the public staff organogram by team, department or staff category.", url: "staff.html#staff", category: "School", keywords: "staff directory teacher teachers personnel principal head teacher department colleagues support staff" },
    { title: "Support Staff", description: "Find support staff in the school’s public staff organogram.", url: "staff.html#staff", category: "School", keywords: "support staff administration library lab assistant personnel" },
    { title: "Staff Login", description: "Open the existing staff sign-in service.", url: "https://script.google.com/macros/s/AKfycbyWT45vrEIq45Shr7ousl-aVrGkcAtdype_AmMBymubvLYVgZ74HlWOHGOYPUMm_52R8Q/exec", category: "Staff", keywords: "staff login sign in portal services" },
    { title: "Teaching Resources", description: "Visit Resources for school and family information; official documents are not yet published.", url: "resources.html#resources", category: "Academics", keywords: "teaching resources learning materials lesson plans worksheets documents policies student family" },
    { title: "Resources for Families", description: "Browse the Resources page for family guidance and student information updates.", url: "resources.html#resources", category: "School", keywords: "resources families information frequently asked questions FAQ" },
    { title: "High Stake Examination Results", description: "View the school’s examination results dashboard and recorded class outcomes.", url: "examination-results.html#exam-results-app", category: "Examinations", keywords: "exam examination high stake result results score class classes CE BCSE" },
    { title: "Class VI Examination Results", description: "Open the high stake results dashboard for the CE VI class results.", url: "examination-results.html#exam-results-app", category: "Examinations", keywords: "class vi six CE VI results result examination" },
    { title: "Class VIII Examination Results", description: "Open the high stake results dashboard for the CE VIII class results.", url: "examination-results.html#exam-results-app", category: "Examinations", keywords: "class viii eight CE VIII results result examination" },
    { title: "Class X Examination Results", description: "Open the high stake results dashboard for BCSE X class results.", url: "examination-results.html#exam-results-app", category: "Examinations", keywords: "class x ten BCSE X results result examination" },
    { title: "Subject Toppers", description: "See the published subject topper records by class and year.", url: "examination-toppers.html#exam-toppers-app", category: "Examinations", keywords: "topper toppers achievement results subjects class" },
    { title: "Class X Subject Toppers", description: "Browse the published Class X subject topper records.", url: "examination-toppers.html#exam-toppers-app", category: "Examinations", keywords: "class x ten subject toppers highest marks" },
    { title: "Past Question Papers", description: "Search the question paper catalogue by class, subject, examination and year.", url: "past-question-papers.html#papers-app", category: "Examinations", keywords: "past question paper papers exam examination class subject year question bank" },
    { title: "Class X Past Papers", description: "Find Class X papers in the question paper catalogue.", url: "past-question-papers.html#papers-filters", category: "Examinations", keywords: "class x ten past question paper papers exam" },
    { title: "SPMS", description: "Review School Performance Management System results from 2022 to 2025.", url: "spms.html#spms", category: "Academics", keywords: "SPMS score school performance management system results" },
    { title: "Academic Learning Score (ALS)", description: "Open the Academic Learning Score dashboard within SPMS.", url: "spms.html#spms-als", category: "Academics", keywords: "ALS academic learning score SPMS results" },
    { title: "Non-Academic Score", description: "Open the Non-Academic Score dashboard within SPMS.", url: "spms.html#spms-non-academic", category: "Academics", keywords: "non academic score SPMS results" },
    { title: "SPMS Score", description: "Open the overall SPMS score dashboard.", url: "spms.html#spms-score", category: "Academics", keywords: "SPMS overall score school performance results" },
    { title: "News and Announcements", description: "Read published school news, announcements and updates.", url: "news.html#news", category: "Campus Life", keywords: "news announcement announcements updates notices" },
    { title: "Events and Term Dates", description: "Visit News & Events for school activities and term-date updates.", url: "news.html#news", category: "Campus Life", keywords: "events activities calendar term dates schedule" },
    { title: "School Life", description: "See learning, sports, culture and community life at Arekha.", url: "school-life.html#school-life", category: "Campus Life", keywords: "campus life activities sports culture community students" },
    { title: "Gallery and Photos", description: "Browse photographs from school and community activities.", url: "gallery.html#gallery", category: "Campus Life", keywords: "gallery photos pictures images events school" },
    { title: "Student Leader Organogram", description: "Meet the student leaders and browse their leadership groups.", url: "student-leader-organogram.html#student-leaders-title", category: "Campus Life", keywords: "student leadership leaders organogram captains captain house" },
    { title: "School Captains", description: "View the School Captains in the student leadership organogram.", url: "student-leader-organogram.html#school-captains", category: "Campus Life", keywords: "school captain captains student leaders" },
    { title: "House Captains", description: "Browse the house captain groups in the student leadership organogram.", url: "student-leader-organogram.html#bjinpa-house-captains", category: "Campus Life", keywords: "house captains captain Bjinpa Samten Sherab Tsondru Tshelthrim Zeba" },
    { title: "Bjinpa House Captains", description: "View the Bjinpa House Captains.", url: "student-leader-organogram.html#bjinpa-house-captains", category: "Campus Life", keywords: "Bjinpa house captain captains student leaders" },
    { title: "Samten House Captains", description: "View the Samten House Captains.", url: "student-leader-organogram.html#samten-house-captains", category: "Campus Life", keywords: "Samten house captain captains student leaders" },
    { title: "Sherab House Captains", description: "View the Sherab House Captains.", url: "student-leader-organogram.html#sherab-house-captains", category: "Campus Life", keywords: "Sherab house captain captains student leaders" },
    { title: "Tsondru House Captains", description: "View the Tsondru House Captains.", url: "student-leader-organogram.html#tsondru-house-captains", category: "Campus Life", keywords: "Tsondru house captain captains student leaders" },
    { title: "Tshelthrim House Captains", description: "View the Tshelthrim House Captains.", url: "student-leader-organogram.html#tshelthrim-house-captains", category: "Campus Life", keywords: "Tshelthrim house captain captains student leaders" },
    { title: "Zeba House Captains", description: "View the Zeba House Captains.", url: "student-leader-organogram.html#zeba-house-captains", category: "Campus Life", keywords: "Zeba house captain captains student leaders" },
    { title: "Contact the School", description: "Find the school’s verified phone number, email address and location.", url: "contact.html#contact", category: "Contact", keywords: "contact phone telephone call 17160990 email location address Arekha Bongo Chhukha" },
    { title: "Admissions and Fees Enquiries", description: "Contact the school about admissions or fees; those details are not published on this website.", url: "contact.html#contact", category: "Contact", keywords: "admission admissions fees fee enrol enrollment apply tuition contact" },
  ];
  const POPULAR_SEARCHES = ["Academics", "Examination results", "Student leaders", "Contact and phone"];
  const searchScript = document.currentScript || document.querySelector('script[src$="assets/js/script.js"]');
  const pageRoot = new URL("../../", searchScript?.src || window.location.href);
  const normalize = (value) => String(value || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
  const words = (value) => normalize(value).split(" ").filter(Boolean);
  const editDistance = (a, b, limit = 2) => {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let rowMinimum = i;
      for (let j = 1; j <= b.length; j += 1) {
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        rowMinimum = Math.min(rowMinimum, current[j]);
      }
      if (rowMinimum > limit) return limit + 1;
      previous = current;
    }
    return previous[b.length];
  };
  const matchStrength = (term, field) => {
    const fieldWords = words(field);
    if (fieldWords.includes(term)) return 3;
    if (term.length === 1) return 0;
    if (fieldWords.some((word) => word.startsWith(term))) return 2.5;
    if (fieldWords.some((word) => word.includes(term))) return 2;
    if (term.length >= 4 && fieldWords.some((word) => word.length >= 4 && Math.abs(word.length - term.length) <= 1 && editDistance(term, word, term.length >= 7 ? 2 : 1) <= (term.length >= 7 ? 2 : 1))) return 1;
    return 0;
  };
  const rankEntries = (query) => {
    const normalizedQuery = normalize(query);
    const terms = words(normalizedQuery);
    if (!normalizedQuery.replace(/\s/g, "") || normalizedQuery.replace(/\s/g, "").length < 2) return [];
    const ranked = SEARCH_INDEX.map((entry, index) => {
      const title = normalize(entry.title);
      const description = normalize(entry.description);
      const keywords = normalize(entry.keywords);
      const titlePhrase = title === normalizedQuery ? 1000 : title.startsWith(normalizedQuery) ? 800 : title.includes(normalizedQuery) ? 700 : 0;
      let score = titlePhrase;
      let covered = 0;
      terms.forEach((term) => {
        const titleStrength = matchStrength(term, entry.title);
        const keywordStrength = matchStrength(term, entry.keywords);
        const descriptionStrength = matchStrength(term, entry.description);
        const best = Math.max(titleStrength, keywordStrength, descriptionStrength);
        if (best) covered += 1;
        score += Math.max(titleStrength * 100, keywordStrength * 55, descriptionStrength * 20);
      });
      if (terms.length > 1) score += Math.round((covered / terms.length) * 80) - (terms.length - covered) * 18;
      if (!covered) return null;
      if (terms.length >= 3 && covered < Math.ceil(terms.length / 2)) return null;
      if (titlePhrase) score += titlePhrase === 1000 ? 400 : 200;
      return { ...entry, score, covered, index };
    }).filter(Boolean);
    const completeMatches = ranked.filter((entry) => entry.covered === terms.length);
    return (completeMatches.length ? completeMatches : ranked)
      .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 6);
  };

  input.setAttribute("aria-label", "Search the Arekha Middle Secondary School website");
  input.setAttribute("aria-controls", results.id);
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  results.setAttribute("role", "listbox");
  results.setAttribute("aria-label", "Website search results");
  results.setAttribute("aria-live", "polite");

  const header = form.closest(".site-header");
  const actions = header?.querySelector(".header-actions");
  const compactToggleMedia = window.matchMedia("(max-width: 760px)");
  let compactToggle = null;
  const makeToggle = (className) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `site-search-toggle ${className}`;
    button.setAttribute("aria-label", "Open website search");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", results.id);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg>';
    return button;
  };

  let activeIndex = -1;
  let debounceTimer = 0;
  let hasSearchMatches = false;
  const options = () => [...results.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
  const updateExpanded = (isOpen) => {
    input.setAttribute("aria-expanded", String(isOpen));
    [compactToggle].filter(Boolean).forEach((button) => {
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", isOpen ? "Close website search" : "Open website search");
    });
  };
  const closeResults = () => {
    results.hidden = true;
    activeIndex = -1;
    hasSearchMatches = false;
    input.removeAttribute("aria-activedescendant");
    updateExpanded(false);
  };
  const closeCompactSearch = () => {
    header?.classList.remove("search-open");
    closeResults();
  };
  const makeOption = (entry, index, terms) => {
    const link = document.createElement("a");
    link.className = "site-search-result";
    link.href = new URL(entry.url, pageRoot).href;
    link.id = `${results.id}-option-${index}`;
    link.setAttribute("role", "option");
    link.setAttribute("aria-selected", "false");
    link.tabIndex = -1;
    const title = document.createElement("strong");
    const titleWords = entry.title.split(/(\s+)/);
    titleWords.forEach((part) => {
      const normalizedPart = normalize(part);
      const highlighted = terms.some((term) => normalizedPart && matchStrength(term, part) > 0);
      if (highlighted) {
        const mark = document.createElement("b");
        mark.textContent = part;
        title.append(mark);
      } else title.append(document.createTextNode(part));
    });
    const description = document.createElement("span");
    description.textContent = entry.description;
    const category = document.createElement("small");
    category.className = "site-search-category";
    category.textContent = entry.category;
    link.append(title, description, category);
    return link;
  };
  const setActive = (index) => {
    const items = options();
    if (!items.length) return;
    activeIndex = (index + items.length) % items.length;
    items.forEach((item, itemIndex) => item.setAttribute("aria-selected", String(itemIndex === activeIndex)));
    input.setAttribute("aria-activedescendant", items[activeIndex].id);
    items[activeIndex].scrollIntoView({ block: "nearest" });
  };
  const renderEntries = (entries, query, label = "") => {
    results.replaceChildren();
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");
    if (label) {
      const heading = document.createElement("p");
      heading.className = "site-search-section-label";
      heading.setAttribute("role", "presentation");
      heading.textContent = label;
      results.append(heading);
    }
    entries.forEach((entry, index) => results.append(makeOption(entry, index, words(query))));
    results.hidden = false;
    updateExpanded(true);
  };
  const showPopular = () => {
    hasSearchMatches = false;
    const entries = POPULAR_SEARCHES.map((phrase) => rankEntries(phrase)[0]).filter(Boolean);
    const uniqueEntries = [...new Map(entries.map((entry) => [entry.url, entry])).values()];
    renderEntries(uniqueEntries, "", "Popular searches");
  };
  const showNoResults = (query) => {
    hasSearchMatches = false;
    results.replaceChildren();
    const message = document.createElement("p");
    message.className = "site-search-empty-message";
    message.setAttribute("role", "presentation");
    message.textContent = "No results found. Try a different word.";
    results.append(message);
    const fallback = [
      { title: "Home", description: "Visit the school homepage.", url: "index.html#home", category: "School" },
      { title: "Academics", description: "Visit the Academics page.", url: "academics.html#academics", category: "Academics" },
      { title: "Contact", description: "Find the school’s phone number and email.", url: "contact.html#contact", category: "Contact" },
    ];
    fallback.forEach((entry, index) => results.append(makeOption(entry, index, words(query))));
    results.hidden = false;
    updateExpanded(true);
  };
  const search = () => {
    window.clearTimeout(debounceTimer);
    hasSearchMatches = false;
    const query = String(input.value || "").trim();
    const normalized = normalize(query);
    if (!normalized) { showPopular(); return; }
    if (normalized.replace(/\s/g, "").length < 2) {
      renderEntries([], "", "Type at least two characters to search");
      return;
    }
    const entries = rankEntries(normalized);
    if (!entries.length) { showNoResults(query); return; }
    hasSearchMatches = true;
    renderEntries(entries, normalized);
  };
  const toggleCompactSearch = () => {
    const opening = !header?.classList.contains("search-open");
    header?.classList.toggle("search-open", opening);
    if (opening) { search(); input.focus(); }
    else closeResults();
  };

  const syncCompactToggle = () => {
    if (compactToggleMedia.matches && actions && !compactToggle) {
      compactToggle = makeToggle("site-search-toggle--compact");
      actions.insertBefore(compactToggle, actions.querySelector(".menu-toggle") || actions.firstChild);
      compactToggle.addEventListener("click", toggleCompactSearch);
    } else if (!compactToggleMedia.matches && compactToggle) {
      compactToggle.remove();
      compactToggle = null;
      closeCompactSearch();
    }
  };
  compactToggleMedia.addEventListener("change", syncCompactToggle);
  syncCompactToggle();
  input.addEventListener("focus", () => { if (!input.value.trim()) showPopular(); });
  input.addEventListener("click", () => { if (!input.value.trim()) showPopular(); });
  input.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(search, 200);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    window.clearTimeout(debounceTimer);
    search();
    if (hasSearchMatches && options().length) window.location.href = options()[0].href;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { closeCompactSearch(); return; }
    if (event.key === "Enter") {
      const queryLength = normalize(input.value).replace(/\s/g, "").length;
      if (queryLength >= 2) {
        event.preventDefault();
        window.clearTimeout(debounceTimer);
        search();
        if (hasSearchMatches && options().length) window.location.href = options()[activeIndex < 0 ? 0 : activeIndex].href;
      } else if (activeIndex >= 0 && options()[activeIndex]) {
        event.preventDefault();
        window.location.href = options()[activeIndex].href;
      }
      return;
    }
    if (results.hidden) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(activeIndex + 1); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive(activeIndex < 0 ? options().length - 1 : activeIndex - 1); }
  });
  results.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest('[role="option"]')) closeCompactSearch();
  });
  document.addEventListener("click", (event) => {
    if (!form.contains(event.target) && !compactToggle?.contains(event.target)) closeCompactSearch();
  });
  document.addEventListener("siteheaderstatechange", (event) => {
    if (!event.detail?.isScrolled) closeCompactSearch();
    else if (!header?.classList.contains("search-open")) closeResults();
  });
  if (header?.classList.contains("is-scrolled")) closeResults();
})();
