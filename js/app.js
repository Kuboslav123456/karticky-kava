// Coffee-card generator — main app logic.
// Vanilla ES module. State lives in `state`, persisted to localStorage,
// rendered into two zones: form panels (left) and A4 preview (right).

import { i18n, DEFAULT_LANG, LANGS } from './i18n.js';
import { exportPdf, isPdfExportReady } from './pdf-export.js';

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
};

// Sanity-check after a localStorage load: keep schema forward-compatible.
state.lang    = LANGS.includes(state.lang) ? state.lang : DEFAULT_LANG;
state.coffees = Array.isArray(state.coffees) && state.coffees.length
  ? state.coffees.map(c => ({ ...blankCoffee(), ...c }))
  : [blankCoffee()];

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
      state.coffees.splice(i, 1);
      if (state.coffees.length === 0) state.coffees.push(blankCoffee());
      distributeCopies();
      saveState();
      renderFormPanels();
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
  const sheet = document.getElementById('a4-sheet');
  if (!sheet) return;
  sheet.replaceChildren();

  const cards = buildCardList();
  for (const coffee of cards) {
    sheet.append(coffee ? buildCardEl(coffee) : buildEmptyCardEl());
  }
}

function buildCardEl(coffee) {
  // Inner card content (the same DOM we designed in step 2)
  const head = el('header', { class: 'card__head' },
    el('div', { class: 'card__eyebrow' }, (t('roastery') || '').toUpperCase()),
    el('h2',  { class: 'card__title' }, coffee.roastery || '—'),
    el('div', { class: 'card__rule', 'aria-hidden': 'true' })
  );

  const dl = el('dl', { class: 'card__fields' });
  const row = (key, full = false) => {
    const div = el('div', { class: `card__field${full ? ' card__field--full' : ''}` },
      el('dt', null, t(key)),
      el('dd', null, coffee[key] || '—'),
    );
    dl.append(div);
  };
  row('country');
  row('region');
  row('process');
  row('roast');
  row('flavor', true);

  const desc = el('p', { class: 'card__desc' }, coffee.description || '');
  if (!coffee.description) desc.classList.add('is-empty');

  const foot = el('footer', { class: 'card__foot', 'aria-hidden': 'true' }, svgIcon('bean'));

  return el('article', { class: 'card' },
    el('div', { class: 'card__inner' }, head, dl, desc, foot)
  );
}

function buildEmptyCardEl() {
  return el('article', { class: 'card card--empty', 'aria-hidden': 'true' },
    el('div', { class: 'card__inner card__inner--empty' })
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
      renderPreview();
    });
  }

  // Add coffee
  document.getElementById('add-coffee').addEventListener('click', () => {
    state.coffees.push(blankCoffee());
    distributeCopies();
    saveState();
    renderFormPanels();
    renderPreview();
  });

  // Reset
  document.getElementById('reset-all').addEventListener('click', () => {
    if (!confirm(t('confirmReset'))) return;
    state.coffees = [blankCoffee()];
    saveState();
    renderFormPanels();
    renderPreview();
  });

  // Export PDF
  document.getElementById('export-pdf').addEventListener('click', () => {
    exportPdf({ coffees: state.coffees, cards: buildCardList(), lang: state.lang, t });
  });

  applyLanguage();
  renderFormPanels();
  renderPreview();

  // pdfmake is loaded as a separate <script>; it may not be ready at module init.
  // Poll briefly, then mark the button enabled / show fallback hint.
  pollPdfReady();
}

function pollPdfReady() {
  const btn = document.getElementById('export-pdf');
  let tries = 0;
  const check = () => {
    if (isPdfExportReady()) {
      btn.classList.remove('btn--coming-soon');
      btn.disabled = false;
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
