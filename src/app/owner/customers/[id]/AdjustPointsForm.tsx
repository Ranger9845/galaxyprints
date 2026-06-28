"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { adjustPointsAction } from "@/lib/actions/customers";

export function AdjustPointsForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(adjustPointsAction, {});

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-6">
      <h2 className="font-semibold text-slate-900">Adjust Points</h2>
      <input type="hidden" name="userId" value={userId} />
      <div>
        <label className="label" htmlFor="amount">
          Amount (use a negative number to deduct)
        </label>
        <input id="amount" name="amount" type="number" required step="1" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="reason">
          Reason
        </label>
        <input id="reason" name="reason" required placeholder="Customer service credit" className="input" />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Points updated.</p>}
      <SubmitButton pendingLabel="Saving…" className="btn-primary self-start">
        Apply Adjustment
      </SubmitButton>
    </form>
  );
}
