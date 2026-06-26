import Link from "next/link";
import { notFound } from "next/navigation";
import { findUserById } from "@/lib/repo/users";
import { listOrdersByUser } from "@/lib/repo/orders";
import { listPointsTransactions, POINTS_REASON_LABELS } from "@/lib/repo/points";
import { formatCents } from "@/lib/money";
import { pointsToCents } from "@/lib/points";
import { ORDER_STATUS_LABELS } from "@/lib/types";
import { AdjustPointsForm } from "./AdjustPointsForm";

export default async function OwnerCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = findUserById(id);
  if (!customer || customer.role !== "CUSTOMER") notFound();

  const orders = listOrdersByUser(customer.id);
  const transactions = listPointsTransactions(customer.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/owner/customers" className="text-sm font-medium text-violet-700 hover:text-violet-800">
          ← Back to Customers
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{customer.name}</h1>
        <p className="text-slate-600">{customer.email}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card p-6">
          <p className="text-sm text-slate-500">Points balance</p>
          <p className="text-3xl font-bold text-amber-600">{customer.points} pts</p>
          <p className="text-sm text-slate-500">Worth {formatCents(pointsToCents(customer.points))}</p>
        </div>
        <AdjustPointsForm userId={customer.id} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Orders</h2>
        {orders.length === 0 ? (
          <p className="text-slate-600">No orders yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/owner/orders/${order.orderNumber}`}
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

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Points History</h2>
        {transactions.length === 0 ? (
          <p className="text-slate-600">No points activity yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 text-slate-600">{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-900">{POINTS_REASON_LABELS[tx.reason] ?? tx.reason}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        tx.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
