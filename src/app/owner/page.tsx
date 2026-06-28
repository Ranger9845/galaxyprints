import Link from "next/link";
import { getOwnerStats, listAllOrders } from "@/lib/repo/orders";
import { formatCents } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/types";

export default async function OwnerOverviewPage() {
  const stats = getOwnerStats();
  const recentOrders = listAllOrders().slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-600">A snapshot of your store&apos;s performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Revenue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatCents(stats.totalRevenueCents)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalOrders}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Active Orders</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.activeOrders}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Customers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalCustomers}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Points Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.totalPointsOutstanding}</p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
          <Link href="/owner/orders" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
            View all →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-slate-600">No orders yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/owner/orders/${order.orderNumber}`}
                className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:shadow-md"
              >
                <div>
                  <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                  <p className="text-sm text-slate-500">{order.contactEmail}</p>
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
