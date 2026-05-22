// Poster export — single-side A4 or A5 PDF in the Canva design style.
//
// Layout values below come from inspecting the Canva source PDF
// (canva-vzor.pdf). All coordinates are in mm of the A6 source page
// (105 × 150.6 mm) and scale uniformly to A4 / A5 at export time.
//
// Position values are BASELINE positions of each text element as exported
// by the Canva PDF. We convert to pdfmake's top-of-frame y by subtracting
// the font ascent (~0.8 × font size) so the text lands where Canva placed it.

import { i18n } from './i18n.js';

const PT_PER_MM = 72 / 25.4;
const mm = (v) => v * PT_PER_MM;

// Source layout — exact values lifted from canva-vzor.pdf.
const SRC = {
  W: 105.04,
  H: 150.62,

  bgColor:    '#75432C',   // exact bg sampled from rendered Canva
  textColor:  '#FCFBFA',   // exact cream text sampled from Canva

  // Coffee bean icon — top-centre artwork
  icon: { x: 35, y: 8, w: 26, h: 30 },

  // Subtitle (Tabac Regular)
  subtitle: { x: 23.26, baselineY: 51.69, size: 20 },

  // Three big titles (Tabac Bold). Each line has its own X offset
  // for the "ladder" composition. The first two lines are derived
  // from the roastery name (auto-split on whitespace), the third
  // line is the user-entered blend name ("Názov kávy" / JUICY GRAPE).
  titles: [
    { x: 26.86, baselineY: 71.93, size: 40 },   // line 1 — first roastery word
    { x: 15.37, baselineY: 85.95, size: 40 },   // line 2 — rest of roastery
    { x:  6.78, baselineY: 99.96, size: 40 },   // line 3 — blend
  ],

  // 6 field rows (Tabac Bold label + Tabac Regular value)
  fieldLabelX:  8.19,
  fieldValueX: 41.03,
  fieldSize:   14,
  fieldRowsY:  [99.50, 106.70, 113.90, 121.10, 128.30, 135.50],
  // Last field (Chuťový profil) can wrap onto a 2nd line at y=142.58
  fieldFlavorWrapY: 142.58,
};

// Map paper size keyword → mm dimensions
const PAPER = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 },
};

// Scale + centring offsets so the A6 design fits A4 / A5 with margins.
function scaleFor(size) {
  const p = PAPER[size] || PAPER.A4;
  const s = Math.min(p.w / SRC.W, p.h / SRC.H);
  const offsetX = (p.w - SRC.W * s) / 2;
  const offsetY = (p.h - SRC.H * s) / 2;
  return { s, offsetX, offsetY, paper: p };
}

export function isPosterReady() {
  return typeof window !== 'undefined' && !!window.pdfMake;
}

export async function exportPoster({ coffees, size = 'A4', lang, t }) {
  if (!isPosterReady()) {
    alert('pdfmake sa nepodarilo načítať.');
    return;
  }

  const list = coffees.filter(c => (c.roastery || c.blend || '').trim().length > 0);
  if (!list.length) {
    alert(lang === 'cs'
      ? 'Vyplň alespoň jednu kávu (Pražírnu nebo Název kávy).'
      : 'Vyplň aspoň jednu kávu (Pražiareň alebo Názov kávy).');
    return;
  }

  await ensurePosterAssets();

  const cfg = scaleFor(size);
  const fileBase = slugify(list[0].roastery || list[0].blend || 'plagat');
  const filename = `${fileBase}-plagat-${size}-${todayStamp()}.pdf`;
  const docDef = buildDoc(list, cfg, size, t, lang);

  try {
    window.pdfMake.createPdf(docDef).download(filename);
  } catch (e) {
    console.error('Poster export failed:', e);
    alert((i18n[lang]?.exportFail ?? 'PDF export failed') + ': ' + (e?.message || e));
  }
}

// ── Assets ───────────────────────────────────────────────
const TABAC_FILES = {
  'TabacSans-Regular.otf':       'assets/fonts/Tabac-Sans-Regular.otf',
  'TabacSans-Bold.otf':          'assets/fonts/Tabac-Sans-Bold.otf',
  'TabacSans-RegularItalic.otf': 'assets/fonts/Tabac-Sans-Regular-Italic.otf',
  'TabacSans-BoldItalic.otf':    'assets/fonts/Tabac-Sans-Bold-Italic.otf',
};
const COFFEE_ICON_URL = 'assets/coffee-icon.png';
let coffeeIconDataUrl = null;
let posterAssetsReady = false;
async function ensurePosterAssets() {
  if (posterAssetsReady) return;
  if (!window.pdfMake) throw new Error('pdfmake not loaded');
  const entries = await Promise.all(
    Object.entries(TABAC_FILES).map(async ([name, url]) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('Font fetch failed: ' + url);
      const buf = await r.arrayBuffer();
      return [name, abToB64(buf)];
    })
  );
  window.pdfMake.vfs = window.pdfMake.vfs || {};
  for (const [n, b] of entries) window.pdfMake.vfs[n] = b;
  window.pdfMake.fonts = {
    ...(window.pdfMake.fonts || {}),
    TabacPoster: {
      normal:      'TabacSans-Regular.otf',
      bold:        'TabacSans-Bold.otf',
      italics:     'TabacSans-RegularItalic.otf',
      bolditalics: 'TabacSans-BoldItalic.otf',
    },
  };
  // Coffee bean icon — top-centre artwork from Canva
  try {
    const r = await fetch(COFFEE_ICON_URL);
    if (r.ok) {
      const buf = await r.arrayBuffer();
      coffeeIconDataUrl = 'data:image/png;base64,' + abToB64(buf);
    } else {
      console.warn('coffee-icon.png fetch failed:', r.status);
    }
  } catch (e) {
    console.warn('coffee-icon.png load failed:', e);
  }
  posterAssetsReady = true;
}
function abToB64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

// ── Document builder ─────────────────────────────────────
function buildDoc(coffees, cfg, size, t, lang) {
  const { paper } = cfg;
  const content = [];
  coffees.forEach((c, idx) => {
    const page = posterPage(c, cfg, t, lang);
    if (idx > 0) content.push({ text: '', pageBreak: 'before' });
    content.push(...page);
  });

  return {
    pageSize: { width: mm(paper.w), height: mm(paper.h) },
    pageMargins: [0, 0, 0, 0],
    background: (currentPage, pageSize) => ({
      canvas: [{
        type: 'rect',
        x: 0, y: 0,
        w: pageSize.width, h: pageSize.height,
        color: SRC.bgColor,
        lineWidth: 0,
      }],
    }),
    content,
    defaultStyle: { font: 'TabacPoster', color: SRC.textColor },
    info: {
      title:    'Karticky ku kave — plagat',
      author:   'karticky-kava',
      creator:  'karticky-kava (pdfmake)',
      subject:  `Coffee poster ${size}`,
    },
  };
}

// Convert a Canva baseline y (in source mm) to the pdfmake top-of-frame y
// (in destination pt). pdfmake renders text starting at the top of its
// frame; the baseline is approximately ascent_ratio × font_size below it.
// We use 0.80 as the ascent ratio for Tabac Sans (empirical match).
function baselineToPdfmakeY(canvaBaselineMm, fontSizePt, scale, offsetMm) {
  const ascentMm = fontSizePt * 0.80 / 72 * 25.4;
  return mm(offsetMm + (canvaBaselineMm - ascentMm) * scale);
}

// All-uppercase variant of the design's big titles (Canva exported them as
// uppercase already — keep here for clarity).
function up(s) { return (s || '').toUpperCase(); }

function posterPage(coffee, cfg, t, lang) {
  const { s, offsetX, offsetY, paper } = cfg;
  // Full-page width in pt — used for centred text boxes
  const pageW = mm(paper.w);
  const py = (yMm) => mm(offsetY + yMm * s);

  const nodes = [];

  // Coffee bean icon — centred top artwork
  if (coffeeIconDataUrl) {
    nodes.push({
      image: coffeeIconDataUrl,
      width:  mm(SRC.icon.w * s),
      height: mm(SRC.icon.h * s),
      absolutePosition: {
        // centre horizontally on the page
        x: (pageW - mm(SRC.icon.w * s)) / 2,
        y: py(SRC.icon.y),
      },
    });
  }

  // Helper: centred text node at a Canva baseline Y
  const centred = (text, fontSize, baselineY, extra = {}) => ({
    text,
    fontSize,
    alignment: 'center',
    width: pageW,
    absolutePosition: {
      x: 0,
      y: baselineToPdfmakeY(baselineY, fontSize, s, offsetY),
    },
    ...extra,
  });

  // Subtitle
  nodes.push(centred(
    t('posterSubtitle') || 'Práve na mlynčeku',
    SRC.subtitle.size * s,
    SRC.subtitle.baselineY,
  ));

  // 3 big title lines — all centred, font size auto-fitted to poster width
  const titleLines = composeTitleLines(coffee);
  titleLines.forEach((line, i) => {
    const slot = SRC.titles[i];
    if (!slot || !line) return;
    const upper = up(line);
    const fontSize = fitTitleSize(upper, slot.size) * s;
    nodes.push(centred(
      upper,
      fontSize,
      slot.baselineY,
      { bold: true, characterSpacing: 0.3 * s },
    ));
  });

  // 6 field rows — label + value merged, left-aligned from fieldLabelX
  const fieldX  = mm(offsetX + SRC.fieldLabelX * s);
  const fieldW  = mm((SRC.W - SRC.fieldLabelX - 4) * s);
  const rows = [
    ['roastery', coffee.roastery],
    ['country',  coffee.country],
    ['region',   coffee.region],
    ['process',  coffee.process],
    ['roast',    coffee.roast],
    ['flavor',   coffee.flavor],
  ];
  rows.forEach(([key, value], i) => {
    const baselineY = SRC.fieldRowsY[i];
    if (baselineY == null) return;
    nodes.push({
      text: [
        { text: `${t(key)}:  `, bold: true },
        { text: value || '—' },
      ],
      fontSize: SRC.fieldSize * s,
      alignment: 'left',
      width: fieldW,
      absolutePosition: {
        x: fieldX,
        y: baselineToPdfmakeY(baselineY, SRC.fieldSize, s, offsetY),
      },
    });
  });

  return nodes;
}

// Build the 3 big-title lines from the coffee data.
// - 1 roastery word  → [roastery, '', blend]
// - 2+ words         → [word1, rest, blend]
// Missing blend → no third line.
function composeTitleLines(coffee) {
  const words = (coffee.roastery || '').trim().split(/\s+/).filter(Boolean);
  const blend = (coffee.blend || '').trim();
  const lines = [null, null, null];
  if (words.length === 1) {
    lines[0] = words[0];
  } else if (words.length >= 2) {
    lines[0] = words[0];
    lines[1] = words.slice(1).join(' ');
  }
  if (blend) {
    // Place blend in the next free slot
    if (!lines[0]) lines[0] = blend;
    else if (!lines[1]) lines[1] = blend;
    else lines[2] = blend;
  }
  return lines;
}

// Auto-fit font size for a title line so it never overflows the poster width.
// Heuristic: Tabac Sans Bold uppercase avg glyph ≈ 0.58 × em wide.
// Uses 88 % of source page width as the usable line width (≈ 5 mm side margins).
// Returns a source-coordinate pt value (multiply by `s` before passing to pdfmake).
function fitTitleSize(textUpper, maxSizePt) {
  if (!textUpper) return maxSizePt;
  const maxWidthMm = SRC.W * 0.88;                       // ≈ 92.4 mm
  const charWidthPerPt = (25.4 / 72) * 0.58;             // mm per pt per char
  const fitted = maxWidthMm / (textUpper.length * charWidthPerPt);
  return Math.max(Math.min(fitted, maxSizePt), 12);       // clamp [12 pt … maxSizePt]
}

function slugify(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .toLowerCase() || 'plagat';
}
function todayStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}
