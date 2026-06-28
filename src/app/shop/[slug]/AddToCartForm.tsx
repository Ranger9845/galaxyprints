"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import type { Product } from "@/lib/types";

export function AddToCartForm({ product }: { product: Product }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceCents: product.priceCents,
        imageEmoji: product.imageEmoji,
        color: product.color,
        material: product.material,
        stock: product.stock,
      },
      quantity
    );
    setAdded(true);
  }

  function handleBuyNow() {
    handleAdd();
    router.push("/cart");
  }

  if (outOfStock) {
    return (
      <button className="btn-secondary" disabled>
        Out of Stock
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="label mb-0">
          Qty
        </label>
        <select
          id="quantity"
          className="input w-24"
          value={quantity}
          onChange={(e) => {
            setQuantity(Number(e.target.value));
            setAdded(false);
          }}
        >
          {Array.from({ length: Math.min(product.stock, 10) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={handleAdd}>
          {added ? "Added ✓" : "Add to Cart"}
        </button>
        <button type="button" className="btn-outline" onClick={handleBuyNow}>
          Buy Now
        </button>
      </div>
    </div>
  );
}
