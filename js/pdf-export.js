// PDF export — vector A4 (210 × 297 mm) sheet of 16 coffee cards (4 × 4)
// with thin crop marks between cards.
//
// Library: pdfmake (loaded as a global from CDN in index.html).
// Font:    Roboto (pdfmake default; ships with Latin Extended A so all
//          Slovak/Czech diacritics — š, č, ž, ť, ô, ů, ě, ř — render correctly).

import { i18n } from './i18n.js';

// ── Page geometry ────────────────────────────────────────
// pdfmake works in points (1 pt = 1/72 inch). A4 = 595.28 × 841.89 pt.
const PT_PER_MM = 72 / 25.4;
const mm = (v) => v * PT_PER_MM;

const PAGE_W = mm(210);       // 595.276
const PAGE_H = mm(297);       // 841.890

const COLS = 4;
const ROWS = 4;

const CARD_W = PAGE_W / COLS; // 148.819
const CARD_H = PAGE_H / ROWS; // 210.472

// Visual tokens (must roughly match css/styles.css)
const INK         = '#2A1C12';
const INK_SOFT    = '#6B5642';
const LABEL       = '#9A816A';
const ACCENT      = '#A47148';
const PAPER       = '#FBF6EC';
const CROP        = '#B7A685';

// ── Public API ───────────────────────────────────────────
export function isPdfExportReady() {
  return typeof window !== 'undefined' && !!window.pdfMake;
}

export async function exportPdf({ cards, lang, t }) {
  if (!isPdfExportReady()) {
    alert('pdfmake sa nepodarilo načítať. Skontroluj pripojenie na internet a obnov stránku.');
    return;
  }
  const filename = buildFilename(cards);
  const docDef   = buildDocDefinition(cards, t);
  try {
    window.pdfMake.createPdf(docDef).download(filename);
  } catch (e) {
    console.error('PDF export failed:', e);
    alert((i18n[lang]?.exportFail ?? 'PDF export failed') + ': ' + (e?.message || e));
  }
}

// ── docDefinition builder ────────────────────────────────
function buildDocDefinition(cards, t) {
  // Background: cream paper + crop marks (drawn as a single canvas covering the page)
  const background = (currentPage, pageSize) => ({
    canvas: [
      {
        type: 'rect',
        x: 0, y: 0,
        w: pageSize.width, h: pageSize.height,
        color: PAPER,
        lineWidth: 0,
      },
      ...cropLines(),
    ],
  });

  // 4 rows × 4 cols, edge-to-edge — use a borderless table for deterministic layout.
  const body = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const coffee = cards[r * COLS + c] || null;
      row.push(coffee ? cardCell(coffee, t) : { text: '' });
    }
    body.push(row);
  }

  return {
    pageSize: { width: PAGE_W, height: PAGE_H },
    pageMargins: [0, 0, 0, 0],
    background,
    content: [
      {
        table: {
          widths:  Array(COLS).fill(CARD_W),
          heights: Array(ROWS).fill(CARD_H),
          body,
        },
        layout: zeroPaddingNoBorders(),
      },
    ],
    defaultStyle: { font: 'Roboto', color: INK },
    info: {
      title:    'Karticky ku kave',
      author:   'karticky-kava',
      creator:  'karticky-kava (pdfmake)',
      subject:  'Coffee origin cards — 16-up A4',
    },
  };
}

function zeroPaddingNoBorders() {
  return {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft:   () => 0,
    paddingRight:  () => 0,
    paddingTop:    () => 0,
    paddingBottom: () => 0,
  };
}

// ── Crop lines (between rows & columns) ──────────────────
function cropLines() {
  const lines = [];
  for (let i = 1; i < COLS; i++) {
    const x = i * CARD_W;
    lines.push({
      type: 'line',
      x1: x, y1: 0, x2: x, y2: PAGE_H,
      lineWidth: 0.3, lineColor: CROP,
      dash: { length: 2, space: 2 },
    });
  }
  for (let i = 1; i < ROWS; i++) {
    const y = i * CARD_H;
    lines.push({
      type: 'line',
      x1: 0, y1: y, x2: PAGE_W, y2: y,
      lineWidth: 0.3, lineColor: CROP,
      dash: { length: 2, space: 2 },
    });
  }
  return lines;
}

// ── One card (sits inside a table cell of exactly CARD_W × CARD_H) ─────
function cardCell(coffee, t) {
  const PAD_X      = mm(4.5);
  const PAD_TOP    = mm(5);
  const innerW     = CARD_W - PAD_X * 2;
  const colW       = (innerW - mm(3)) / 2;          // two-column field strip
  const ruleW      = mm(20);

  // Inner ornamental stroke
  const decor = {
    canvas: [
      {
        type: 'rect',
        x: mm(1.8), y: mm(1.8),
        w: CARD_W - mm(3.6),
        h: CARD_H - mm(3.6),
        lineWidth: 0.25,
        lineColor: 'rgba(164,113,72,0.20)',
      },
    ],
    margin: [0, 0, 0, -CARD_H + 0.001], // overlay (next element renders on top)
  };

  return {
    stack: [
      decor,

      // Spacer above content
      { text: '', margin: [0, PAD_TOP - mm(1.8), 0, 0] },

      // Eyebrow
      {
        text: (t('roastery') || '').toUpperCase(),
        fontSize: 4.5, color: LABEL, alignment: 'center', characterSpacing: 0.6,
        margin: [PAD_X, 0, PAD_X, 1.5],
      },
      // Title
      {
        text: coffee.roastery || '—',
        fontSize: 14, bold: true, alignment: 'center', lineHeight: 1.05,
        margin: [PAD_X, 0, PAD_X, 0],
      },
      // Decorative rule
      {
        margin: [PAD_X, 4, PAD_X, 6],
        columns: [{
          width: '*',
          alignment: 'center',
          stack: [{
            canvas: [
              { type: 'polyline', closePath: true, lineColor: ACCENT, color: PAPER, lineWidth: 0.3,
                points: [{x:0,y:2.2},{x:1.6,y:0.6},{x:3.2,y:2.2},{x:1.6,y:3.8}] },
              { type: 'line', x1: 4, y1: 2.2, x2: 4 + ruleW, y2: 2.2, lineWidth: 0.4, lineColor: ACCENT },
              { type: 'polyline', closePath: true, lineColor: ACCENT, color: PAPER, lineWidth: 0.3,
                points: [{x:5+ruleW,y:2.2},{x:6.6+ruleW,y:0.6},{x:8.2+ruleW,y:2.2},{x:6.6+ruleW,y:3.8}] },
            ],
          }],
        }],
      },

      // Two-column fields: country / region
      {
        margin: [PAD_X, 0, PAD_X, 4],
        columns: [
          { width: colW, stack: fieldStack(t('country'), coffee.country) },
          { width: mm(3), text: '' },
          { width: colW, stack: fieldStack(t('region'),  coffee.region) },
        ],
      },
      // process / roast
      {
        margin: [PAD_X, 0, PAD_X, 4],
        columns: [
          { width: colW, stack: fieldStack(t('process'), coffee.process) },
          { width: mm(3), text: '' },
          { width: colW, stack: fieldStack(t('roast'),   coffee.roast) },
        ],
      },
      // Full-width flavor
      {
        margin: [PAD_X, 2, PAD_X, 0],
        stack: fieldStack(t('flavor'), coffee.flavor),
      },

      // Description (italic) — centered
      {
        text: coffee.description || '',
        italics: true,
        fontSize: 5.5,
        color: INK_SOFT,
        alignment: 'center',
        lineHeight: 1.35,
        margin: [PAD_X, 8, PAD_X, 0],
      },
    ],
  };
}

function fieldStack(label, value) {
  return [
    {
      text: (label || '').toUpperCase(),
      fontSize: 4.5, color: LABEL, characterSpacing: 0.5,
      margin: [0, 0, 0, 0.5],
    },
    {
      text: value || '—',
      fontSize: 7.5, color: INK, lineHeight: 1.15,
    },
  ];
}

// ── Filename ─────────────────────────────────────────────
function buildFilename(cards) {
  const first = cards.find(c => c && (c.roastery || c.country));
  const base  = first ? slugify(`${first.roastery || ''}-${first.country || ''}`) : 'karticky';
  return `${base}-${todayStamp()}.pdf`;
}

function slugify(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .toLowerCase() || 'karticky';
}
function todayStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}
