import Link from "next/link";
import { listAllCustomPrintRequests } from "@/lib/repo/customPrintRequests";
import { formatCents } from "@/lib/money";
import { CUSTOM_PRINT_STATUSES, CUSTOM_PRINT_STATUS_LABELS, type CustomPrintStatus } from "@/lib/types";

export default async function OwnerCustomPrintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filterStatus = (CUSTOM_PRINT_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as CustomPrintStatus)
    : undefined;
  const requests = listAllCustomPrintRequests(filterStatus);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Custom Print Requests</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/owner/custom-prints"
          className={`badge ${!filterStatus ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          All
        </Link>
        {CUSTOM_PRINT_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/owner/custom-prints?status=${s}`}
            className={`badge ${filterStatus === s ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {CUSTOM_PRINT_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <p className="mt-6 text-slate-600">No custom print requests found.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {requests.map((request) => (
            <Link
              key={request.id}
              href={`/owner/custom-prints/${request.id}`}
              className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-slate-900">{request.fileName}</p>
                <p className="text-sm text-slate-500">
                  {request.contactEmail} · {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {request.autoQuoted && <span className="badge bg-emerald-100 text-emerald-800">Auto</span>}
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
