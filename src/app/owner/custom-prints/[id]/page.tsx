import Link from "next/link";
import { notFound } from "next/navigation";
import { findCustomPrintRequestById } from "@/lib/repo/customPrintRequests";
import { ModelViewer } from "@/components/ModelViewer";
import { formatCents } from "@/lib/money";
import { CUSTOM_PRINT_STATUS_LABELS } from "@/lib/types";
import { QuoteForm } from "./QuoteForm";

export default async function OwnerCustomPrintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = findCustomPrintRequestById(id);
  if (!request) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/owner/custom-prints" className="text-sm font-medium text-violet-700 hover:text-violet-800">
          ← Back to Custom Print Requests
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{request.fileName}</h1>
          <span className="badge bg-violet-100 text-violet-800">
            {CUSTOM_PRINT_STATUS_LABELS[request.status]}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {request.contactEmail} · Submitted {new Date(request.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="card p-6">
        <ModelViewer fileUrl={`/api/uploads/${request.id}`} fileName={request.fileName} />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-900">Request Details</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Preferred Material</dt>
            <dd className="text-slate-900">{request.material || "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Preferred Color</dt>
            <dd className="text-slate-900">{request.color || "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Quantity</dt>
            <dd className="text-slate-900">{request.quantity}</dd>
          </div>
          <div>
            <dt className="text-slate-500">File Size</dt>
            <dd className="text-slate-900">{(request.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</dd>
          </div>
        </dl>
        {request.notes && <p className="mt-4 text-sm text-slate-600">Notes: {request.notes}</p>}
      </div>

      {(request.status === "SUBMITTED" || request.status === "QUOTED") && (
        <QuoteForm requestId={request.id} quotePriceCents={request.quotePriceCents} quoteNotes={request.quoteNotes} />
      )}

      {request.status === "QUOTED" && request.quotePriceCents != null && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900">Current Quote</h2>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCents(request.quotePriceCents)}</p>
          {request.quoteNotes && <p className="mt-1 text-sm text-slate-600">{request.quoteNotes}</p>}
        </div>
      )}

      {request.status === "ACCEPTED" && request.orderId && (
        <p className="text-sm text-emerald-700">The customer accepted this quote and an order was created.</p>
      )}

      {request.status === "DECLINED" && (
        <p className="text-sm text-slate-600">The customer declined this quote.</p>
      )}
    </div>
  );
}
