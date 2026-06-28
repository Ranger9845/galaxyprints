import { getOrderForGuestTracking, getOrderItems, getOrderStatusEvents } from "@/lib/repo/orders";
import { formatCents } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/types";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; email?: string }>;
}) {
  const { orderNumber, email } = await searchParams;
  const hasQuery = !!orderNumber && !!email;
  const order = hasQuery ? getOrderForGuestTracking(orderNumber, email) : null;
  const items = order ? getOrderItems(order.id) : [];
  const events = order ? getOrderStatusEvents(order.id) : [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Track Your Order</h1>
      <p className="mt-2 text-slate-600">
        Enter your order number and the email you used at checkout to see your order&apos;s status.
      </p>

      <form method="get" className="card mt-6 flex flex-col gap-4 p-6">
        <div>
          <label className="label" htmlFor="orderNumber">
            Order Number
          </label>
          <input
            id="orderNumber"
            name="orderNumber"
            required
            defaultValue={orderNumber}
            placeholder="GP-XXXXXXXX"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required defaultValue={email} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Track Order
        </button>
      </form>

      {hasQuery && !order && (
        <p className="mt-6 text-sm text-rose-600">
          We couldn&apos;t find an order with that number and email. Double check both and try again.
        </p>
      )}

      {order && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-slate-900">{order.orderNumber}</h2>
              <span className="badge bg-violet-100 text-violet-800">{ORDER_STATUS_LABELS[order.status]}</span>
            </div>
            <p className="text-sm text-slate-500">Placed {new Date(order.createdAt).toLocaleString()}</p>

            <ol className="mt-6 flex flex-col gap-4 border-l border-slate-200 pl-4">
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
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium text-slate-900">
                    {formatCents(item.unitPriceCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <hr className="my-4 border-slate-200" />
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCents(order.totalCents)}</span>
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
      )}
    </div>
  );
}
