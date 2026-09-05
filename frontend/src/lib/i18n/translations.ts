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

  subscribeTitle: "Unlock nutritional information",
  subscribeBody: "Everyone can see product names, brands and photos. Detailed nutrition needs a subscription.",
  subscribeButton: "Subscribe monthly",
  subscribeStarting: "Opening Stripe…",
  subscribedTitle: "Subscription active",
  subscribedUntil: "Renews {date}",
  subscribedCancelling: "Ends {date}",
  subscriptionStatus: "Subscription status: {status}",
  checkoutCancelled: "Checkout was cancelled. Nothing has been charged.",
  checkoutConfirming: "Payment received. Waiting for Stripe to confirm your subscription…",
  checkoutConfirmed: "Your subscription is active. Thank you!",
  checkoutStillWaiting: "Still waiting for Stripe to confirm. This can take a moment — reload the page shortly.",

  searchingFor: "Searching for “{term}”…",
  showingResults: "Showing {count} of {total} matches for “{term}”.",

  noResultsTitle: "No products found for “{term}”.",
  noResultsHint: "Try a different spelling, a brand name, or a more general word.",

  retry: "Try again",

  nameNotAvailable: "Name not available",
  noImage: "No image",
  nameLanguageNote: "This product has no name in the selected language.",

  nutritionTitle: "Nutrition per 100 g",
  nutritionLocked: "Subscribe to see nutritional values",
  nutritionNone: "No nutritional data available",
  nutritionEnergy: "Energy",
  nutritionFat: "Fat",
  nutritionSaturatedFat: "of which saturates",
  nutritionCarbohydrates: "Carbohydrates",
  nutritionSugars: "of which sugars",
  nutritionFiber: "Fibre",
  nutritionProteins: "Protein",
  nutritionSalt: "Salt",

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

  subscribeTitle: "Voedingswaarden ontgrendelen",
  subscribeBody: "Iedereen ziet productnamen, merken en foto's. Gedetailleerde voedingswaarden vereisen een abonnement.",
  subscribeButton: "Maandelijks abonneren",
  subscribeStarting: "Stripe wordt geopend…",
  subscribedTitle: "Abonnement actief",
  subscribedUntil: "Verlengt op {date}",
  subscribedCancelling: "Loopt af op {date}",
  subscriptionStatus: "Abonnementsstatus: {status}",
  checkoutCancelled: "Afrekenen is geannuleerd. Er is niets in rekening gebracht.",
  checkoutConfirming: "Betaling ontvangen. We wachten tot Stripe je abonnement bevestigt…",
  checkoutConfirmed: "Je abonnement is actief. Bedankt!",
  checkoutStillWaiting: "Nog steeds wachten op bevestiging van Stripe. Dit kan even duren — laad de pagina zo opnieuw.",

  searchingFor: "Bezig met zoeken naar “{term}”…",
  showingResults: "{count} van {total} resultaten voor “{term}”.",

  noResultsTitle: "Geen producten gevonden voor “{term}”.",
  noResultsHint: "Probeer een andere spelling, een merknaam of een algemener woord.",

  retry: "Opnieuw proberen",

  nameNotAvailable: "Naam niet beschikbaar",
  noImage: "Geen afbeelding",
  nameLanguageNote: "Dit product heeft geen naam in de geselecteerde taal.",

  nutritionTitle: "Voedingswaarde per 100 g",
  nutritionLocked: "Abonneer om voedingswaarden te zien",
  nutritionNone: "Geen voedingsgegevens beschikbaar",
  nutritionEnergy: "Energie",
  nutritionFat: "Vetten",
  nutritionSaturatedFat: "waarvan verzadigd",
  nutritionCarbohydrates: "Koolhydraten",
  nutritionSugars: "waarvan suikers",
  nutritionFiber: "Vezels",
  nutritionProteins: "Eiwitten",
  nutritionSalt: "Zout",

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

  subscribeTitle: "Nährwertangaben freischalten",
  subscribeBody: "Produktnamen, Marken und Fotos sind für alle sichtbar. Detaillierte Nährwerte erfordern ein Abonnement.",
  subscribeButton: "Monatlich abonnieren",
  subscribeStarting: "Stripe wird geöffnet…",
  subscribedTitle: "Abonnement aktiv",
  subscribedUntil: "Verlängert sich am {date}",
  subscribedCancelling: "Endet am {date}",
  subscriptionStatus: "Abonnementstatus: {status}",
  checkoutCancelled: "Der Bezahlvorgang wurde abgebrochen. Es wurde nichts berechnet.",
  checkoutConfirming: "Zahlung erhalten. Wir warten auf die Bestätigung durch Stripe…",
  checkoutConfirmed: "Ihr Abonnement ist aktiv. Vielen Dank!",
  checkoutStillWaiting: "Warten weiterhin auf die Bestätigung von Stripe. Das kann einen Moment dauern — laden Sie die Seite gleich neu.",

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

  nutritionTitle: "Nährwerte pro 100 g",
  nutritionLocked: "Abonnieren, um Nährwerte zu sehen",
  nutritionNone: "Keine Nährwertangaben verfügbar",
  nutritionEnergy: "Energie",
  nutritionFat: "Fett",
  nutritionSaturatedFat: "davon gesättigte Fettsäuren",
  nutritionCarbohydrates: "Kohlenhydrate",
  nutritionSugars: "davon Zucker",
  nutritionFiber: "Ballaststoffe",
  nutritionProteins: "Eiweiß",
  nutritionSalt: "Salz",

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

  subscribeTitle: "Débloquer les informations nutritionnelles",
  subscribeBody: "Les noms de produits, les marques et les photos sont visibles par tous. Les valeurs nutritionnelles détaillées nécessitent un abonnement.",
  subscribeButton: "S’abonner mensuellement",
  subscribeStarting: "Ouverture de Stripe…",
  subscribedTitle: "Abonnement actif",
  subscribedUntil: "Renouvellement le {date}",
  subscribedCancelling: "Se termine le {date}",
  subscriptionStatus: "Statut de l’abonnement : {status}",
  checkoutCancelled: "Le paiement a été annulé. Rien n’a été débité.",
  checkoutConfirming: "Paiement reçu. En attente de confirmation par Stripe…",
  checkoutConfirmed: "Votre abonnement est actif. Merci !",
  checkoutStillWaiting: "Toujours en attente de confirmation de Stripe. Cela peut prendre un instant — rechargez la page dans un moment.",

  searchingFor: "Recherche de « {term} »…",
  showingResults: "{count} résultats sur {total} pour « {term} ».",

  noResultsTitle: "Aucun produit trouvé pour « {term} ».",
  noResultsHint: "Essayez une autre orthographe, une marque ou un mot plus général.",

  retry: "Réessayer",

  nameNotAvailable: "Nom non disponible",
  noImage: "Pas d’image",
  nameLanguageNote: "Ce produit n’a pas de nom dans la langue sélectionnée.",

  nutritionTitle: "Valeurs nutritionnelles pour 100 g",
  nutritionLocked: "Abonnez-vous pour voir les valeurs nutritionnelles",
  nutritionNone: "Aucune donnée nutritionnelle disponible",
  nutritionEnergy: "Énergie",
  nutritionFat: "Matières grasses",
  nutritionSaturatedFat: "dont acides gras saturés",
  nutritionCarbohydrates: "Glucides",
  nutritionSugars: "dont sucres",
  nutritionFiber: "Fibres",
  nutritionProteins: "Protéines",
  nutritionSalt: "Sel",

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
