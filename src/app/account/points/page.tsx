import { requireUser } from "@/lib/auth/guards";
import { listPointsTransactions, POINTS_REASON_LABELS } from "@/lib/repo/points";
import { formatCents } from "@/lib/money";
import { pointsToCents } from "@/lib/points";

export default async function AccountPointsPage() {
  const user = await requireUser("/account/points");
  const transactions = listPointsTransactions(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Points History</h1>
      <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-slate-500">Current balance</p>
          <p className="text-3xl font-bold text-amber-600">{user.points} pts</p>
        </div>
        <p className="text-sm text-slate-500">Worth {formatCents(pointsToCents(user.points))}</p>
      </div>

      {transactions.length === 0 ? (
        <p className="mt-6 text-slate-600">No points activity yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
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
  );
}
