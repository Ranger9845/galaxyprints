"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { setCustomPrintQuoteAction } from "@/lib/actions/customPrints";
import { formatCents } from "@/lib/money";

export function QuoteForm({
  requestId,
  quotePriceCents,
  quoteNotes,
  suggestedPriceCents,
}: {
  requestId: string;
  quotePriceCents: number | null;
  quoteNotes: string;
  suggestedPriceCents?: number | null;
}) {
  const [state, formAction] = useActionState(setCustomPrintQuoteAction, {});
  const defaultPriceCents = quotePriceCents ?? suggestedPriceCents ?? null;

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-6">
      <h2 className="font-semibold text-slate-900">Send Quote</h2>
      <input type="hidden" name="requestId" value={requestId} />
      <div>
        <label className="label" htmlFor="price">
          Total Price ($)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min={0.01}
          step={0.01}
          required
          defaultValue={defaultPriceCents != null ? (defaultPriceCents / 100).toFixed(2) : undefined}
          className="input"
        />
        {suggestedPriceCents != null && quotePriceCents == null && (
          <p className="mt-1 text-xs text-slate-500">
            Suggested from the pricing formula: {formatCents(suggestedPriceCents)}
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="quoteNotes">
          Note to customer (optional)
        </label>
        <textarea id="quoteNotes" name="quoteNotes" rows={3} defaultValue={quoteNotes} className="input" />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Quote sent.</p>}
      <SubmitButton pendingLabel="Sending…" className="btn-primary self-start">
        Send Quote
      </SubmitButton>
    </form>
  );
}
