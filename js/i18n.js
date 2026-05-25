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
    addCoffee:        "+ Pridať ďalšiu kávu",
    addUnderRoastery: "Pridať pod",
    removeCoffee:     "Odstrániť kávu",
    duplicateCoffee:  "Duplikovať kávu",
    coffeeDeleted:    "Káva odstránená",
    undo:             "Späť",
    searchPh:         "Hľadať pražiareň, kávu…",
    exportPdf:     "Exportovať PDF",
    printBtn:      "Tlačiť",
    previewLabel:  "Náhľad",
    selectAll:     "Všetky",
    coffeeN:       "Káva",
    copiesLabel:   "Kópií",
    of16:          "z 16",
    cardsTotal:    "Spolu kartičiek",
    autoSaved:     "Automaticky uložené",
    backOffsetTitle: "Kalibrácia obojstrannej tlače",
    backOffsetHelp:  "Ak po obojstrannej tlači orezové čiary nelícujú, posuň zadnú stranu o niekoľko mm:",
    backOffsetX:     "Posun X (mm)",
    backOffsetY:     "Posun Y (mm)",
    exportPoster:    "Exportovať plagát",
    posterSubtitle:  "Práve na mlynčeku",

    // Selection modal
    cancelBtn:          "Zrušiť",
    selAll:             "Všetky",
    selNone:            "Žiadne",
    printSelectTitle:   "Vybrať kartičky na tlač",
    exportSelectTitle:  "Vybrať kartičky na export PDF",
    posterSelectTitle:  "Vybrať plagáty na export",

    // Card / form field labels
    roastery: "Pražiareň",
    blend:    "Názov kávy",
    country:  "Krajina",
    region:   "Región",
    process:  "Spracovanie",
    roast:    "Praženie",
    flavor:   "Chuťový profil",
    descLabel:"Popis",

    // Placeholders
    roasteryPh: "napr. Goriffe",
    blendPh:    "napr. Juicy Grape",
    blendHint:  "Len pre plagát, nie pre kartičku",
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

    // DB import / export
    dbPanel:         "Databáza",
    dbPanelDesc:     "Záloha všetkých kartičiek vo formáte JSON.",
    exportDb:        "↓ Exportovať",
    importDb:        "↑ Importovať",
    importConfirm:   "Importom sa prepíšu všetky aktuálne kávy. Pokračovať?",
    importErrorFile: "Súbor sa nepodarilo načítať.",
    importErrorFmt:  "Súbor nie je platný export kartičiek.",
    importSuccess:   "Importovaných káv:",
  },

  cs: {
    appTitle:      "Generátor kartiček ke kávě",
    appSubtitle:   "Oboustranný arch A4 4×4 — připravený k tisku a rozstříhání",
    languageLabel: "Jazyk",
    frontLabel:    "Strana A — políčka",
    backLabel:     "Strana B — popis",
    addCoffee:        "+ Přidat další kávu",
    addUnderRoastery: "Přidat pod",
    removeCoffee:     "Odstranit kávu",
    duplicateCoffee:  "Duplikovat kávu",
    coffeeDeleted:    "Káva odstraněna",
    undo:             "Zpět",
    searchPh:         "Hledat pražírnu, kávu…",
    exportPdf:     "Exportovat PDF",
    printBtn:      "Tisknout",
    previewLabel:  "Náhled",
    selectAll:     "Všechny",
    coffeeN:       "Káva",
    copiesLabel:   "Kopií",
    of16:          "z 16",
    cardsTotal:    "Celkem kartiček",
    autoSaved:     "Automaticky uloženo",
    backOffsetTitle: "Kalibrace oboustranného tisku",
    backOffsetHelp:  "Pokud po oboustranném tisku ořezové čáry nelícují, posuň zadní stranu o několik mm:",
    backOffsetX:     "Posun X (mm)",
    backOffsetY:     "Posun Y (mm)",
    exportPoster:    "Exportovat plakát",
    posterSubtitle:  "Právě na mlýnku",

    // Selection modal
    cancelBtn:          "Zrušit",
    selAll:             "Všechny",
    selNone:            "Žádné",
    printSelectTitle:   "Vybrat kartičky k tisku",
    exportSelectTitle:  "Vybrat kartičky pro export PDF",
    posterSelectTitle:  "Vybrat plakáty pro export",

    roastery: "Pražírna",
    blend:    "Název kávy",
    country:  "Země",
    region:   "Region",
    process:  "Zpracování",
    roast:    "Pražení",
    flavor:   "Chuťový profil",
    descLabel:"Popis",

    roasteryPh: "např. Goriffe",
    blendPh:    "např. Juicy Grape",
    blendHint:  "Jen pro plakát, ne pro kartičku",
    countryPh:  "např. Nikaragua",
    regionPh:   "např. Jinotega",
    processPh:  "např. washed",
    roastPh:    "např. medium roast",
    flavorPh:   "např. kešu, mléčná čokoláda, sušený pomeranč",
    descPh:     "Krátký popis (~2–3 věty) o původu, charakteru a chuti kávy.",

    exporting:  "Připravuji PDF…",
    exportDone: "Hotovo",
    exportFail: "Export PDF selhal",

    // DB import / export
    dbPanel:         "Databáze",
    dbPanelDesc:     "Záloha všech kartiček ve formátu JSON.",
    exportDb:        "↓ Exportovat",
    importDb:        "↑ Importovat",
    importConfirm:   "Import přepíše všechny aktuální kávy. Pokračovat?",
    importErrorFile: "Soubor se nepodařilo načíst.",
    importErrorFmt:  "Soubor není platný export kartiček.",
    importSuccess:   "Importováno káv:",
  },
};

export const DEFAULT_LANG = 'sk';
export const LANGS = ['sk', 'cs'];
