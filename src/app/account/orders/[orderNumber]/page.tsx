import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { findOrderByOrderNumber, getOrderItems, getOrderStatusEvents } from "@/lib/repo/orders";
import { formatCents } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/types";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const user = await requireUser(`/account/orders/${orderNumber}`);
  const order = findOrderByOrderNumber(orderNumber);
  if (!order || order.userId !== user.id) notFound();

  const items = getOrderItems(order.id);
  const events = getOrderStatusEvents(order.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/account/orders" className="text-sm font-medium text-violet-700 hover:text-violet-800">
          ← Back to Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
          <span className="badge bg-violet-100 text-violet-800">{ORDER_STATUS_LABELS[order.status]}</span>
        </div>
        <p className="text-sm text-slate-500">Placed {new Date(order.createdAt).toLocaleString()}</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-900">Order Status</h2>
        <ol className="mt-4 flex flex-col gap-4 border-l border-slate-200 pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-violet-600" />
              <p className="font-medium text-slate-900">{ORDER_STATUS_LABELS[event.status]}</p>
              <p className="text-sm text-slate-600">{event.message}</p>
              <p className="text-xs text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ol>
        {order.trackingNumber && (
          <p className="mt-4 text-sm text-slate-600">
            Tracking: <span className="font-semibold text-slate-900">{order.trackingNumber}</span>{" "}
            {order.carrier && <>({order.carrier})</>}
          </p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-900">Items</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="text-slate-600">
                {item.productName} ({item.material}, {item.color}) × {item.quantity}
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
          <div className="flex justify-between text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-900">Shipping Address</h2>
        <p className="mt-2 text-sm text-slate-600">
          {order.shippingName}
          <br />
          {order.shippingAddress1}
          {order.shippingAddress2 && <>, {order.shippingAddress2}</>}
          <br />
          {order.shippingCity}, {order.shippingState} {order.shippingZip}
          <br />
          {order.shippingCountry}
        </p>
      </div>
    </div>
  );
}
