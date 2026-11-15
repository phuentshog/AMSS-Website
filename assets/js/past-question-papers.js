(() => {
  const app = document.querySelector('#papers-app');
  const filtersForm = document.querySelector('#papers-filters');
  const results = document.querySelector('#papers-results');
  const resultCount = document.querySelector('#papers-result-count');
  const notice = document.querySelector('#papers-access-notice');
  if (!app || !filtersForm || !results || !resultCount) return;

  const controls = {
    query: filtersForm.elements.query,
    year: filtersForm.elements.year,
    examination: filtersForm.elements.examination,
    class: filtersForm.elements.class,
    subject: filtersForm.elements.subject,
  };
  const subjectAliases = {
    DTI: 'DTI',
    ICT: 'DTI',
    'Design Technology and Innovation (DTI)': 'DTI',
    'Digital Technology and Information': 'DTI',
  };
  const initialInstructions = 'Search the verified public PDFs by title or filter by class, subject, examination and year. Download links work without Staff Login.';
  const unverifiedExplanation = 'This paper is listed in the catalogue, but its document has not yet been confirmed as accessible to students. Please check again later.';
  const isQuestionPaperCandidate = (paper) => paper?.resourceType === 'question-paper-candidate';
  const hasVerifiedStudentAccess = (paper) => paper?.accessVerificationStatus === 'verified-public';
  const buildDownloadUrl = (paper) => {
    if (!paper || typeof paper.publicPath !== 'string' || !paper.publicPath.startsWith('assets/question-papers/')) return null;
    if (String(paper.fileFormat || '').toLowerCase() !== 'pdf' || !/^[a-z0-9-]+\.pdf$/i.test(paper.filename || '')) return null;
    return paper.publicPath;
  };

  const normalizeClass = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').replace(/^class\s+/i, '').toLocaleUpperCase();
  const classValues = (paper) => {
    const supplied = Array.isArray(paper.classes) ? paper.classes : [];
    const values = supplied.length ? supplied : (paper.class ? [paper.class] : []);
    return [...new Set(values.map(normalizeClass).filter(Boolean))];
  };

  const compareText = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  const romanNumber = (value) => {
    if (/^\d+$/.test(value)) return Number(value);
    if (!/^[IVXLCDM]+$/.test(value)) return null;
    const numerals = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    return [...value].reduce((total, numeral, index, characters) => {
      const current = numerals[numeral];
      const next = numerals[characters[index + 1]] || 0;
      return total + (current < next ? -current : current);
    }, 0);
  };
  const compareClasses = (a, b) => {
    const numberA = romanNumber(a);
    const numberB = romanNumber(b);
    return numberA !== null && numberB !== null ? numberA - numberB : compareText(a, b);
  };
  const canonicalSubject = (subject) => {
    const value = String(subject || '').trim().replace(/\s+/g, ' ');
    const alias = Object.entries(subjectAliases).find(([name]) => name.toLocaleLowerCase() === value.toLocaleLowerCase());
    return alias ? alias[1] : value;
  };
  const displaySubject = (subject) => canonicalSubject(subject);
  const normalizeFilterValue = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const normalizedOptions = (values) => {
    const unique = new Map();
    values.forEach((value) => {
      const label = String(value ?? '').trim().replace(/\s+/g, ' ');
      const key = normalizeFilterValue(label);
      if (key && !unique.has(key)) unique.set(key, label);
    });
    return new Set(unique.values());
  };
  const matchesFilters = (paper, selected) => {
    const searchable = [paper.suggestedDisplayTitle, paper.originalFilename, paper.year, paper.examinationType,
      paper.class, ...(paper.classes || []), paper.subject].filter(Boolean).join(' ').toLocaleLowerCase();
    return (!selected.year || normalizeFilterValue(paper.year) === normalizeFilterValue(selected.year)) &&
      (!selected.examination || normalizeFilterValue(paper.examinationType) === normalizeFilterValue(selected.examination)) &&
      (!selected.class || classValues(paper).includes(selected.class)) &&
      (!selected.subject || normalizeFilterValue(canonicalSubject(paper.subject)) === normalizeFilterValue(selected.subject)) &&
      (!selected.query || searchable.includes(normalizeFilterValue(selected.query)));
  };

  const fillSelect = (select, values, orderedValues = null, getLabel = (value) => value) => {
    const firstOption = select.options[0];
    select.replaceChildren(firstOption);
    const options = orderedValues
      ? orderedValues.filter((value) => values.has(value))
      : [...values].sort(compareText);
    options.forEach((value) => {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = String(getLabel(value));
      select.append(option);
    });
  };

  const selectedFilters = () => Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value]));

  const examinationTitle = (value) => ({
    annual: 'Annual Examination',
    midterm: 'Midterm Examination',
    trial: 'Trial Examination',
    'quarterly i': 'Quarterly I Examination',
    'quarterly ii': 'Quarterly II Examination',
  }[normalizeFilterValue(value)] || String(value || '').trim().replace(/\s+/g, ' '));

  const buildDisplayTitle = (paper) => {
    const classList = classValues(paper);
    const classTitle = classList.length === 1
      ? `Class ${classList[0]}`
      : classList.length > 1
        ? `Classes ${classList.slice(0, -1).join(', ')} and ${classList.at(-1)}`
        : '';
    const classDisplayTitle = paper.classDisplay ? `Class ${String(paper.classDisplay).trim()}` : classTitle;
    const subject = paper.subject ? displaySubject(paper.subject) : '';
    const paperNumber = paper.paperNumber ? `Paper ${String(paper.paperNumber).trim()}` : '';
    const identity = [classDisplayTitle, subject, paperNumber].filter(Boolean).join(' ');
    const exam = paper.examinationType ? examinationTitle(paper.examinationType) : '';
    const year = paper.year !== null && paper.year !== undefined && paper.year !== '' ? String(paper.year) : '';
    const context = [exam, year].filter(Boolean).join(' ');
    const availableParts = [classTitle, subject, exam, year].filter(Boolean).length;

    if (identity && availableParts >= 2) {
      return { text: [identity, context].filter(Boolean).join(' — '), generated: true };
    }
    return { text: paper.suggestedDisplayTitle || paper.originalFilename || 'Question paper', generated: false };
  };

  const makeCard = (paper) => {
    const verified = hasVerifiedStudentAccess(paper);
    const downloadUrl = verified ? buildDownloadUrl(paper) : null;
    const article = document.createElement('article');
    article.className = 'papers-card';
    const copy = document.createElement('div');
    copy.className = 'papers-card-copy';
    const displayTitle = buildDisplayTitle(paper);
    const title = document.createElement('h3');
    title.textContent = displayTitle.text;
    copy.append(title);
    const classList = classValues(paper);
    const items = displayTitle.generated ? [] : [
      paper.year,
      paper.examinationType,
      classList.length ? classList.map((value) => `Class ${value}`).join(', ') : null,
      paper.subject ? displaySubject(paper.subject) : null,
    ];
    const metadata = document.createElement('ul');
    metadata.className = 'papers-card-meta';
    metadata.setAttribute('aria-label', 'Paper details');
    items.filter((value) => value !== null && value !== undefined && value !== '').forEach((value) => {
      const item = document.createElement('li');
      item.textContent = String(value);
      metadata.append(item);
    });
    if (metadata.children.length) copy.append(metadata);
    if (downloadUrl) {
      const actions = document.createElement('div');
      actions.className = 'papers-card-actions';
      const download = document.createElement('a');
      download.className = 'papers-open-link papers-download-link';
      download.href = downloadUrl;
      download.download = paper.filename;
      download.textContent = 'Download PDF';
      download.setAttribute('aria-label', `Download ${title.textContent}`);
      actions.append(download);
      article.append(copy, actions);
    } else {
      const status = document.createElement('div');
      status.className = 'papers-access-status';
      const statusTitle = document.createElement('strong');
      statusTitle.textContent = verified ? 'Verified access; link unavailable' : 'Access not verified';
      status.append(statusTitle);
      if (!verified) {
        const explanation = document.createElement('span');
        explanation.textContent = unverifiedExplanation;
        status.append(explanation);
      }
      article.append(copy, status);
    }
    return article;
  };

  const render = (candidates, selected) => {
    const candidateMatches = candidates.filter((paper) => matchesFilters(paper, selected));
    results.replaceChildren();
    const cards = candidateMatches.map(makeCard).filter(Boolean);
    cards.forEach((card) => results.append(card));

    if (cards.length) {
      resultCount.textContent = `${cards.length} matching ${cards.length === 1 ? 'paper' : 'papers'} found.`;
      return;
    }
    resultCount.textContent = 'No question papers found. Try changing your selections.';
  };

  const showError = (message) => {
    app.setAttribute('aria-busy', 'false');
    resultCount.textContent = 'The paper catalogue could not be loaded.';
    const error = document.createElement('p');
    error.className = 'papers-error';
    error.setAttribute('role', 'alert');
    error.textContent = message;
    results.replaceChildren(error);
    if (notice) notice.hidden = true;
  };

  const loadCatalogue = async () => {
    try {
      const response = await fetch('examination/data/papers.json', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
      const catalogue = await response.json();
      if (!catalogue || !Array.isArray(catalogue.papers)) throw new Error('The catalogue data is not in the expected format.');

      const candidates = catalogue.papers.filter((paper) => isQuestionPaperCandidate(paper) && hasVerifiedStudentAccess(paper) && buildDownloadUrl(paper));
      fillSelect(controls.year, normalizedOptions(candidates.map((paper) => paper.year)));
      fillSelect(controls.examination, normalizedOptions(candidates.map((paper) => paper.examinationType)));
      const availableClasses = normalizedOptions(candidates.flatMap(classValues));
      fillSelect(controls.class, availableClasses, [...availableClasses].sort(compareClasses));
      const updateSubjects = () => {
        const previouslySelected = controls.subject.value;
        const selectedClass = controls.class.value;
        const subjects = normalizedOptions(candidates
          .filter((paper) => !selectedClass || classValues(paper).includes(selectedClass))
          .map((paper) => canonicalSubject(paper.subject))
          .filter(Boolean));
        fillSelect(controls.subject, subjects);
        const retainedSubject = [...subjects].find((subject) => normalizeFilterValue(subject) === normalizeFilterValue(previouslySelected));
        controls.subject.value = retainedSubject || '';
      };
      updateSubjects();

      let hasSearched = false;
      filtersForm.addEventListener('change', (event) => {
        if (event.target === controls.class) updateSubjects();
        if (hasSearched) {
          results.replaceChildren();
          resultCount.textContent = 'Your selections have changed. Click Search Papers to update the results.';
        }
      });
      filtersForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = selectedFilters();
        if (!Object.values(selected).some(Boolean)) {
          hasSearched = false;
          resultCount.textContent = 'Select at least one filter, then click Search Papers to find question papers.';
          results.replaceChildren();
          return;
        }
        hasSearched = true;
        render(candidates, selected);
      });
      const clearButton = filtersForm.querySelector('[data-papers-clear]');
      clearButton?.addEventListener('click', () => {
        filtersForm.reset();
        updateSubjects();
        hasSearched = false;
        results.replaceChildren();
        resultCount.textContent = initialInstructions;
      });
      app.setAttribute('aria-busy', 'false');
      resultCount.textContent = initialInstructions;
    } catch (error) {
      showError('Please reload this page and try again. The catalogue is unavailable or could not be read.');
      console.error('Past Question Papers catalogue error:', error);
    }
  };

  loadCatalogue();
})();
