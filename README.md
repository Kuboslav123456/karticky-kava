# Generátor kartičiek ku káve

Jednoduchá webová aplikácia na tvorbu A4 hárkov so **16 kartičkami ku káve (mriežka 4×4)** určenými na strihanie. Vhodné pre kaviarne a pražiarne, ktoré chcú zákazníkom dať ku každej káve malú kartičku s informáciami o pôvode, spracovaní a chuťovom profile.

## Funkcie

- Formulár s poliami: **Pražiareň**, **Krajina**, **Región**, **Spracovanie**, **Praženie**, **Chuťový profil**, **Popis** (2–3 vety)
- **Živý náhľad** A4 strany so 16 kartičkami — zmeny vo formulári sa hneď odzrkadlia na hárku
- **Viac káv na jeden hárok**: tlačidlo *Pridať ďalšiu kávu* — môžeš mať napr. 8× kávu A + 8× kávu B
- **Prepínač jazyka SK / CS** — lokalizujú sa popisky polí a labely na kartičke (hodnoty, ktoré napíšeš, sa **neprekladajú**)
- **Automatické ukladanie** stavu do `localStorage` (kávy, jazyk, počty kópií)
- **Export do PDF** cez [pdfmake](https://pdfmake.github.io/) — vektorový výstup, presné A4 (210 × 297 mm), texty ostávajú ako text (nie raster), tenké strihové čiary medzi kartičkami
- Plná podpora slovenskej a českej diakritiky (š, č, ž, ť, ô, ä, ů, ě, ř — overené v Roboto)
- Vanilla **HTML + CSS + JS**, žiadny build, žiadne `node_modules`, žiadny framework

## Štruktúra projektu

```
/
├── index.html
├── css/styles.css
├── js/app.js              ← stav, formulár, mriežka, lokalizácia
├── js/i18n.js             ← SK + CS reťazce
├── js/pdf-export.js       ← pdfmake docDefinition pre A4 4×4
├── assets/                ← (rezervované pre prípadné ikony, logo)
├── _dev-server.js         ← drobný lokálny HTTP server (Node, bez závislostí)
├── README.md
├── LICENSE                ← MIT
└── .gitignore
```

## Lokálne spustenie

Keďže ide o vanilla HTML/JS, stačí ľubovoľný lokálny HTTP server — `file://` blokuje ES moduly v niektorých prehliadačoch.

**0. Windows — dvojklik na `spustit-server.bat`:**
Spustí Node dev server v tomto priečinku a automaticky otvorí `http://localhost:8765` v prehliadači. Zastavíš zatvorením cmd okna alebo `CTRL+C`.

**1. Node bez balíkov (žiadna inštalácia):**

```bash
node _dev-server.js
# → http://localhost:8765
```

**2. Python (zvyčajne predinštalovaný na Linux/macOS):**

```bash
python3 -m http.server 8000          # Linux / macOS
py -m http.server 8000               # Windows
# → http://localhost:8000
```

**3. `npx serve` (vyžaduje Node):**

```bash
npx serve
```

**4. VS Code Live Server:** Pravým klikom na `index.html` → *Open with Live Server*.

## Použitie

1. **Vyplň formulár** vľavo (Pražiareň, Krajina, …).
2. Vpravo sa živo renderuje **A4 strana so 16 kartičkami**.
3. *Pridať ďalšiu kávu* — môžeš mať viacero variantov; pole **Kópií** určuje koľko slotov dostane každá káva. Suma musí byť **16 ≤** (zobrazí sa pod tlačidlom).
4. **SK / CS** — prepneš jazyk popisov; hodnoty sa nemenia.
5. **Exportovať PDF** — stiahne sa A4 PDF (vektorový), pripravený na tlač a strihanie.

## Deploy na GitHub Pages

1. `git init && git add . && git commit -m "Initial commit"`
2. Vytvor nový repozitár na GitHube (napr. `karticky-kava`).
3. `git remote add origin git@github.com:<username>/karticky-kava.git`
4. `git branch -M main && git push -u origin main`
5. Na GitHube: **Settings → Pages → Source: `main` branch, `/` root → Save**.
6. Po pár sekundách bude web dostupný na `https://<username>.github.io/karticky-kava/`.

Keďže ide o **čisté statické HTML/JS bez buildu**, GitHub Pages funguje out-of-the-box — žiadne GitHub Actions netreba.

## Technické poznámky

- **PDF font**: Roboto (regular / medium / italic) — pdfmake-ov default, ktorý má v subsetoch celú Latin Extended-A → diakritika SK + CS je v poriadku
- **Rozmery v PDF**: page size `595.275591 × 841.889764 pt`, čo je presne 210 × 297 mm; okraje 0
- **Strihové značky**: tenké prerušované hairlines medzi stĺpcami (25 %, 50 %, 75 %) a riadkami (25 %, 50 %, 75 %)
- **Skutočný rozmer jednej kartičky** pri tlači: **52,5 × 74,25 mm**
- Súbor sa pomenuje `<pražiareň>-<krajina>-<RRRRMMDD>.pdf` (napr. `goriffe-nikaragua-20260518.pdf`)

## Licencia

[MIT](./LICENSE)
