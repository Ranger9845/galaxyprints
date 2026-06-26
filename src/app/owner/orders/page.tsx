import Link from "next/link";
import { listAllOrders } from "@/lib/repo/orders";
import { formatCents } from "@/lib/money";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";

export default async function OwnerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filterStatus = (ORDER_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as OrderStatus)
    : undefined;
  const orders = listAllOrders(filterStatus);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Orders</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/owner/orders"
          className={`badge ${!filterStatus ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/owner/orders?status=${s}`}
            className={`badge ${filterStatus === s ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {ORDER_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-6 text-slate-600">No orders found.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/owner/orders/${order.orderNumber}`}
              className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                <p className="text-sm text-slate-500">
                  {order.contactEmail} · {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="badge bg-violet-100 text-violet-800">{ORDER_STATUS_LABELS[order.status]}</span>
                <span className="font-semibold text-slate-900">{formatCents(order.totalCents)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
