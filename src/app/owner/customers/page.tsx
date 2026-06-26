import Link from "next/link";
import { listCustomers } from "@/lib/repo/users";
import { formatCents } from "@/lib/money";
import { pointsToCents } from "@/lib/points";

export default async function OwnerCustomersPage() {
  const customers = listCustomers();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
      {customers.length === 0 ? (
        <p className="mt-4 text-slate-600">No customers yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/owner/customers/${customer.id}`}
                      className="font-medium text-slate-900 hover:text-violet-700"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{customer.email}</td>
                  <td className="px-4 py-3 font-medium text-amber-700">
                    {customer.points} pts ({formatCents(pointsToCents(customer.points))})
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(customer.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
