import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { listOrdersByUser } from "@/lib/repo/orders";
import { logoutAction } from "@/lib/actions/auth";
import { formatCents } from "@/lib/money";
import { pointsToCents } from "@/lib/points";
import { ORDER_STATUS_LABELS } from "@/lib/types";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const orders = listOrdersByUser(user.id).slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name}</h1>
          <p className="text-slate-600">{user.email}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-outline btn-sm">
            Sign Out
          </button>
        </form>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-slate-500">Points balance</p>
          <p className="text-3xl font-bold text-amber-600">{user.points} pts</p>
          <p className="text-sm text-slate-500">Worth {formatCents(pointsToCents(user.points))} at checkout</p>
        </div>
        <Link href="/account/points" className="btn-outline">
          View History
        </Link>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
          <Link href="/account/orders" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
            View all →
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-slate-600">
            You haven&apos;t placed any orders yet.{" "}
            <Link href="/shop" className="text-violet-700 hover:underline">
              Start shopping
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-3">
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
    </div>
  );
}
