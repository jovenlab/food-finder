"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Nutrition } from "@/lib/types";
import type { TranslationKey } from "@/lib/i18n/translations";

// The nutritional values for one product.
//
// This component renders whatever the backend chose to send. It performs no
// access check of its own, because a check here would be worthless: the decision
// was already made on the server, and if `nutrition` is null there is genuinely
// nothing in the response to display.
//
// That is the whole point of Milestone 16. The interface is not hiding the data
// - the data was never sent.

// Each row: which translated label, which field, and what unit it is measured in.
const ROWS: Array<{ key: TranslationKey; field: keyof Nutrition; unit: string }> = [
  { key: "nutritionEnergy", field: "energyKcal", unit: "kcal" },
  { key: "nutritionFat", field: "fat", unit: "g" },
  { key: "nutritionSaturatedFat", field: "saturatedFat", unit: "g" },
  { key: "nutritionCarbohydrates", field: "carbohydrates", unit: "g" },
  { key: "nutritionSugars", field: "sugars", unit: "g" },
  { key: "nutritionFiber", field: "fiber", unit: "g" },
  { key: "nutritionProteins", field: "proteins", unit: "g" },
  { key: "nutritionSalt", field: "salt", unit: "g" },
];

export function NutritionPanel({
  nutrition,
  isAvailable,
}: {
  // Null means either "not entitled" or "no data" - `isAvailable` says which.
  nutrition: Nutrition | null;
  isAvailable: boolean;
}) {
  const { language, t } = useLanguage();

  // Open Food Facts has nothing for this product. Nobody can see values that do
  // not exist, so offering a subscription here would be dishonest.
  if (!isAvailable) {
    return (
      <p className="border-t border-gray-100 pt-2 text-xs text-gray-400 dark:border-gray-800">
        {t("nutritionNone")}
      </p>
    );
  }

  // Data exists, but this user is not entitled to it. We say so plainly rather
  // than pretending the product has no nutrition information.
  if (nutrition === null) {
    return (
      <p className="border-t border-gray-100 pt-2 text-xs text-amber-700 dark:border-gray-800 dark:text-amber-400">
        {t("nutritionLocked")}
      </p>
    );
  }

  // Some individual values are often missing even when others are present, so
  // skip the empty rows rather than printing a column of dashes.
  const rows = ROWS.filter((row) => nutrition[row.field] !== null);

  return (
    <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
      <p className="mb-1 text-xs font-medium text-gray-500">{t("nutritionTitle")}</p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        {rows.map((row) => (
          <div key={row.field} className="col-span-2 flex justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">{t(row.key)}</dt>
            <dd className="font-medium tabular-nums">
              {/* Numbers are formatted for the selected language: 27.5 in
                  English, 27,5 in Dutch, German and French. */}
              {nutrition[row.field]!.toLocaleString(language)} {row.unit}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
