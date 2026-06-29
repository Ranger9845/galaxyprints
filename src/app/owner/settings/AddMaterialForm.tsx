"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMaterialAction } from "@/lib/actions/printSettings";
import { SubmitButton } from "@/components/SubmitButton";

export function AddMaterialForm() {
  const [state, formAction] = useActionState(createMaterialAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4"
    >
      <div>
        <label className="label" htmlFor="newMaterialName">
          Name
        </label>
        <input id="newMaterialName" name="name" required className="input" placeholder="e.g. TPU" />
      </div>
      <div>
        <label className="label" htmlFor="newMaterialMultiplier">
          Price ×
        </label>
        <input
          id="newMaterialMultiplier"
          name="priceMultiplier"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue="1"
          required
          className="input w-24"
        />
      </div>
      <div className="flex items-center gap-2 pb-2">
        <input id="newMaterialAutoQuote" name="autoQuoteEligible" type="checkbox" defaultChecked className="h-4 w-4" />
        <label htmlFor="newMaterialAutoQuote" className="text-sm font-medium text-slate-700">
          Auto-quote eligible
        </label>
      </div>
      <SubmitButton pendingLabel="Adding…">Add Material</SubmitButton>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
    </form>
  );
}
