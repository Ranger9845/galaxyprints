"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { items, removeItem, setQuantity, subtotalCents } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <div className="text-5xl">🛒</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-slate-600">Browse the shop and find something out of this world.</p>
        <Link href="/shop" className="btn-primary mt-6 inline-flex">
          Go to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Your Cart</h1>

      <div className="mt-6 flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.productId} className="card flex items-center gap-4 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-3xl">
              {item.imageEmoji}
            </div>
            <div className="flex-1">
              <Link
                href={`/shop/${item.slug}`}
                className="font-semibold text-slate-900 hover:text-violet-700"
              >
                {item.name}
              </Link>
              <p className="text-sm text-slate-500">
                {item.material} · {item.color}
              </p>
              <p className="text-sm font-medium text-slate-900">{formatCents(item.priceCents)}</p>
            </div>
            <select
              className="input w-20"
              value={item.quantity}
              onChange={(e) => setQuantity(item.productId, Number(e.target.value))}
              aria-label={`Quantity for ${item.name}`}
            >
              {Array.from({ length: Math.min(item.stock, 10) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="w-20 shrink-0 text-right font-semibold text-slate-900">
              {formatCents(item.priceCents * item.quantity)}
            </p>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="shrink-0 text-sm font-medium text-rose-600 hover:text-rose-700"
              aria-label={`Remove ${item.name}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="card mt-6 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg">
          Subtotal: <span className="font-bold text-slate-900">{formatCents(subtotalCents)}</span>
        </p>
        <div className="flex gap-3">
          <Link href="/shop" className="btn-outline">
            Continue Shopping
          </Link>
          <Link href="/checkout" className="btn-primary">
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
