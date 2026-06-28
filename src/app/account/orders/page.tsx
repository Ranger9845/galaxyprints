import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { listOrdersByUser } from "@/lib/repo/orders";
import { formatCents } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/types";

export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = listOrdersByUser(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-4 text-slate-600">You haven&apos;t placed any orders yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.orderNumber}`}
              className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
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
