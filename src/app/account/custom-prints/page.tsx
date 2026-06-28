import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { listCustomPrintRequestsByUser } from "@/lib/repo/customPrintRequests";
import { CUSTOM_PRINT_STATUS_LABELS } from "@/lib/types";
import { formatCents } from "@/lib/money";

export default async function AccountCustomPrintsPage() {
  const user = await requireUser("/account/custom-prints");
  const requests = listCustomPrintRequestsByUser(user.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Your Custom Print Requests</h1>
        <Link href="/custom-print" className="btn-outline btn-sm">
          New Request
        </Link>
      </div>
      {requests.length === 0 ? (
        <p className="mt-4 text-slate-600">You haven&apos;t submitted any custom print requests yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {requests.map((request) => (
            <Link
              key={request.id}
              href={`/account/custom-prints/${request.id}`}
              className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-slate-900">{request.fileName}</p>
                <p className="text-sm text-slate-500">{new Date(request.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="badge bg-violet-100 text-violet-800">
                  {CUSTOM_PRINT_STATUS_LABELS[request.status]}
                </span>
                {request.quotePriceCents != null && (
                  <span className="font-semibold text-slate-900">{formatCents(request.quotePriceCents)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
