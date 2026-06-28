import { getCustomPrintRequestForGuest } from "@/lib/repo/customPrintRequests";
import { ModelViewer } from "@/components/ModelViewer";
import { AcceptQuoteForm } from "@/components/AcceptQuoteForm";
import { declineCustomPrintQuoteAction } from "@/lib/actions/customPrints";
import { formatCents } from "@/lib/money";
import { CUSTOM_PRINT_STATUS_LABELS } from "@/lib/types";

export default async function CustomPrintStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; email?: string }>;
}) {
  const { id, email } = await searchParams;
  const hasQuery = !!id && !!email;
  const request = hasQuery ? getCustomPrintRequestForGuest(id, email) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Check Your Custom Print Request</h1>
      <p className="mt-2 text-slate-600">
        Enter your request ID and the email you used to submit it to check status and review your quote.
      </p>

      <form method="get" className="card mt-6 flex flex-col gap-4 p-6">
        <div>
          <label className="label" htmlFor="id">
            Request ID
          </label>
          <input id="id" name="id" required defaultValue={id} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required defaultValue={email} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Check Status
        </button>
      </form>

      {hasQuery && !request && (
        <p className="mt-6 text-sm text-rose-600">
          We couldn&apos;t find a request with that ID and email. Double check both and try again.
        </p>
      )}

      {request && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-slate-900">{request.fileName}</h2>
              <span className="badge bg-violet-100 text-violet-800">
                {CUSTOM_PRINT_STATUS_LABELS[request.status]}
              </span>
            </div>
            <p className="text-sm text-slate-500">Submitted {new Date(request.createdAt).toLocaleString()}</p>

            <div className="mt-4">
              <ModelViewer
                fileUrl={`/api/uploads/${request.id}?email=${encodeURIComponent(request.contactEmail)}`}
                fileName={request.fileName}
              />
            </div>

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
              />
            </>
          )}

          {request.status === "ACCEPTED" && request.orderId && (
            <p className="text-sm text-emerald-700">
              This quote was accepted — check your order confirmation email for tracking details.
            </p>
          )}

          {request.status === "DECLINED" && <p className="text-sm text-slate-600">You declined this quote.</p>}

          {request.status === "SUBMITTED" && (
            <p className="text-sm text-slate-600">We&apos;re reviewing your model — check back soon for a quote.</p>
          )}
        </div>
      )}
    </div>
  );
}
