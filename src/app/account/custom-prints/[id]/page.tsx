import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { findCustomPrintRequestById } from "@/lib/repo/customPrintRequests";
import { ModelViewer } from "@/components/ModelViewer";
import { AcceptQuoteForm } from "@/components/AcceptQuoteForm";
import { declineCustomPrintQuoteAction } from "@/lib/actions/customPrints";
import { formatCents } from "@/lib/money";
import { CUSTOM_PRINT_STATUS_LABELS } from "@/lib/types";

export default async function AccountCustomPrintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/custom-prints/${id}`);
  const request = findCustomPrintRequestById(id);
  if (!request || request.userId !== user.id) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/account/custom-prints" className="text-sm font-medium text-violet-700 hover:text-violet-800">
          ← Back to Custom Print Requests
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{request.fileName}</h1>
          <span className="badge bg-violet-100 text-violet-800">
            {CUSTOM_PRINT_STATUS_LABELS[request.status]}
          </span>
        </div>
        <p className="text-sm text-slate-500">Submitted {new Date(request.createdAt).toLocaleString()}</p>
      </div>

      <div className="card p-6">
        <ModelViewer fileUrl={`/api/uploads/${request.id}`} fileName={request.fileName} />
        {request.notes && <p className="mt-4 text-sm text-slate-600">Notes: {request.notes}</p>}
      </div>

      {request.status === "QUOTED" && request.quotePriceCents != null && (
        <>
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900">Your Quote</h2>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCents(request.quotePriceCents)}</p>
            {request.quoteNotes && <p className="mt-1 text-sm text-slate-600">{request.quoteNotes}</p>}
            <form action={declineCustomPrintQuoteAction} className="mt-4">
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="contactEmail" value={request.contactEmail} />
              <button type="submit" className="btn-outline btn-sm">
                Decline Quote
              </button>
            </form>
          </div>

          <AcceptQuoteForm
            requestId={request.id}
            contactEmail={request.contactEmail}
            quotePriceCents={request.quotePriceCents}
            defaultName={user.name}
          />
        </>
      )}

      {request.status === "ACCEPTED" && request.orderId && (
        <p className="text-sm text-emerald-700">
          This quote was accepted — check your orders for tracking details.
        </p>
      )}

      {request.status === "DECLINED" && <p className="text-sm text-slate-600">You declined this quote.</p>}

      {request.status === "SUBMITTED" && (
        <p className="text-sm text-slate-600">We&apos;re reviewing your model — check back soon for a quote.</p>
      )}
    </div>
  );
}
