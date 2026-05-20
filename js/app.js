// Coffee-card generator — main app logic.
// Vanilla ES module. State lives in `state`, persisted to localStorage,
// rendered into two zones: form panels (left) and A4 preview (right).

import { i18n, DEFAULT_LANG, LANGS } from './i18n.js';
import { exportPdf, isPdfExportReady, preloadPdfAssets } from './pdf-export.js';

// ── Constants ────────────────────────────────────────────
const STORAGE_KEY = 'karticky-kava-state-v1';
const CARDS_PER_SHEET = 16;          // 4 × 4 grid on A4

// ── State ────────────────────────────────────────────────
const blankCoffee = () => ({
  id: cryptoRandomId(),
  roastery:    '',
  country:     '',
  region:      '',
  process:     '',
  roast:       '',
  flavor:      '',
  description: '',
  copies:      CARDS_PER_SHEET,
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
};

// Sanity-check after a localStorage load: keep schema forward-compatible.
state.lang    = LANGS.includes(state.lang) ? state.lang : DEFAULT_LANG;
state.coffees = Array.isArray(state.coffees) && state.coffees.length
  ? state.coffees.map(c => ({ ...blankCoffee(), ...c }))
  : [blankCoffee()];
state.previewSelection = state.previewSelection ?? 'all';
state.backOffsetX = clampOffset(state.backOffsetX);
state.backOffsetY = clampOffset(state.backOffsetY);

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
function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function totalCopies() {
  return state.coffees.reduce((s, c) => s + (clampInt(c.copies, 0, CARDS_PER_SHEET) || 0), 0);
}

function distributeCopies() {
  // Spread CARDS_PER_SHEET evenly across coffees; remainder goes to first ones.
  const n = state.coffees.length;
  if (!n) return;
  const base = Math.floor(CARDS_PER_SHEET / n);
  const rem  = CARDS_PER_SHEET % n;
  state.coffees.forEach((c, i) => { c.copies = base + (i < rem ? 1 : 0); });
}

function buildCardList() {
  // If the user picked one specific coffee, show 16 cards of just that one.
  if (state.previewSelection && state.previewSelection !== 'all') {
    const picked = state.coffees.find(c => c.id === state.previewSelection);
    if (picked) return Array(CARDS_PER_SHEET).fill(picked);
  }
  // Default: mix by per-coffee copies count.
  const out = [];
  for (const c of state.coffees) {
    const n = clampInt(c.copies, 0, CARDS_PER_SHEET);
    for (let i = 0; i < n && out.length < CARDS_PER_SHEET; i++) out.push(c);
    if (out.length >= CARDS_PER_SHEET) break;
  }
  while (out.length < CARDS_PER_SHEET) out.push(null);
  return out;
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

function renderFormPanels() {
  const host = document.getElementById('coffee-forms');
  host.replaceChildren();

  state.coffees.forEach((coffee, idx) => {
    host.append(buildCoffeeForm(coffee, idx));
  });

  updateCopiesSummary();
}

function buildCoffeeForm(coffee, idx) {
  const headerLeft = el('div', { class: 'coffee-form__title' },
    el('span', { class: 'coffee-form__num' }, String(idx + 1)),
    el('span', null, t('coffeeN'))
  );

  const copiesInput = el('input', {
    type:      'number',
    min:       '0',
    max:       String(CARDS_PER_SHEET),
    step:      '1',
    value:     String(coffee.copies),
    class:     'copies-input',
    'aria-label': t('copiesLabel'),
    oninput:   e => {
      coffee.copies = clampInt(e.target.value, 0, CARDS_PER_SHEET);
      saveState();
      updateCopiesSummary();
      renderPreview();
    },
    onblur: e => {
      // Snap back to clamped value on blur (in case the user typed e.g. "20")
      e.target.value = String(coffee.copies);
    },
  });

  const removeBtn = el('button', {
    type:    'button',
    class:   'btn btn--ghost btn--icon',
    'data-i18n-title': 'removeCoffee',
    title:   t('removeCoffee'),
    'aria-label': t('removeCoffee'),
    onclick: () => {
      const i = state.coffees.indexOf(coffee);
      if (i < 0) return;
      const removedId = coffee.id;
      state.coffees.splice(i, 1);
      if (state.coffees.length === 0) state.coffees.push(blankCoffee());
      if (state.previewSelection === removedId) state.previewSelection = 'all';
      distributeCopies();
      saveState();
      renderFormPanels();
      renderPreviewSelector();
      renderPreview();
    },
  }, svgIcon('trash'));
  if (state.coffees.length <= 1) removeBtn.disabled = true;

  const head = el('header', { class: 'coffee-form__head' },
    headerLeft,
    el('div', { class: 'coffee-form__head-right' },
      el('label', { class: 'copies-field' },
        el('span', { class: 'copies-field__label', 'data-i18n': 'copiesLabel' }, t('copiesLabel')),
        copiesInput,
        el('span', { class: 'copies-field__suffix', 'data-i18n': 'of16' }, t('of16'))
      ),
      removeBtn
    )
  );

  const fields = el('div', { class: 'fields' });

  const addField = (key, opts = {}) => {
    const inputId = `${coffee.id}-${key}`;
    const labelEl = el('label', { class: 'field', for: inputId },
      el('span', { class: 'field__label', 'data-i18n': key === 'description' ? 'descLabel' : key },
        t(key === 'description' ? 'descLabel' : key)),
    );

    const inputAttrs = {
      id:                 inputId,
      class:              'field__input',
      value:              coffee[key] || '',
      'data-i18n-ph':     `${key}Ph`,
      placeholder:        t(`${key}Ph`),
      autocomplete:       'off',
      spellcheck:         'false',
      oninput: e => {
        coffee[key] = e.target.value;
        saveState();
        // Keep selector chip label in sync when roastery is edited.
        if (key === 'roastery') renderPreviewSelector();
        renderPreview();
      },
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
  addField('country');
  addField('region');
  addField('process');
  addField('roast');
  addField('flavor');
  addField('description', { textarea: true });

  return el('section', { class: 'coffee-form', 'data-coffee-id': coffee.id }, head, fields);
}

function updateCopiesSummary() {
  const total = totalCopies();
  const out   = document.getElementById('copies-summary');
  if (!out) return;
  out.textContent = `${total} / ${CARDS_PER_SHEET}`;
  out.classList.toggle('is-over', total > CARDS_PER_SHEET);
  out.classList.toggle('is-under', total < CARDS_PER_SHEET);
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

// Render the chips that let the user pick which coffee is shown in the
// preview (and exported / printed). 'all' is the default (mixed by copies).
function renderPreviewSelector() {
  const host = document.getElementById('preview-chips');
  if (!host) return;
  host.replaceChildren();

  const makeChip = (id, label, badgeText) => {
    const chip = el('button', {
      type: 'button',
      class: `preview-chip${state.previewSelection === id ? ' is-active' : ''}`,
      onclick: () => {
        state.previewSelection = id;
        saveState();
        // Refresh chip active states + preview
        for (const c of host.querySelectorAll('.preview-chip')) {
          c.classList.toggle('is-active', c.dataset.sel === id);
        }
        renderPreview();
      },
    },
      el('span', null, label),
      badgeText ? el('span', { class: 'preview-chip__badge' }, badgeText) : null,
    );
    chip.dataset.sel = id;
    return chip;
  };

  // "Všetky" — mixed by copies
  host.append(makeChip('all', t('selectAll'), `${Math.min(totalCopies(), CARDS_PER_SHEET)}/${CARDS_PER_SHEET}`));

  // One chip per coffee
  state.coffees.forEach((c, idx) => {
    const name = c.roastery ? c.roastery : `${t('coffeeN')} ${idx + 1}`;
    host.append(makeChip(c.id, name, `${CARDS_PER_SHEET}×`));
  });
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
    bean:  ['M7 14c0-3 3-5 5-5s5 2 5 5-3 5-5 5-5-2-5-5z', 'M12 9V4'],
    trash: ['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14', 'M10 11v6', 'M14 11v6'],
    plus:  ['M12 5v14', 'M5 12h14'],
    pdf:   ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 14h6', 'M9 18h4'],
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
      renderPreviewSelector();
      renderPreview();
    });
  }

  // Add coffee
  document.getElementById('add-coffee').addEventListener('click', () => {
    state.coffees.push(blankCoffee());
    distributeCopies();
    saveState();
    renderFormPanels();
    renderPreviewSelector();
    renderPreview();
  });

  // Reset
  document.getElementById('reset-all').addEventListener('click', () => {
    if (!confirm(t('confirmReset'))) return;
    state.coffees = [blankCoffee()];
    state.previewSelection = 'all';
    saveState();
    renderFormPanels();
    renderPreviewSelector();
    renderPreview();
  });

  // Export PDF — reads the per-card font-sizes that the auto-fit settled on
  // so the PDF matches what the user sees in the preview. Wrapped in a
  // small async dance so the button can show a "generating" state before
  // pdfmake's heavy work blocks the main thread.
  document.getElementById('export-pdf').addEventListener('click', async () => {
    const btn = document.getElementById('export-pdf');
    const label = btn.querySelector('span') || btn;
    const originalText = label.textContent;
    btn.disabled = true;
    label.textContent = t('exporting');
    btn.classList.add('btn--busy');

    // Make sure auto-fit has run with the latest content before snapshotting.
    if (_autoFitTimer) { clearTimeout(_autoFitTimer); _autoFitTimer = 0; }
    autoFitCards();
    const fieldsPt = [...document.querySelectorAll('#a4-sheet-fields .card .card__inner')]
      .map(el => parseFloat(el.dataset.fitPt) || 11);
    const descPt = [...document.querySelectorAll('#a4-sheet-desc .card .card__inner')]
      .map(el => parseFloat(el.dataset.fitPt) || 14);

    // Yield twice to the browser so the disabled / "generating" label
    // paints before the heavy pdfmake work starts.
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    try {
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
    } finally {
      // Restore the button state.
      btn.disabled = false;
      btn.classList.remove('btn--busy');
      label.textContent = originalText;
    }
  });

  // Print — uses the browser's native print dialog. Card sizes are
  // pre-enlarged (52.5 × 72.4167 mm) so that Chrome's auto-shrink to fit
  // the printer's hardware margins lands them at ~46.7 × 66.8 mm.
  document.getElementById('print-btn').addEventListener('click', () => {
    window.print();
  });

  // Back-side offset inputs (per-printer duplex calibration).
  const offX = document.getElementById('back-offset-x');
  const offY = document.getElementById('back-offset-y');
  offX.value = state.backOffsetX;
  offY.value = state.backOffsetY;
  const onOffsetChange = () => {
    state.backOffsetX = clampOffset(offX.value);
    state.backOffsetY = clampOffset(offY.value);
    saveState();
    applyBackOffsetVars();
  };
  offX.addEventListener('input',  onOffsetChange);
  offY.addEventListener('input',  onOffsetChange);
  offX.addEventListener('change', onOffsetChange);
  offY.addEventListener('change', onOffsetChange);
  applyBackOffsetVars();

  applyLanguage();
  renderFormPanels();
  renderPreviewSelector();
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
