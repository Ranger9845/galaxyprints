import Link from "next/link";
import { notFound } from "next/navigation";
import { findOrderByOrderNumber, getOrderForGuestTracking, getOrderItems } from "@/lib/repo/orders";
import { getCurrentUser } from "@/lib/auth/guards";
import { formatCents } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/types";

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { orderNumber } = await params;
  const { email } = await searchParams;
  const user = await getCurrentUser();

  const order = findOrderByOrderNumber(orderNumber);
  if (!order) notFound();

  const ownsOrder = !!user && order.userId === user.id;
  const guestMatch = !!email && !!getOrderForGuestTracking(orderNumber, email);
  if (!ownsOrder && !guestMatch) notFound();

  const items = getOrderItems(order.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Thanks for your order!</h1>
        <p className="mt-2 text-slate-600">
          Order <span className="font-semibold text-slate-900">{order.orderNumber}</span> has been placed.
        </p>
      </div>

      <div className="card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="badge bg-violet-100 text-violet-800">{ORDER_STATUS_LABELS[order.status]}</span>
          <span className="text-sm text-slate-500">Confirmation sent to {order.contactEmail}</span>
        </div>

        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span className="text-slate-600">
                {item.productName} × {item.quantity}
              </span>
              <span className="font-medium text-slate-900">
                {formatCents(item.unitPriceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <hr className="my-4 border-slate-200" />

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span>{formatCents(order.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Shipping</span>
            <span>{order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}</span>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Points discount</span>
              <span>−{formatCents(order.discountCents)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
          {order.pointsEarned > 0 && (
            <p className="mt-2 text-amber-700">✨ You earned {order.pointsEarned} points on this order.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={`/track?orderNumber=${order.orderNumber}&email=${encodeURIComponent(order.contactEmail)}`}
          className="btn-outline"
        >
          Track this Order
        </Link>
        <Link href="/shop" className="btn-primary">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
