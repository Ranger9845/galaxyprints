import Link from "next/link";
import { notFound } from "next/navigation";
import { findCustomPrintRequestById } from "@/lib/repo/customPrintRequests";
import { ModelViewer } from "@/components/ModelViewer";
import { formatCents } from "@/lib/money";
import { CUSTOM_PRINT_STATUS_LABELS } from "@/lib/types";
import { QuoteForm } from "./QuoteForm";
import { listPrintMethods } from "@/lib/repo/printMethods";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = findCustomPrintRequestById(id);
  if (!request) notFound();

  const printMethods = listPrintMethods(true);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Print Request #{request.id.slice(0, 8)}</h1>
        <Link href="/owner/custom-prints" className="text-sm text-violet-600 hover:underline">← All Requests</Link>
      </div>

      {/* Request Details */}
      <div className="card p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-slate-900">Request Details</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-slate-500">Status</p>
            <p className="font-medium">{CUSTOM_PRINT_STATUS_LABELS[request.status] ?? request.status}</p>
          </div>
          <div>
            <p className="text-slate-500">Submitted</p>
            <p className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-slate-500">Customer</p>
            <p className="font-medium">{request.name}</p>
          </div>
          <div>
            <p className="text-slate-500">Email</p>
            <p className="font-medium">{request.email}</p>
          </div>
          <div>
            <p className="text-slate-500">Quantity</p>
            <p className="font-medium">{request.quantity}</p>
          </div>
          <div>
            <p className="text-slate-500">Material</p>
            <p className="font-medium">{request.material || "Not specified"}</p>
          </div>
          <div>
            <p className="text-slate-500">Customer ZIP</p>
            <p className="font-medium">{request.shippingZip || "Not provided"}</p>
          </div>
          {request.quotePriceCents != null && (
            <div>
              <p className="text-slate-500">Current Quote</p>
              <p className="font-medium">{formatCents(request.quotePriceCents)}</p>
            </div>
          )}
        </div>
        {request.notes && (
          <div>
            <p className="text-slate-500 text-sm">Customer Notes</p>
            <p className="text-sm mt-1 bg-slate-50 rounded p-3 border border-slate-200">{request.notes}</p>
          </div>
        )}
        {request.quoteNotes && (
          <div>
            <p className="text-slate-500 text-sm">Your Quote Note</p>
            <p className="text-sm mt-1 bg-slate-50 rounded p-3 border border-slate-200">{request.quoteNotes}</p>
          </div>
        )}
      </div>

      {/* Model Preview */}
      {request.fileUrl && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Model File</h2>
          <ModelViewer fileUrl={request.fileUrl} fileName={request.fileName} />
        </div>
      )}

      {/* Quote Form */}
      <QuoteForm
        requestId={request.id}
        quotePriceCents={request.quotePriceCents ?? null}
        quoteNotes={request.quoteNotes ?? ""}
        shippingZip={request.shippingZip ?? ""}
        fileSizeBytes={request.fileSizeBytes ?? 0}
        quantity={request.quantity ?? 1}
        material={request.material ?? ""}
        printMethods={printMethods}
      />
    </div>
  );
}
