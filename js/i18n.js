// Localization strings — Slovak (sk, default) and Czech (cs).
// Only UI text + card labels are translated. Field VALUES (the things the user
// types into the form) are never translated — the user writes them directly in
// the target language.

export const i18n = {
  sk: {
    // App chrome
    appTitle:      "Generátor kartičiek ku káve",
    appSubtitle:   "Obojstranný A4 hárok 4×4 — pripravený na tlač a strihanie",
    languageLabel: "Jazyk",
    frontLabel:    "Strana A — políčka",
    backLabel:     "Strana B — popis",
    addCoffee:     "+ Pridať ďalšiu kávu",
    removeCoffee:  "Odstrániť kávu",
    exportPdf:     "Exportovať PDF",
    printBtn:      "Tlačiť",
    previewLabel:  "Náhľad",
    selectAll:     "Všetky",
    coffeeN:       "Káva",
    copiesLabel:   "Kópií",
    of16:          "z 16",
    cardsTotal:    "Spolu kartičiek",
    autoSaved:     "Automaticky uložené",
    resetAll:      "Vymazať všetko",
    confirmReset:  "Naozaj vymazať všetky kávy a začať odznova?",
    backOffsetTitle: "Kalibrácia obojstrannej tlače",
    backOffsetHelp:  "Ak po obojstrannej tlači orezové čiary nelícujú, posuň zadnú stranu o niekoľko mm:",
    backOffsetX:     "Posun X (mm)",
    backOffsetY:     "Posun Y (mm)",

    // Card / form field labels
    roastery: "Pražiareň",
    country:  "Krajina",
    region:   "Región",
    process:  "Spracovanie",
    roast:    "Praženie",
    flavor:   "Chuťový profil",
    descLabel:"Popis",

    // Placeholders
    roasteryPh: "napr. Goriffe",
    countryPh:  "napr. Nikaragua",
    regionPh:   "napr. Jinotega",
    processPh:  "napr. washed",
    roastPh:    "napr. medium roast",
    flavorPh:   "napr. kešu, mliečna čokoláda, sušený pomaranč",
    descPh:     "Krátky popis (~2–3 vety) o pôvode, charaktere a chuti kávy.",

    // PDF export
    exporting:  "Pripravujem PDF…",
    exportDone: "Hotovo",
    exportFail: "PDF export zlyhal",
  },

  cs: {
    appTitle:      "Generátor kartiček ke kávě",
    appSubtitle:   "Oboustranný arch A4 4×4 — připravený k tisku a rozstříhání",
    languageLabel: "Jazyk",
    frontLabel:    "Strana A — políčka",
    backLabel:     "Strana B — popis",
    addCoffee:     "+ Přidat další kávu",
    removeCoffee:  "Odstranit kávu",
    exportPdf:     "Exportovat PDF",
    printBtn:      "Tisknout",
    previewLabel:  "Náhled",
    selectAll:     "Všechny",
    coffeeN:       "Káva",
    copiesLabel:   "Kopií",
    of16:          "z 16",
    cardsTotal:    "Celkem kartiček",
    autoSaved:     "Automaticky uloženo",
    resetAll:      "Vymazat vše",
    confirmReset:  "Opravdu vymazat všechny kávy a začít znovu?",
    backOffsetTitle: "Kalibrace oboustranného tisku",
    backOffsetHelp:  "Pokud po oboustranném tisku ořezové čáry nelícují, posuň zadní stranu o několik mm:",
    backOffsetX:     "Posun X (mm)",
    backOffsetY:     "Posun Y (mm)",

    roastery: "Pražírna",
    country:  "Země",
    region:   "Region",
    process:  "Zpracování",
    roast:    "Pražení",
    flavor:   "Chuťový profil",
    descLabel:"Popis",

    roasteryPh: "např. Goriffe",
    countryPh:  "např. Nikaragua",
    regionPh:   "např. Jinotega",
    processPh:  "např. washed",
    roastPh:    "např. medium roast",
    flavorPh:   "např. kešu, mléčná čokoláda, sušený pomeranč",
    descPh:     "Krátký popis (~2–3 věty) o původu, charakteru a chuti kávy.",

    exporting:  "Připravuji PDF…",
    exportDone: "Hotovo",
    exportFail: "Export PDF selhal",
  },
};

export const DEFAULT_LANG = 'sk';
export const LANGS = ['sk', 'cs'];
