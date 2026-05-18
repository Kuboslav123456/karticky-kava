// Localization strings — Slovak (sk, default) and Czech (cs).
// Only UI text + card labels are translated. Field VALUES (the things the user
// types into the form) are never translated — the user writes them directly in
// the target language.

export const i18n = {
  sk: {
    // App chrome
    appTitle:      "Generátor kartičiek ku káve",
    appSubtitle:   "A4 hárok 4×4 — pripravený na strihanie a tlač",
    languageLabel: "Jazyk",
    addCoffee:     "+ Pridať ďalšiu kávu",
    removeCoffee:  "Odstrániť kávu",
    exportPdf:     "Exportovať PDF",
    coffeeN:       "Káva",
    copiesLabel:   "Kópií",
    of16:          "z 16",
    cardsTotal:    "Spolu kartičiek",
    autoSaved:     "Automaticky uložené",
    resetAll:      "Vymazať všetko",
    confirmReset:  "Naozaj vymazať všetky kávy a začať odznova?",

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
    appSubtitle:   "Arch A4 4×4 — připravený k rozstříhání a tisku",
    languageLabel: "Jazyk",
    addCoffee:     "+ Přidat další kávu",
    removeCoffee:  "Odstranit kávu",
    exportPdf:     "Exportovat PDF",
    coffeeN:       "Káva",
    copiesLabel:   "Kopií",
    of16:          "z 16",
    cardsTotal:    "Celkem kartiček",
    autoSaved:     "Automaticky uloženo",
    resetAll:      "Vymazat vše",
    confirmReset:  "Opravdu vymazat všechny kávy a začít znovu?",

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
