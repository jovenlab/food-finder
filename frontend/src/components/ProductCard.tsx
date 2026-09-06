"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { NutritionPanel } from "./NutritionPanel";

// A shared placeholder for "there is no picture".
//
// Two different things lead here, and the user does not care which:
//   1. Open Food Facts has no image for this product (imageUrl is null)
//   2. It has a URL, but loading it failed (dead link, offline CDN)
function ImagePlaceholder() {
  const { t } = useLanguage();

  return (
    <div
      className="flex h-40 w-full items-center justify-center rounded-md
                 bg-gray-100 text-sm text-gray-400 dark:bg-gray-800 dark:text-gray-500"
      // Decorative only - the product name next to it already says what this is,
      // so we hide it from screen readers rather than making them read "no image".
      aria-hidden="true"
    >
      {t("noImage")}
    </div>
  );
}

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  // An image URL is a promise, not a guarantee. Open Food Facts links do
  // sometimes 404, and without this the card would show a broken-image icon.
  const [hasFailed, setHasFailed] = useState(false);

  // Product photos come from the Open Food Facts CDN and measurably take several
  // seconds. Without this the card would show an empty white rectangle for that
  // whole time, which reads as "broken" rather than "loading".
  const [isLoading, setIsLoading] = useState(true);

  const imageRef = useRef<HTMLImageElement>(null);

  // A cached image can finish loading before React attaches the onLoad handler,
  // and then onLoad never fires and the shimmer would stay forever. `complete`
  // is the browser's own "this image is already done" flag, so we check it once
  // after mounting.
  useEffect(() => {
    if (imageRef.current?.complete) {
      setIsLoading(false);
    }
  }, [src]);

  if (src === null || hasFailed) {
    return <ImagePlaceholder />;
  }

  return (
    <div className="relative h-40 w-full">
      {/* The shimmer sits BEHIND the image rather than replacing it, so the
          image can fade in on top without the layout shifting. */}
      {isLoading && (
        <div
          className="absolute inset-0 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800"
          aria-hidden="true"
        />
      )}

      {/* We use a plain <img> instead of next/image on purpose. next/image would
          proxy every photo through our own server to optimise it; Open Food Facts
          already serves these from a CDN, and routing them through us would add a
          slow hop and require whitelisting their domain. Simpler is better here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => setHasFailed(true)}
        className={`relative h-40 w-full rounded-md bg-white object-contain
                    transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
      />
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { language, t } = useLanguage();

  // Every text field can be null. Deciding the fallback HERE, once, keeps the
  // markup below readable and guarantees we never render the word "null".
  const displayName = product.name ?? t("nameNotAvailable");

  // Open Food Facts does not have every product in every language. When the name
  // we received is in a DIFFERENT language from the one selected, we say so
  // rather than passing it off as a translation. The assignment is explicit that
  // we must not invent translations for product data - this is how we stay
  // honest about that instead of hiding it.
  const isFallbackName =
    product.name !== null &&
    product.nameLanguage !== null &&
    product.nameLanguage !== language;

  return (
    <li
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4
                 transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      {/* The alt text describes the picture, so it uses the product name. */}
      <ProductImage src={product.imageUrl} alt={displayName} />

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          {/* `break-words` is not decoration. Open Food Facts contains product
              names that are one unbroken 80-character string, and a browser will
              not break a word on its own - it pushes it straight out of the card
              and knocks the whole grid sideways. `min-w-0` is the other half:
              a flex child refuses to shrink below its content width without it,
              so wrapping alone would not be enough. */}
          <h3
            className={`min-w-0 flex-1 break-words font-semibold leading-snug ${
              product.name === null ? "italic text-gray-400" : ""
            }`}
          >
            {displayName}
          </h3>

          {isFallbackName && (
            // `title` gives the explanation on hover; the same text is repeated
            // for screen readers, which do not read `title` reliably.
            <span
              title={t("nameLanguageNote")}
              className="mt-0.5 shrink-0 rounded border border-gray-300 px-1.5 py-0.5
                         text-[10px] font-medium uppercase tracking-wide text-gray-500
                         dark:border-gray-700 dark:text-gray-400"
            >
              {product.nameLanguage}
              <span className="sr-only"> — {t("nameLanguageNote")}</span>
            </span>
          )}
        </div>

        {/* Brand and quantity are only rendered when we actually have them.
            `{value && <p>…</p>}` renders nothing when value is null - this is
            the standard React way to show something conditionally. */}
        {product.brand && (
          <p className="break-words text-sm text-gray-600 dark:text-gray-400">{product.brand}</p>
        )}

        {product.quantity && (
          <p className="break-words text-xs text-gray-500 dark:text-gray-500">{product.quantity}</p>
        )}
      </div>

      <NutritionPanel
        nutrition={product.nutrition}
        isAvailable={product.nutritionAvailable}
      />

      {/* The barcode is always present, and is genuinely useful for checking a
          result against Open Food Facts by hand. */}
      <p className="break-all font-mono text-xs text-gray-400">{product.code}</p>
    </li>
  );
}
