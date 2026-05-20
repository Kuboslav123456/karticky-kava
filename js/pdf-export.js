// PDF export — 2-page vector A4 (210 × 297 mm) sheet of 16 coffee cards (4 × 4).
// Page 1 (front): the field rows (bold label + colon + value).
// Page 2 (back):  the description text.
// Each page uses the same kraft-paper background and corner crop-marks,
// matching the original Goriffe template aesthetic.
//
// Library: pdfmake (loaded as a global from CDN in index.html).
// Card font: Tabac Sans (embedded into pdfmake's VFS on first export).

import { i18n } from './i18n.js';

// ── Page geometry ────────────────────────────────────────
const PT_PER_MM = 72 / 25.4;
const mm = (v) => v * PT_PER_MM;

const PAGE_W       = mm(210);   // A4 width  595.276 pt
const PAGE_H       = mm(297);   // A4 height 841.890 pt
// Cards are TRUE-SIZE — no Chrome-shrink compensation. The document has
// a real 5 mm @page margin so the printer never needs to auto-shrink, and
// what's in the code prints at the same physical size on paper.
const SAFE_MARGIN  = mm(5);     // white border around the kraft sheet
const SHEET_W      = mm(200);   // = PAGE_W − 2 × SAFE_MARGIN
const SHEET_H      = mm(287);   // = PAGE_H − 2 × SAFE_MARGIN
const CARD_W       = mm(47);    // 133.228 pt
const CARD_H       = mm(67);    // 189.921 pt
// Card grid is centred inside the kraft sheet.
const KRAFT_GUTTER_X = mm(6);   // (200 − 4×47) / 2
const KRAFT_GUTTER_Y = mm(9.5); // (287 − 4×67) / 2
// Card grid offset from the A4 paper edge:
const MARGIN_X = SAFE_MARGIN + KRAFT_GUTTER_X;   // 11 mm
const MARGIN_Y = SAFE_MARGIN + KRAFT_GUTTER_Y;   // 14.5 mm

const COLS = 4;
const ROWS = 4;

const INK     = '#2A1C12';
const CROP    = '#DCD5C8';     // very faint warm gray — barely-there cutting guide
const TICK_MM = 3;             // length of each crop-mark tick

// ── Tabac Sans + kraft background — VFS registration ────
const TABAC_FILES = {
  'TabacSans-Light.otf':         'assets/fonts/Tabac-Sans-Light.otf',
  'TabacSans-LightItalic.otf':   'assets/fonts/Tabac-Sans-Light-Italic.otf',
  'TabacSans-Regular.otf':       'assets/fonts/Tabac-Sans-Regular.otf',
  'TabacSans-RegularItalic.otf': 'assets/fonts/Tabac-Sans-Regular-Italic.otf',
  'TabacSans-Medium.otf':        'assets/fonts/Tabac-Sans-Medium.otf',
  'TabacSans-MediumItalic.otf':  'assets/fonts/Tabac-Sans-Medium-Italic.otf',
  'TabacSans-Semibold.otf':      'assets/fonts/Tabac-Sans-Semibold.otf',
  'TabacSans-SemiboldItalic.otf':'assets/fonts/Tabac-Sans-Semibold-Italic.otf',
};

let assetsRegistered = false;
let kraftDataUrl = null;
let martinusDataUrl = null;

async function ensureAssetsRegistered() {
  if (assetsRegistered) return;
  if (!window.pdfMake) throw new Error('pdfmake not loaded');

  // Load all OTF files in parallel, base64-encode them, write to vfs.
  const fontEntries = await Promise.all(
    Object.entries(TABAC_FILES).map(async ([vfsName, url]) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load font: ${url}`);
      const buf  = await resp.arrayBuffer();
      return [vfsName, arrayBufferToBase64(buf)];
    })
  );
  window.pdfMake.vfs = window.pdfMake.vfs || {};
  for (const [name, b64] of fontEntries) window.pdfMake.vfs[name] = b64;

  // Load kraft paper as data URL (pdfmake accepts data URLs in image fields).
  const kresp = await fetch('assets/kraft-paper.png');
  if (!kresp.ok) throw new Error('Failed to load kraft-paper.png');
  const kbuf = await kresp.arrayBuffer();
  kraftDataUrl = 'data:image/png;base64,' + arrayBufferToBase64(kbuf);

  // Load Martinus logo (optional — if missing, the card foot simply renders
  // without it so the rest of the export still works).
  try {
    const lresp = await fetch('assets/martinus-logo.png');
    if (lresp.ok) {
      const lbuf = await lresp.arrayBuffer();
      martinusDataUrl = 'data:image/png;base64,' + arrayBufferToBase64(lbuf);
    }
  } catch { /* logo is optional */ }

  window.pdfMake.fonts = {
    ...(window.pdfMake.fonts || {}),
    TabacBody: {
      normal:      'TabacSans-Regular.otf',
      bold:        'TabacSans-Semibold.otf',
      italics:     'TabacSans-RegularItalic.otf',
      bolditalics: 'TabacSans-SemiboldItalic.otf',
    },
  };

  assetsRegistered = true;
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// ── Public API ───────────────────────────────────────────
export function isPdfExportReady() {
  return typeof window !== 'undefined' && !!window.pdfMake;
}

// Pre-warm the VFS so the first user-triggered export doesn't have to wait
// for fonts + kraft + logo fetches. Safe to call multiple times.
export async function preloadPdfAssets() {
  if (!isPdfExportReady()) return false;
  try { await ensureAssetsRegistered(); return true; }
  catch (e) { console.warn('preloadPdfAssets failed:', e); return false; }
}

export async function exportPdf({ cards, lang, t, fieldsPt, descPt, backOffsetX, backOffsetY }) {
  if (!isPdfExportReady()) {
    alert('pdfmake sa nepodarilo načítať. Skontroluj pripojenie na internet a obnov stránku.');
    return;
  }
  const filename = buildFilename(cards);
  try {
    await ensureAssetsRegistered();
    const docDef = buildDocDefinition(cards, t, fieldsPt || [], descPt || [], {
      x: mm(parseFloat(backOffsetX) || 0),
      y: mm(parseFloat(backOffsetY) || 0),
    });
    window.pdfMake.createPdf(docDef).download(filename);
  } catch (e) {
    console.error('PDF export failed:', e);
    alert((i18n[lang]?.exportFail ?? 'PDF export failed') + ': ' + (e?.message || e));
  }
}

// ── docDefinition builder ────────────────────────────────
// Pass per-card pt sizes (one per slot) so the PDF text size matches the
// auto-fit result the user sees on screen.
//
// pdfmake's text wrapping is subtly different from the browser's (slightly
// different glyph metrics), so the same font size can wrap onto an extra
// line in pdfmake and bump the description into the Martinus logo at the
// bottom. Two separate safety factors are applied so each side reserves
// enough room for the logo strip:
//   - Fields: 6 short rows, rarely overflows → mild safety.
//   - Description: long flowing text, much more sensitive → stronger safety.
const PDF_FIT_SAFETY_FIELDS = 0.90;
const PDF_FIT_SAFETY_DESC   = 0.78;

function buildDocDefinition(cards, t, fieldsPt, descPt, backOffset = { x: 0, y: 0 }) {
  // Background: kraft paper (sized to the printable area inside the 5 mm
  // @page margin) + Martinus logos. Crop marks live ONLY on page 1 (front)
  // — cuts go through the paper and split both sides at once, so the back
  // doesn't need its own marks and we avoid duplex-registration drift.
  // Page 2 can be shifted by the user-set duplex offset for content alignment.
  const background = (currentPage, pageSize) => {
    const isBack = currentPage === 2;
    const dx = isBack ? backOffset.x : 0;
    const dy = isBack ? backOffset.y : 0;
    const items = [
      {
        image: kraftDataUrl,
        width:  SHEET_W,
        height: SHEET_H,
        absolutePosition: { x: SAFE_MARGIN + dx, y: SAFE_MARGIN + dy },
      },
      ...cardLogos(dx, dy),
    ];
    if (!isBack) {
      items.splice(1, 0, { canvas: cropMarks(), absolutePosition: { x: 0, y: 0 } });
    }
    return { stack: items };
  };

  // ── Page 1: fields ────────────────────────────────────
  const fieldsBody = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const coffee = cards[idx] || null;
      const pt = (fieldsPt[idx] || 11) * PDF_FIT_SAFETY_FIELDS;
      row.push(coffee ? fieldsCell(coffee, t, pt) : { text: '' });
    }
    fieldsBody.push(row);
  }

  // ── Page 2: descriptions ──────────────────────────────
  const descBody = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const coffee = cards[idx] || null;
      const pt = (descPt[idx] || 14) * PDF_FIT_SAFETY_DESC;
      row.push(coffee ? descCell(coffee, pt) : { text: '' });
    }
    descBody.push(row);
  }

  return {
    pageSize: { width: PAGE_W, height: PAGE_H },
    // Page margins position the table inside the 180×260 mm card grid area.
    pageMargins: [MARGIN_X, MARGIN_Y, MARGIN_X, MARGIN_Y],
    background,
    content: [
      // Page 1 (front) — standard pageMargins flow.
      {
        table: { widths: Array(COLS).fill(CARD_W), heights: Array(ROWS).fill(CARD_H), body: fieldsBody },
        layout: zeroPaddingNoBorders(),
      },
      // Page 2 (back) — SAME mechanism as page 1 (pageMargins flow) so the
      // two pages render through identical pdfmake code paths. The duplex
      // offset is applied via relativePosition (shift from natural position)
      // instead of absolutePosition (which goes through different layout
      // code in pdfmake).
      {
        table: { widths: Array(COLS).fill(CARD_W), heights: Array(ROWS).fill(CARD_H), body: descBody },
        layout: zeroPaddingNoBorders(),
        pageBreak: 'before',
        relativePosition: { x: backOffset.x, y: backOffset.y },
      },
    ],
    defaultStyle: { font: 'TabacBody', color: INK },
    info: {
      title:    'Karticky ku kave',
      author:   'karticky-kava',
      creator:  'karticky-kava (pdfmake)',
      subject:  'Coffee origin cards — 16-up A4, double-sided',
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

// ── Crop marks ───────────────────────────────────────────
// Shared full-length gridlines — 5 vertical (left edge + 3 between cols +
// right edge) and 5 horizontal (top + 3 between rows + bottom). One cut
// along each line splits both adjacent cards. The outer left/right verticals
// make the side trim visible at the boundary between the printed sheet and
// the printer's white hardware-margin area.
function cropMarks() {
  const lines = [];
  for (let c = 0; c <= COLS; c++) {
    const x = MARGIN_X + c * CARD_W;
    lines.push(line(x, MARGIN_Y, x, MARGIN_Y + ROWS * CARD_H));
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = MARGIN_Y + r * CARD_H;
    lines.push(line(MARGIN_X, y, MARGIN_X + COLS * CARD_W, y));
  }
  return lines;
}
function line(x1, y1, x2, y2) {
  return { type: 'line', x1, y1, x2, y2, lineWidth: 0.1, lineColor: CROP };
}

// Position a small Martinus logo at the bottom-centre of every card.
// Returns one pdfmake image node per card slot, absolute-positioned. Accepts
// an optional offset (dx, dy in pt) applied to all logos — used to shift
// the back page by the duplex calibration amount.
function cardLogos(dx = 0, dy = 0) {
  if (!martinusDataUrl) return [];
  const LOGO_BOX = mm(10);     // logo bounding box (square fit)
  const BOTTOM_PAD = mm(1);    // space between logo and card bottom (2 mm lower than before)
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cardLeft = MARGIN_X + c * CARD_W;
      const cardTop  = MARGIN_Y + r * CARD_H;
      out.push({
        image: martinusDataUrl,
        fit: [LOGO_BOX, LOGO_BOX],
        absolutePosition: {
          x: dx + cardLeft + (CARD_W - LOGO_BOX) / 2,
          y: dy + cardTop + CARD_H - LOGO_BOX - BOTTOM_PAD,
        },
        opacity: 0.9,
      });
    }
  }
  return out;
}

// ── Page 1 cell — fields ────────────────────────────────
// Inner padding matches the CSS (6.5 mm top/bottom, 5.5 mm left/right).
// The typed-in value is rendered at 82 % of the label size — same ratio as
// the live preview's `.card__row span { font-size: 0.82em }`.
function fieldsCell(coffee, t, fontSizePt) {
  const PAD_X = mm(5.5);
  const PAD_Y = mm(6.5);
  const VALUE_RATIO = 0.82;

  const row = (key, value) => ({
    margin: [PAD_X, 0, PAD_X, 0],
    text: [
      { text: `${t(key)}: `, bold: true, fontSize: fontSizePt },
      { text: value || '—',        fontSize: fontSizePt * VALUE_RATIO },
    ],
    lineHeight: 1.4,
  });

  return {
    stack: [
      { text: '', margin: [0, PAD_Y, 0, 0] }, // top padding
      row('roastery', coffee.roastery),
      row('country',  coffee.country),
      row('region',   coffee.region),
      row('process',  coffee.process),
      row('roast',    coffee.roast),
      row('flavor',   coffee.flavor),
    ],
  };
}

// ── Page 2 cell — description ───────────────────────────
function descCell(coffee, fontSizePt) {
  const PAD_X = mm(5.5);
  const PAD_Y = mm(6.5);

  return {
    stack: [
      { text: '', margin: [0, PAD_Y, 0, 0] },
      {
        margin: [PAD_X, 0, PAD_X, 0],
        text: coffee.description || '—',
        fontSize: fontSizePt,
        lineHeight: 1.4,
      },
    ],
  };
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
