// All interface text, in all four languages.
//
// "Internationalization" (i18n) means building the app so its language can be
// changed without changing its code. Every visible string lives here instead of
// being typed into a component, so adding a fifth language would mean adding one
// object to this file and nothing else.
//
// IMPORTANT: this file covers the INTERFACE only - our own labels and messages.
// Product names come from Open Food Facts and we never translate those
// ourselves; we ask for a language and honestly report what we get back.

export const SUPPORTED_LANGUAGES = ["en", "nl", "de", "fr"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

// Language names are always written in their OWN language ("Deutsch", not
// "German"). A German speaker looking at a Dutch interface can still find their
// language - which is the whole point of a language selector.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  fr: "Français",
};

// English is the source of truth: it defines which keys exist.
const en = {
  tagline: "Search packaged food products from Open Food Facts.",
  languageLabel: "Language",

  searchLabel: "Search for a food product",
  searchPlaceholder: "Search for a product, e.g. nutella",
  searchButton: "Search",
  searchingButton: "Searching…",

  initialPrompt: "Search for a packaged food product to see its name, brand and photo.",
  tryLabel: "Try:",
  recentSearches: "Recent searches",

  searchingFor: "Searching for “{term}”…",
  showingResults: "Showing {count} of {total} matches for “{term}”.",

  noResultsTitle: "No products found for “{term}”.",
  noResultsHint: "Try a different spelling, a brand name, or a more general word.",

  retry: "Try again",

  nameNotAvailable: "Name not available",
  noImage: "No image",
  nameLanguageNote: "This product has no name in the selected language.",

  errorNetwork:
    "Could not reach the server. Check that the backend is running, then try again.",
  errorExternalApi:
    "Open Food Facts is temporarily unavailable. This usually means too many searches in a short time — wait a moment and try again.",
  errorTimeout:
    "Open Food Facts took too long to respond. It can be slow at busy times — please try again.",
  errorEmptyTerm: "Please enter something to search for.",
  errorTooLong:
    "That search term is too long. Try something shorter — a product or brand name works best.",
  errorUnsupportedLanguage: "That language is not supported.",
  errorGeneric: "Something went wrong. Please try again.",
} as const;

// Every other language must provide exactly the same keys.
//
// Typing them as `Dictionary` is what makes that a compile error rather than a
// blank space on screen: forget one key in `de` and `npm run build` fails.
export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

const nl: Dictionary = {
  tagline: "Zoek verpakte voedingsmiddelen via Open Food Facts.",
  languageLabel: "Taal",

  searchLabel: "Zoek een voedingsproduct",
  searchPlaceholder: "Zoek een product, bijv. nutella",
  searchButton: "Zoeken",
  searchingButton: "Bezig met zoeken…",

  initialPrompt:
    "Zoek een verpakt voedingsmiddel om de naam, het merk en de foto te zien.",
  tryLabel: "Probeer:",
  recentSearches: "Recente zoekopdrachten",

  searchingFor: "Bezig met zoeken naar “{term}”…",
  showingResults: "{count} van {total} resultaten voor “{term}”.",

  noResultsTitle: "Geen producten gevonden voor “{term}”.",
  noResultsHint: "Probeer een andere spelling, een merknaam of een algemener woord.",

  retry: "Opnieuw proberen",

  nameNotAvailable: "Naam niet beschikbaar",
  noImage: "Geen afbeelding",
  nameLanguageNote: "Dit product heeft geen naam in de geselecteerde taal.",

  errorNetwork:
    "Kan de server niet bereiken. Controleer of de backend draait en probeer het opnieuw.",
  errorExternalApi:
    "Open Food Facts is tijdelijk niet beschikbaar. Meestal komt dit door te veel zoekopdrachten in korte tijd — wacht even en probeer het opnieuw.",
  errorTimeout:
    "Open Food Facts reageerde te traag. Het kan druk zijn — probeer het opnieuw.",
  errorEmptyTerm: "Voer een zoekterm in.",
  errorTooLong:
    "Die zoekterm is te lang. Probeer iets korters — een product- of merknaam werkt het best.",
  errorUnsupportedLanguage: "Die taal wordt niet ondersteund.",
  errorGeneric: "Er is iets misgegaan. Probeer het opnieuw.",
};

const de: Dictionary = {
  tagline: "Suchen Sie verpackte Lebensmittel über Open Food Facts.",
  languageLabel: "Sprache",

  searchLabel: "Nach einem Lebensmittel suchen",
  searchPlaceholder: "Nach einem Produkt suchen, z. B. Nutella",
  searchButton: "Suchen",
  searchingButton: "Suche läuft…",

  initialPrompt:
    "Suchen Sie ein verpacktes Lebensmittel, um Name, Marke und Foto zu sehen.",
  tryLabel: "Versuchen Sie:",
  recentSearches: "Letzte Suchanfragen",

  searchingFor: "Suche nach „{term}“…",
  showingResults: "{count} von {total} Treffern für „{term}“.",

  noResultsTitle: "Keine Produkte für „{term}“ gefunden.",
  noResultsHint:
    "Versuchen Sie eine andere Schreibweise, einen Markennamen oder ein allgemeineres Wort.",

  retry: "Erneut versuchen",

  nameNotAvailable: "Name nicht verfügbar",
  noImage: "Kein Bild",
  nameLanguageNote:
    "Für dieses Produkt gibt es keinen Namen in der ausgewählten Sprache.",

  errorNetwork:
    "Der Server ist nicht erreichbar. Prüfen Sie, ob das Backend läuft, und versuchen Sie es erneut.",
  errorExternalApi:
    "Open Food Facts ist vorübergehend nicht verfügbar. Meist liegt das an zu vielen Suchanfragen in kurzer Zeit — warten Sie einen Moment und versuchen Sie es erneut.",
  errorTimeout:
    "Open Food Facts hat zu lange gebraucht. Zu Stoßzeiten kann es langsam sein — bitte versuchen Sie es erneut.",
  errorEmptyTerm: "Bitte geben Sie einen Suchbegriff ein.",
  errorTooLong:
    "Der Suchbegriff ist zu lang. Versuchen Sie etwas Kürzeres — ein Produkt- oder Markenname funktioniert am besten.",
  errorUnsupportedLanguage: "Diese Sprache wird nicht unterstützt.",
  errorGeneric: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
};

const fr: Dictionary = {
  tagline: "Recherchez des produits alimentaires emballés via Open Food Facts.",
  languageLabel: "Langue",

  searchLabel: "Rechercher un produit alimentaire",
  searchPlaceholder: "Rechercher un produit, par ex. nutella",
  searchButton: "Rechercher",
  searchingButton: "Recherche…",

  initialPrompt:
    "Recherchez un produit alimentaire emballé pour voir son nom, sa marque et sa photo.",
  tryLabel: "Essayez :",
  recentSearches: "Recherches récentes",

  searchingFor: "Recherche de « {term} »…",
  showingResults: "{count} résultats sur {total} pour « {term} ».",

  noResultsTitle: "Aucun produit trouvé pour « {term} ».",
  noResultsHint: "Essayez une autre orthographe, une marque ou un mot plus général.",

  retry: "Réessayer",

  nameNotAvailable: "Nom non disponible",
  noImage: "Pas d’image",
  nameLanguageNote: "Ce produit n’a pas de nom dans la langue sélectionnée.",

  errorNetwork:
    "Impossible de joindre le serveur. Vérifiez que le backend est démarré, puis réessayez.",
  errorExternalApi:
    "Open Food Facts est temporairement indisponible. Cela vient généralement d’un trop grand nombre de recherches en peu de temps — patientez un instant puis réessayez.",
  errorTimeout:
    "Open Food Facts a mis trop de temps à répondre. Le service peut être lent aux heures de pointe — veuillez réessayer.",
  errorEmptyTerm: "Veuillez saisir un terme de recherche.",
  errorTooLong:
    "Ce terme de recherche est trop long. Essayez plus court — un nom de produit ou de marque fonctionne mieux.",
  errorUnsupportedLanguage: "Cette langue n’est pas prise en charge.",
  errorGeneric: "Une erreur s’est produite. Veuillez réessayer.",
};

export const translations: Record<Language, Dictionary> = { en, nl, de, fr };

// Narrows an untrusted string (from localStorage, a URL, anywhere) to a Language.
export function parseLanguage(value: unknown): Language | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lower as Language) ? (lower as Language) : null;
}

// Replaces {placeholders} in a translated string.
//
// Some sentences need values dropped into them, and the position of that value
// differs per language - compare English "Showing 20 of 94,097 matches" with
// French "20 résultats sur 94 097". Putting the placeholder INSIDE the
// translated string lets each language decide the word order. Building the
// sentence by concatenating pieces in the component would make that impossible.
export function interpolate(
  template: string,
  values?: Record<string, string | number>
): string {
  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}
