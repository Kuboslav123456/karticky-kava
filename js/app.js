// Coffee-card generator — main app logic.
// Vanilla ES module. State lives in `state`, persisted to localStorage,
// rendered into two zones: form panels (left) and A4 preview (right).

import { i18n, DEFAULT_LANG, LANGS } from './i18n.js';
import { exportPdf, isPdfExportReady, preloadPdfAssets } from './pdf-export.js';
import { exportPoster } from './poster-export.js';

// ── Constants ────────────────────────────────────────────
const STORAGE_KEY = 'karticky-kava-state-v1';
const CARDS_PER_SHEET = 16;          // 4 × 4 grid on A4

// ── State ────────────────────────────────────────────────
const blankCoffee = () => ({
  id: cryptoRandomId(),
  roastery:    '',
  blend:       '',     // "Názov kávy" — used for the poster export
  country:     '',
  region:      '',
  process:     '',
  roast:       '',
  flavor:      '',
  description: '',
});

function cryptoRandomId() {
  return (crypto?.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

const state = loadState() ?? {
  lang:    DEFAULT_LANG,
  coffees: [blankCoffee()],
  previewSelection: 'all',   // 'all' = mixed by copies; otherwise = coffee.id
  backOffsetX: 0,            // mm — duplex printer calibration
  backOffsetY: 0,            // mm
  posterSize: 'A4',          // 'A4', 'A5' or 'A6' for poster export
  collapsedRoasteries: [],   // roastery name strings whose section is collapsed
};

// Sanity-check after a localStorage load: keep schema forward-compatible.
state.lang    = LANGS.includes(state.lang) ? state.lang : DEFAULT_LANG;
state.coffees = Array.isArray(state.coffees) && state.coffees.length
  ? state.coffees.map(c => ({ ...blankCoffee(), ...c }))
  : [blankCoffee()];
// If saved selection is 'all' or points to a deleted coffee, fall back to active
state.previewSelection = state.coffees.find(c => c.id === state.previewSelection)
  ? state.previewSelection
  : state.activeCoffeeId ?? state.coffees[0]?.id;
state.backOffsetX = clampOffset(state.backOffsetX);
state.backOffsetY = clampOffset(state.backOffsetY);
state.posterSize  = ['A4', 'A5', 'A6'].includes(state.posterSize) ? state.posterSize : 'A4';
// Collapsed roastery sections — sanitize to array of strings
state.collapsedRoasteries = Array.isArray(state.collapsedRoasteries)
  ? state.collapsedRoasteries.filter(r => typeof r === 'string')
  : [];
// Active (expanded) coffee form — fall back to first coffee if saved id is gone
state.activeCoffeeId = state.coffees.find(c => c.id === state.activeCoffeeId)
  ? state.activeCoffeeId
  : state.coffees[0]?.id;

function clampOffset(v) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-5, Math.min(5, n));
}

function t(key) { return i18n[state.lang]?.[key] ?? key; }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('localStorage save failed', e); }
}

// ── Helpers ──────────────────────────────────────────────
function buildCardList() {
  // Always fill the full sheet (16 cards) with the selected coffee.
  const picked = state.coffees.find(c => c.id === state.previewSelection)
    ?? state.coffees.find(c => c.id === state.activeCoffeeId)
    ?? state.coffees[0];
  return Array(CARDS_PER_SHEET).fill(picked ?? null);
}

// Tiny DOM helper
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class')       node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

// ── Renderers ────────────────────────────────────────────

// Update labels & placeholders marked with [data-i18n] / [data-i18n-ph]
function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.title = t('appTitle');

  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll('[data-i18n-ph]')) {
    node.setAttribute('placeholder', t(node.dataset.i18nPh));
  }
  for (const node of document.querySelectorAll('[data-i18n-title]')) {
    node.setAttribute('title', t(node.dataset.i18nTitle));
  }
  // Lang switcher visual state
  for (const btn of document.querySelectorAll('.lang-switch [data-lang]')) {
    btn.classList.toggle('is-active', btn.dataset.lang === state.lang);
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === state.lang));
  }
}

// ── Left panel — roastery sections ───────────────────────
// The left panel is a single scrollable list of roastery sections.
// Each section has a collapsible header and contains coffee items.
// Each coffee item has a click-bar (collapsed) or an embedded form (active).

function renderFormPanels() {
  if (!Array.isArray(state.collapsedRoasteries)) state.collapsedRoasteries = [];
  const host = document.getElementById('coffee-forms');
  host.replaceChildren();
  groupCoffeesByRoastery().forEach(group => host.append(buildRoasterySection(group)));
}

function groupCoffeesByRoastery() {
  const groups = [];
  state.coffees.forEach((coffee, idx) => {
    const key = (coffee.roastery || '').trim();
    let group = groups.find(g => g.roastery === key);
    if (!group) { group = { roastery: key, items: [] }; groups.push(group); }
    group.items.push({ coffee, idx });
  });
  return groups;
}

function buildRoasterySection(group) {
  if (!Array.isArray(state.collapsedRoasteries)) state.collapsedRoasteries = [];
  const isCollapsed = state.collapsedRoasteries.includes(group.roastery);

  const toggleCollapse = () => {
    if (isCollapsed) {
      state.collapsedRoasteries = state.collapsedRoasteries.filter(r => r !== group.roastery);
    } else {
      state.collapsedRoasteries = [...state.collapsedRoasteries, group.roastery];
    }
    saveState();
    renderFormPanels();
  };

  const chevron = svgIcon('chevron');
  chevron.classList.add('roastery-section__chevron');

  const displayRoastery = group.roastery
    || (state.lang === 'cs' ? '(bez pražírny)' : '(bez pražiarne)');

  const head = el('div', { class: 'roastery-section__head', onclick: toggleCollapse },
    chevron,
    el('span', { class: `roastery-section__name${group.roastery ? '' : ' roastery-section__name--unnamed'}` },
      displayRoastery),
    el('span', { class: 'roastery-section__count' }, String(group.items.length)),
  );

  const body = el('div', { class: 'roastery-section__body' });
  group.items.forEach(({ coffee, idx }) => body.append(buildCoffeeItem(coffee, idx)));

  // Inline "+ add under this roastery" button
  const addLabel = group.roastery
    ? `${t('addUnderRoastery')} ${group.roastery}`
    : t('addCoffee').replace('+ ', '+ ');
  const addBtn = el('button', { type: 'button', class: 'roastery-section__add',
    onclick: () => {
      const newCoffee = { ...blankCoffee(), roastery: group.roastery };
      // Insert right after the last coffee of this group
      const lastCoffee = group.items[group.items.length - 1].coffee;
      const insertAt   = state.coffees.indexOf(lastCoffee) + 1;
      state.coffees.splice(insertAt, 0, newCoffee);
      state.activeCoffeeId   = newCoffee.id;
      state.previewSelection = newCoffee.id;
      // Ensure this section stays expanded
      state.collapsedRoasteries = state.collapsedRoasteries.filter(r => r !== group.roastery);
      saveState();
      renderFormPanels();
      renderPreview();
      // Focus the blend field of the new form
      setTimeout(() => {
        document.getElementById(`${newCoffee.id}-blend`)?.focus();
      }, 0);
    },
  }, svgIcon('plus'), ' ' + addLabel);
  body.append(addBtn);

  return el('section', {
    class: `roastery-section${isCollapsed ? ' is-collapsed' : ''}`,
    'data-roastery': group.roastery,
  }, head, body);
}

function buildCoffeeItem(coffee, idx) {
  const isActive  = coffee.id === state.activeCoffeeId;
  const canDelete = state.coffees.length > 1;
  const displayName = coffee.blend || `${t('coffeeN')} ${idx + 1}`;

  const delBtn = canDelete ? el('button', {
    type: 'button', class: 'coffee-item__del',
    title: t('removeCoffee'), 'aria-label': t('removeCoffee'),
    onclick: (e) => {
      e.stopPropagation();
      const i = state.coffees.indexOf(coffee);
      if (i < 0) return;
      state.coffees.splice(i, 1);
      if (state.activeCoffeeId === coffee.id) {
        state.activeCoffeeId = state.coffees[Math.max(0, i - 1)]?.id ?? state.coffees[0]?.id;
      }
      state.previewSelection = state.activeCoffeeId;
      saveState();
      renderFormPanels();
      renderPreview();
    },
  }, svgIcon('trash')) : null;

  const barAttrs = { class: 'coffee-item__bar' };
  if (!isActive) {
    barAttrs.onclick = () => {
      state.activeCoffeeId   = coffee.id;
      state.previewSelection = coffee.id;
      // Auto-expand the section if it was collapsed
      if (Array.isArray(state.collapsedRoasteries)) {
        state.collapsedRoasteries = state.collapsedRoasteries.filter(
          r => r !== (coffee.roastery || '').trim()
        );
      }
      saveState();
      renderFormPanels();
      renderPreview();
    };
  }

  const bar = el('div', barAttrs,
    el('span', { class: 'coffee-item__dot' }),
    el('span', { class: 'coffee-item__bar-name', 'data-coffee-bar': coffee.id }, displayName),
    delBtn,
  );

  const item = el('div', {
    class: `coffee-item${isActive ? ' is-active' : ''}`,
    'data-coffee-id': coffee.id,
  }, bar);

  if (isActive) item.append(buildCoffeeForm(coffee, idx));
  return item;
}

function buildCoffeeForm(coffee, idx) {
  const fields = el('div', { class: 'fields' });

  const addField = (key, opts = {}) => {
    const inputId = `${coffee.id}-${key}`;
    const labelEl = el('label', { class: 'field', for: inputId },
      el('span', { class: 'field__label', 'data-i18n': key === 'description' ? 'descLabel' : key },
        t(key === 'description' ? 'descLabel' : key)),
    );

    const inputAttrs = {
      id:             inputId,
      class:          'field__input',
      value:          coffee[key] || '',
      'data-i18n-ph': `${key}Ph`,
      placeholder:    t(`${key}Ph`),
      autocomplete:   'off',
      spellcheck:     'false',
      oninput: e => {
        coffee[key] = e.target.value;
        saveState();
        // Targeted DOM updates — keeps focus without full re-render
        if (key === 'blend') {
          const barName = document.querySelector(`[data-coffee-bar="${coffee.id}"]`);
          if (barName) barName.textContent = coffee.blend || `${t('coffeeN')} ${idx + 1}`;
        }
        if (key === 'roastery') {
          // Update section header text live while typing
          const sectionEl = document.querySelector(`.coffee-item[data-coffee-id="${coffee.id}"]`)
            ?.closest('.roastery-section');
          if (sectionEl) {
            const nameEl = sectionEl.querySelector('.roastery-section__name');
            if (nameEl) nameEl.textContent = coffee.roastery
              || (state.lang === 'cs' ? '(bez pražírny)' : '(bez pražiarne)');
          }
        }
        renderPreview();
      },
      // Re-group sections on roastery blur (e.g. user changed "Goriffe" → "Rusty Nail")
      // but only if focus leaves this coffee item entirely (so Tab between fields works).
      onblur: key === 'roastery' ? (e) => {
        const thisItem = document.querySelector(`.coffee-item[data-coffee-id="${coffee.id}"]`);
        if (!thisItem?.contains(e.relatedTarget)) renderFormPanels();
      } : null,
    };

    let inputEl;
    if (opts.textarea) {
      inputEl = el('textarea', { ...inputAttrs, rows: '3' });
      inputEl.value = coffee[key] || '';
    } else {
      inputEl = el('input', { ...inputAttrs, type: 'text' });
    }
    labelEl.append(inputEl);
    fields.append(labelEl);
    return labelEl;
  };

  addField('roastery');
  {
    const blendLabel = addField('blend');   // Názov kávy — visible in poster export
    blendLabel.append(el('span', { class: 'field__hint', 'data-i18n': 'blendHint' }, t('blendHint')));
  }
  addField('country');
  addField('region');
  addField('process');
  addField('roast');
  addField('flavor');
  addField('description', { textarea: true });

  return el('div', { class: 'coffee-item__form' }, fields);
}


function renderPreview() {
  const sheetA = document.getElementById('a4-sheet-fields');
  const sheetB = document.getElementById('a4-sheet-desc');
  if (!sheetA || !sheetB) return;
  sheetA.replaceChildren();
  sheetB.replaceChildren();

  const cards = buildCardList();
  for (const coffee of cards) {
    sheetA.append(coffee ? buildFieldsCard(coffee) : buildEmptyCard());
    sheetB.append(coffee ? buildDescCard(coffee)   : buildEmptyCard());
  }

  // Auto-fit text to each card. Deferred to next frame so layout is settled.
  scheduleAutoFit();
}

// ── Auto-fit ───────────────────────────────────────────────
// Find, per card, the largest font-size whose content still fits inside the
// card's inner box. Front cards (6 label-value rows) and back cards (one
// description block) have different max sizes; both have a sensible floor.
const FIT_FIELDS = { max: 17, min: 5 };
const FIT_DESC   = { max: 18, min: 5 };

// Defer auto-fit to next macrotask so the freshly-injected card DOM has
// been laid out before we measure it. setTimeout(0) is used (instead of
// requestAnimationFrame) because some headless / background-tab environments
// throttle rAF to never-fire, while setTimeout is always honoured.
let _autoFitTimer = 0;
function scheduleAutoFit() {
  if (_autoFitTimer) clearTimeout(_autoFitTimer);
  _autoFitTimer = setTimeout(() => {
    _autoFitTimer = 0;
    try { autoFitCards(); }
    catch (e) { console.error('autoFitCards failed:', e); }
  }, 0);
}

function autoFitCards() {
  // Group identical cards by their inner HTML so the binary search only runs
  // once per unique content; the result is applied to all matching cards.
  const cards = document.querySelectorAll('.a4-sheet .card:not(.card--empty)');
  const cache = new Map();
  for (const card of cards) {
    const inner = card.querySelector('.card__inner');
    if (!inner) continue;
    // We set font-size on .card__inner (so it cascades) but measure overflow
    // on .card__body — the body grows to fill space ABOVE the logo footer,
    // so its overflow accurately tells us whether the text fits without
    // bumping into the logo.
    const body = inner.querySelector('.card__body') || inner;
    const isDesc = card.classList.contains('card--desc');
    const cfg = isDesc ? FIT_DESC : FIT_FIELDS;
    const key = (isDesc ? 'd|' : 'f|') + inner.innerHTML;
    let pt = cache.get(key);
    if (pt == null) {
      pt = fitFontSize(inner, body, cfg.min, cfg.max);
      inner.style.fontSize = pt.toFixed(2) + 'pt';
      // Verification pass — re-shrink if the applied value still overflows
      // (web-font swap, em-relative children, etc. can push the best from
      // the binary search slightly out of fit).
      let safety = 16;
      while (safety-- > 0
          && (body.scrollHeight > body.clientHeight + 1
           || body.scrollWidth  > body.clientWidth  + 1)
          && pt > cfg.min) {
        pt = Math.max(cfg.min, pt * 0.96);
        inner.style.fontSize = pt.toFixed(2) + 'pt';
      }
      cache.set(key, pt);
    } else {
      inner.style.fontSize = pt.toFixed(2) + 'pt';
    }
    inner.dataset.fitPt = pt.toFixed(2);
  }
}

// Binary-search the largest font-size whose content fits inside measureEl,
// while applying the size to setterEl so the style cascades to children.
function fitFontSize(setterEl, measureEl, minPt, maxPt) {
  const original = setterEl.style.fontSize;
  let lo = minPt, hi = maxPt, best = minPt;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    setterEl.style.fontSize = mid + 'pt';
    const fits = measureEl.scrollHeight <= measureEl.clientHeight + 1
              && measureEl.scrollWidth  <= measureEl.clientWidth  + 1;
    if (fits) { best = mid; lo = mid; } else { hi = mid; }
  }
  setterEl.style.fontSize = original;
  return best;
}


// Page 1 — fields card (left-aligned, bold label + value rows)
function buildFieldsCard(coffee) {
  const row = (key, value) => el('p', { class: `card__row${value ? '' : ' is-empty'}` },
    el('b', null, `${t(key)}:`), ' ',
    el('span', null, value || '—'),
  );

  return el('article', { class: 'card card--fields' },
    el('div', { class: 'card__inner' },
      el('div', { class: 'card__body' },
        row('roastery', coffee.roastery),
        row('country',  coffee.country),
        row('region',   coffee.region),
        row('process',  coffee.process),
        row('roast',    coffee.roast),
        row('flavor',   coffee.flavor),
      ),
      cardFoot(),
    )
  );
}

// Page 2 — description card
function buildDescCard(coffee) {
  const desc = el('p', { class: 'card__desc' }, coffee.description || '—');
  if (!coffee.description) desc.classList.add('is-empty');
  return el('article', { class: 'card card--desc' },
    el('div', { class: 'card__inner' },
      el('div', { class: 'card__body' }, desc),
      cardFoot(),
    )
  );
}

// Footer shared by both card sides — Martinus logo centred at the bottom.
function cardFoot() {
  return el('footer', { class: 'card__foot', 'aria-hidden': 'true' },
    el('img', {
      class: 'card__logo',
      src:   'assets/martinus-logo.png',
      alt:   'Martinus',
      onerror: function () { this.style.display = 'none'; },
    }),
  );
}

function buildEmptyCard() {
  return el('article', { class: 'card card--empty', 'aria-hidden': 'true' },
    el('div', { class: 'card__inner' })
  );
}

// ── Icons ────────────────────────────────────────────────
function svgIcon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const paths = {
    bean:    ['M7 14c0-3 3-5 5-5s5 2 5 5-3 5-5 5-5-2-5-5z', 'M12 9V4'],
    trash:   ['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14', 'M10 11v6', 'M14 11v6'],
    plus:    ['M12 5v14', 'M5 12h14'],
    pdf:     ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 14h6', 'M9 18h4'],
    chevron: ['M6 9l6 6 6-6'],
  };
  for (const d of (paths[name] || [])) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
  }
  return svg;
}

// ── Wiring ───────────────────────────────────────────────
function init() {
  // Language buttons
  for (const btn of document.querySelectorAll('.lang-switch [data-lang]')) {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (!LANGS.includes(lang) || lang === state.lang) return;
      state.lang = lang;
      saveState();
      applyLanguage();
      renderFormPanels();
      renderPreview();
    });
  }

  // Add coffee
  document.getElementById('add-coffee').addEventListener('click', () => {
    const newCoffee = blankCoffee();
    state.coffees.push(newCoffee);
    state.activeCoffeeId   = newCoffee.id;
    state.previewSelection = newCoffee.id;
    saveState();
    renderFormPanels();
    renderPreview();
  });

  // Reset
  document.getElementById('reset-all').addEventListener('click', () => {
    if (!confirm(t('confirmReset'))) return;
    state.coffees = [blankCoffee()];
    state.activeCoffeeId   = state.coffees[0].id;
    state.previewSelection = state.coffees[0].id;
    saveState();
    renderFormPanels();
    renderPreview();
  });

  // Export PDF — shows a coffee-selection modal, then generates one PDF per
  // selected coffee. Reads per-card font-sizes from the DOM after re-rendering
  // so the PDF matches what the user sees in the preview.
  document.getElementById('export-pdf').addEventListener('click', async () => {
    const selected = await showSelectionModal({
      title:        t('exportSelectTitle'),
      confirmLabel: t('exportPdf'),
    });
    if (!selected?.length) return;

    const btn = document.getElementById('export-pdf');
    const label = btn.querySelector('span') || btn;
    const originalText = label.textContent;
    btn.disabled = true;
    label.textContent = t('exporting');
    btn.classList.add('btn--busy');

    const origSelection = state.previewSelection;
    try {
      for (const id of selected) {
        // Render the preview for this specific coffee so autofit measures it.
        state.previewSelection = id;
        renderPreview();
        if (_autoFitTimer) { clearTimeout(_autoFitTimer); _autoFitTimer = 0; }
        autoFitCards();

        const fieldsPt = [...document.querySelectorAll('#a4-sheet-fields .card .card__inner')]
          .map(el => parseFloat(el.dataset.fitPt) || 11);
        const descPt = [...document.querySelectorAll('#a4-sheet-desc .card .card__inner')]
          .map(el => parseFloat(el.dataset.fitPt) || 14);

        // Yield twice so the "generating" label paints before pdfmake blocks.
        await new Promise(r => setTimeout(r, 0));
        await new Promise(r => setTimeout(r, 0));

        await exportPdf({
          coffees: state.coffees,
          cards:   buildCardList(),
          fieldsPt,
          descPt,
          lang:    state.lang,
          t,
          backOffsetX: state.backOffsetX,
          backOffsetY: state.backOffsetY,
        });
      }
    } finally {
      // Restore preview and button state.
      state.previewSelection = origSelection;
      renderPreview();
      if (_autoFitTimer) { clearTimeout(_autoFitTimer); _autoFitTimer = 0; }
      autoFitCards();
      btn.disabled = false;
      btn.classList.remove('btn--busy');
      label.textContent = originalText;
    }
  });

  // Print — shows a coffee-selection modal, then opens the browser print
  // dialog once per selected coffee (each triggers a separate dialog).
  document.getElementById('print-btn').addEventListener('click', async () => {
    const selected = await showSelectionModal({
      title:        t('printSelectTitle'),
      confirmLabel: t('printBtn'),
    });
    if (!selected?.length) return;

    // Wait for all @font-face fonts (Tabac Sans) to finish loading before
    // auto-fitting. If we measure with a fallback font, the sizes are wrong
    // and text may overflow or look mis-formatted on the printout.
    if (document.fonts?.ready) await document.fonts.ready;

    const origSelection = state.previewSelection;
    for (const id of selected) {
      state.previewSelection = id;
      renderPreview();
      if (_autoFitTimer) { clearTimeout(_autoFitTimer); _autoFitTimer = 0; }
      autoFitCards();
      // Give the browser two frames to paint the final font sizes before
      // opening the print dialog.
      await new Promise(r => setTimeout(r, 50));
      window.print();
    }
    // Restore preview after printing.
    state.previewSelection = origSelection;
    renderPreview();
    if (_autoFitTimer) { clearTimeout(_autoFitTimer); _autoFitTimer = 0; }
    autoFitCards();
  });

  // Poster export — shows a coffee-selection modal, then generates a poster
  // PDF with one page per selected coffee.
  const posterBtn = document.getElementById('export-poster');
  posterBtn.addEventListener('click', async () => {
    const selected = await showSelectionModal({
      title:        t('posterSelectTitle'),
      confirmLabel: t('exportPoster'),
    });
    if (!selected?.length) return;

    const label = posterBtn.querySelector('span') || posterBtn;
    const orig  = label.textContent;
    posterBtn.disabled = true;
    posterBtn.classList.add('btn--busy');
    label.textContent = t('exporting');
    await new Promise(r => setTimeout(r, 0));
    try {
      await exportPoster({
        coffees: state.coffees.filter(c => selected.includes(c.id)),
        size:    state.posterSize,
        lang:    state.lang,
        t,
      });
    } finally {
      posterBtn.disabled = false;
      posterBtn.classList.remove('btn--busy');
      label.textContent = orig;
    }
  });

  // Poster size toggle (A4 / A5)
  for (const sb of document.querySelectorAll('.poster-size__btn')) {
    sb.addEventListener('click', () => {
      state.posterSize = sb.dataset.posterSize;
      saveState();
      updatePosterSizeUI();
    });
  }
  updatePosterSizeUI();

  applyBackOffsetVars();

  applyLanguage();
  renderFormPanels();
  renderPreview();
  renderCropMarks();
  setupResponsivePreviewScale();

  // Web fonts (Tabac Sans, Inter, Cormorant) load from CDN / local assets and
  // may not be ready when the first render runs. Re-fit the cards once they
  // finish loading so the measurements match the final glyph metrics.
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => scheduleAutoFit());
  }

  // pdfmake is loaded as a separate <script>; it may not be ready at module init.
  // Poll briefly, then mark the button enabled / show fallback hint.
  pollPdfReady();
}

// Crop marks: SHARED full gridlines so a single guillotine cut separates
// two adjacent rows/columns at once. 5 vertical lines (left edge + 3
// between columns + right edge) and 5 horizontal lines (top edge + 3
// between rows + bottom edge). The outer edges are needed so the printer
// shows them at the boundary between the shrunk card sheet and the white
// hardware margin around it.
//
// Lines are symmetric around the A4 centre (x = 105 mm, y = 148.5 mm), so
// when the sheet is duplex-printed and flipped the back's lines land on
// the same physical positions as the front — one cut splits both sides.
function renderCropMarks() {
  // Coords inside the kraft sheet (200 × 287 mm — the printable area).
  // 1 unit = 1 mm. The kraft sheet is centred on A4 by the @page 5 mm margin.
  const CW = 47, CH = 67;
  const COLS = 4, ROWS = 4;
  const MX = 6;            // (200 − 4×47) / 2 — kraft border around grid
  const MY = 9.5;          // (287 − 4×67) / 2
  const PAGE_W = 200, PAGE_H = 287;

  const lines = [];
  // Vertical gridlines: left edge + 3 between columns + right edge (5 total)
  for (let c = 0; c <= COLS; c++) {
    const x = MX + c * CW;
    lines.push([x, MY, x, MY + ROWS * CH]);
  }
  // Horizontal gridlines: top edge + 3 between rows + bottom edge (5 total)
  for (let r = 0; r <= ROWS; r++) {
    const y = MY + r * CH;
    lines.push([MX, y, MX + COLS * CW, y]);
  }

  for (const svg of document.querySelectorAll('.a4-cropmarks svg')) {
    svg.setAttribute('viewBox', `0 0 ${PAGE_W} ${PAGE_H}`);
    svg.replaceChildren();
    for (const [x1, y1, x2, y2] of lines) {
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
      ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      svg.appendChild(ln);
    }
  }
}

// Refresh the active state of the poster paper-size toggle buttons.
function updatePosterSizeUI() {
  for (const sb of document.querySelectorAll('.poster-size__btn')) {
    sb.classList.toggle('is-active', sb.dataset.posterSize === state.posterSize);
    sb.setAttribute('aria-pressed', String(sb.dataset.posterSize === state.posterSize));
  }
}

// Write the back-side offset to CSS custom properties so the print stylesheet
// can translate the back A4 sheet by the user-configured amount in mm.
function applyBackOffsetVars() {
  const root = document.documentElement;
  root.style.setProperty('--back-offset-x', state.backOffsetX + 'mm');
  root.style.setProperty('--back-offset-y', state.backOffsetY + 'mm');
}

// Dynamically scale the A4 preview to fill the available preview-pane width.
function setupResponsivePreviewScale() {
  const pane = document.querySelector('.preview-pane');
  if (!pane) return;
  // CSS px equivalents: 1mm = 96 / 25.4 px
  const A4_W_PX = 210 * (96 / 25.4); // ≈ 793.7
  const HORZ_PAD = 24;               // breathing space inside the pane

  const update = () => {
    const availW = pane.clientWidth - HORZ_PAD;
    if (availW <= 0) return;
    let scale = availW / A4_W_PX;
    // Cap so we never blow past actual print size and never collapse to nothing
    scale = Math.min(Math.max(scale, 0.25), 1.0);
    document.documentElement.style.setProperty('--preview-scale', scale.toFixed(3));
  };

  update();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(update);
    ro.observe(pane);
  }
  window.addEventListener('resize', update);
}

// ── Coffee selection modal ────────────────────────────────
// Shows a dialog with one checkbox per coffee (active one pre-checked).
// Resolves with an array of selected coffee IDs, or null if cancelled.
function showSelectionModal({ title, confirmLabel }) {
  return new Promise(resolve => {
    const close = (result) => { overlay.remove(); resolve(result); };

    // Overlay — click outside to cancel
    const overlay = el('div', { class: 'sel-modal-overlay',
      onclick: (e) => { if (e.target === overlay) close(null); },
      onkeydown: (e) => { if (e.key === 'Escape') close(null); },
    });

    // Build checkbox rows
    const checkboxes = [];
    const listEl = el('div', { class: 'sel-modal__list' });
    state.coffees.forEach((coffee, idx) => {
      const cbId   = `_sel_${coffee.id}`;
      // Primary line: roastery (bold) or fallback
      const primary = coffee.roastery || coffee.blend || `${t('coffeeN')} ${idx + 1}`;
      // Secondary line: blend · country · process — only non-empty fields
      const meta = [coffee.blend, coffee.country, coffee.process]
        .filter(Boolean).join(' · ');
      const cb = el('input', { type: 'checkbox', id: cbId, value: coffee.id });
      cb.checked = coffee.id === state.activeCoffeeId;
      checkboxes.push(cb);
      listEl.append(
        el('label', { class: 'sel-modal__item', for: cbId },
          cb,
          el('span', { class: 'sel-modal__num' }, String(idx + 1)),
          el('span', { class: 'sel-modal__info' },
            el('span', { class: 'sel-modal__name' }, primary),
            meta ? el('span', { class: 'sel-modal__meta' }, meta) : null,
          ),
        )
      );
    });

    // "Všetky / Žiadne" toggle
    let allChecked = false;
    const toggleBtn = el('button', { type: 'button', class: 'sel-modal__toggle',
      onclick: () => {
        allChecked = !allChecked;
        checkboxes.forEach(cb => { cb.checked = allChecked; });
        toggleBtn.textContent = allChecked ? t('selNone') : t('selAll');
      },
    }, t('selAll'));

    const dialog = el('div', { class: 'sel-modal', role: 'dialog', 'aria-modal': 'true',
      tabindex: '-1' },
      el('div', { class: 'sel-modal__head' },
        el('h3', { class: 'sel-modal__title' }, title),
        toggleBtn,
      ),
      listEl,
      el('div', { class: 'sel-modal__foot' },
        el('button', { type: 'button', class: 'btn btn--ghost',
          onclick: () => close(null) }, t('cancelBtn')),
        el('button', { type: 'button', class: 'btn btn--primary',
          onclick: () => {
            const ids = checkboxes.filter(c => c.checked).map(c => c.value);
            close(ids.length ? ids : null);
          },
        }, confirmLabel),
      ),
    );
    overlay.append(dialog);
    document.body.append(overlay);
    dialog.focus();
  });
}

function pollPdfReady() {
  const btn = document.getElementById('export-pdf');
  let tries = 0;
  const check = () => {
    if (isPdfExportReady()) {
      btn.classList.remove('btn--coming-soon');
      btn.disabled = false;
      // Pre-warm fonts + kraft + logo in the background so the first
      // user-triggered export doesn't have to wait for fetches.
      preloadPdfAssets();
      return;
    }
    if (tries++ > 40) { // ~4s
      btn.classList.add('btn--coming-soon');
      btn.disabled = true;
      btn.title = 'pdfmake sa nepodarilo načítať (CDN). Skontroluj internet.';
      return;
    }
    setTimeout(check, 100);
  };
  btn.classList.add('btn--coming-soon');
  btn.disabled = true;
  check();
}

init();
