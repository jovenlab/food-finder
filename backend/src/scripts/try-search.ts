// A command-line tool for trying the Open Food Facts integration by hand.
//
// Milestone 6 builds the SERVICE; the HTTP endpoint arrives in Milestone 7. This
// script lets you exercise the service in between, straight from the terminal:
//
//   npm run try:search -- nutella
//   npm run try:search -- nutella de
//   npm run try:search -- zzzznotarealfood
//
// It is a development tool, not part of the running application.

import { searchProducts } from "../services/openFoodFacts.service";
import { AppError } from "../errors/AppError";
import { DEFAULT_LANGUAGE, parseLanguage } from "../types/product";

function formatValue(value: string | number | null): string {
  return value === null ? "—" : String(value);
}

async function main() {
  // process.argv is [node, script, ...our arguments]
  const [termArgument, languageArgument] = process.argv.slice(2);

  if (!termArgument) {
    console.error('Usage: npm run try:search -- "<search term>" [en|nl|de|fr]');
    process.exit(1);
  }

  const language = languageArgument
    ? parseLanguage(languageArgument)
    : DEFAULT_LANGUAGE;

  if (language === null) {
    console.error(`Unsupported language "${languageArgument}". Use en, nl, de or fr.`);
    process.exit(1);
  }

  console.log(`Searching Open Food Facts for "${termArgument}" in "${language}"...`);
  const startedAt = Date.now();

  const result = await searchProducts(termArgument, language);
  const durationMs = Date.now() - startedAt;

  console.log(`\nTook ${durationMs}ms`);
  console.log(`Open Food Facts matched ${result.totalCount} product(s) in total.`);
  console.log(`We kept ${result.products.length} displayable product(s) from this page.\n`);

  if (result.products.length === 0) {
    console.log("No displayable products. This is a normal result, not an error.");
    return;
  }

  // Count how much information is actually missing, which is the point of the
  // exercise: real Open Food Facts data is frequently incomplete.
  let missingBrand = 0;
  let missingImage = 0;
  let missingNutrition = 0;

  for (const product of result.products) {
    if (product.brand === null) missingBrand++;
    if (product.imageUrl === null) missingImage++;
    if (product.nutrition === null) missingNutrition++;

    console.log(`- ${formatValue(product.name)}`);
    console.log(`    barcode:    ${product.code}`);
    console.log(`    brand:      ${formatValue(product.brand)}`);
    console.log(`    quantity:   ${formatValue(product.quantity)}`);
    console.log(`    image:      ${product.imageUrl ? "yes" : "—"}`);
    console.log(`    nutriscore: ${formatValue(product.nutriScore)}`);

    if (product.nutrition === null) {
      console.log("    nutrition:  — (none available)");
    } else {
      const n = product.nutrition;
      console.log(
        `    nutrition:  ${formatValue(n.energyKcal)} kcal | ` +
          `fat ${formatValue(n.fat)}g | sugars ${formatValue(n.sugars)}g | ` +
          `protein ${formatValue(n.proteins)}g | salt ${formatValue(n.salt)}g`
      );
    }
  }

  console.log("\n--- data completeness in this page ---");
  console.log(`missing brand:     ${missingBrand}/${result.products.length}`);
  console.log(`missing image:     ${missingImage}/${result.products.length}`);
  console.log(`missing nutrition: ${missingNutrition}/${result.products.length}`);
}

main().catch((error) => {
  // AppError is an error we anticipated, so show it cleanly rather than dumping
  // a stack trace the reader has to decode.
  if (error instanceof AppError) {
    console.error(`\n[${error.statusCode} ${error.code}] ${error.message}`);
  } else {
    console.error("\nUnexpected error:", error);
  }
  process.exit(1);
});
