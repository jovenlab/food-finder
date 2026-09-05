"use client";

import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

// The responsive grid of results.
//
// It is a <ul> of <li> cards because that is what this is: a list. Using the
// right element means screen readers announce "list, 19 items" instead of
// reading a wall of unrelated text.

export function ProductList({ products }: { products: Product[] }) {
  return (
    <ul
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      // Tailwind's responsive prefixes read as "from this width upwards":
      //   grid-cols-1      phones      - one column
      //   sm:grid-cols-2   >= 640px    - two columns
      //   lg:grid-cols-3   >= 1024px   - three columns
    >
      {products.map((product) => (
        // `key` must be stable and unique. The barcode is both, which is why the
        // backend guarantees it is never null. Using the array index instead
        // would make React reuse the wrong card when the list changes.
        <ProductCard key={product.code} product={product} />
      ))}
    </ul>
  );
}
