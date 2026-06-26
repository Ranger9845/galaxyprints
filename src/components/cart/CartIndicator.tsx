"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export function CartIndicator() {
  const { totalQuantity } = useCart();
  return (
    <Link href="/cart" className="relative inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-violet-700">
      <span aria-hidden>🛒</span>
      <span>Cart</span>
      {totalQuantity > 0 && (
        <span className="absolute -top-2 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[11px] font-bold text-white">
          {totalQuantity}
        </span>
      )}
    </Link>
  );
}
