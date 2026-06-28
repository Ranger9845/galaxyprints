"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { placeOrderAction } from "@/lib/actions/orders";
import { formatCents } from "@/lib/money";
import { maxRedeemablePoints, pointsToCents, REDEEM_STEP } from "@/lib/points";
import { calcShippingCents } from "@/lib/shipping";
import type { User } from "@/lib/types";

export function CheckoutForm({ user }: { user: User | null }) {
  const { items, subtotalCents, clear } = useCart();
  const router = useRouter();

  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [shippingName, setShippingName] = useState(user?.name ?? "");
  const [shippingAddress1, setShippingAddress1] = useState("");
  const [shippingAddress2, setShippingAddress2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCountry, setShippingCountry] = useState("United States");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redeemCap = user ? maxRedeemablePoints(subtotalCents, user.points) : 0;
  const discountCents = pointsToCents(pointsToRedeem);
  const shippingCents = calcShippingCents(subtotalCents);
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await placeOrderAction({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      contactEmail,
      pointsToRedeem,
      shippingName,
      shippingAddress1,
      shippingAddress2,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
    });
    if (result.error) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    clear();
    router.push(`/order-confirmation/${result.orderNumber}?email=${encodeURIComponent(contactEmail)}`);
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-slate-600">Add something to your cart before checking out.</p>
        <Link href="/shop" className="btn-primary mt-6 inline-flex">
          Go to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-8 sm:grid-cols-3">
        <div className="flex flex-col gap-6 sm:col-span-2">
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900">Contact</h2>
            <div className="mt-3">
              <label className="label" htmlFor="contactEmail">
                Email
              </label>
              <input
                id="contactEmail"
                type="email"
                required
                className="input"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              {!user && (
                <p className="mt-1 text-xs text-slate-500">
                  We&apos;ll use this email for order updates and guest tracking.{" "}
                  <Link href="/login?next=/checkout" className="text-violet-700 hover:underline">
                    Sign in
                  </Link>{" "}
                  to earn and redeem points.
                </p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-slate-900">Shipping Address</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="shippingName">
                  Full name
                </label>
                <input
                  id="shippingName"
                  required
                  className="input"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="shippingAddress1">
                  Address
                </label>
                <input
                  id="shippingAddress1"
                  required
                  className="input"
                  value={shippingAddress1}
                  onChange={(e) => setShippingAddress1(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="shippingAddress2">
                  Apt, suite, etc. (optional)
                </label>
                <input
                  id="shippingAddress2"
                  className="input"
                  value={shippingAddress2}
                  onChange={(e) => setShippingAddress2(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="shippingCity">
                  City
                </label>
                <input
                  id="shippingCity"
                  required
                  className="input"
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="shippingState">
                  State / Province
                </label>
                <input
                  id="shippingState"
                  required
                  className="input"
                  value={shippingState}
                  onChange={(e) => setShippingState(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="shippingZip">
                  ZIP / Postal Code
                </label>
                <input
                  id="shippingZip"
                  required
                  className="input"
                  value={shippingZip}
                  onChange={(e) => setShippingZip(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="shippingCountry">
                  Country
                </label>
                <input
                  id="shippingCountry"
                  required
                  className="input"
                  value={shippingCountry}
                  onChange={(e) => setShippingCountry(e.target.value)}
                />
              </div>
            </div>
          </div>

          {user && user.points > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900">Redeem Points</h2>
              <p className="mt-1 text-sm text-slate-600">
                You have {user.points} points (worth {formatCents(pointsToCents(user.points))}). You can
                redeem up to {redeemCap} points on this order, in blocks of {REDEEM_STEP}.
              </p>
              {redeemCap > 0 ? (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={redeemCap}
                    step={REDEEM_STEP}
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="w-32 shrink-0 text-right text-sm font-semibold text-slate-900">
                    {pointsToRedeem} pts (−{formatCents(pointsToCents(pointsToRedeem))})
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Your order isn&apos;t large enough to redeem points yet.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-3 p-6">
          <h2 className="font-semibold text-slate-900">Order Summary</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-2">
                <span className="text-slate-600">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium text-slate-900">
                  {formatCents(item.priceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <hr className="border-slate-200" />
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium text-slate-900">{formatCents(subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Shipping</span>
            <span className="font-medium text-slate-900">
              {shippingCents === 0 ? "Free" : formatCents(shippingCents)}
            </span>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Points discount</span>
              <span>−{formatCents(discountCents)}</span>
            </div>
          )}
          <hr className="border-slate-200" />
          <div className="flex justify-between text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{formatCents(totalCents)}</span>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary mt-2">
            {submitting ? "Placing Order…" : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
