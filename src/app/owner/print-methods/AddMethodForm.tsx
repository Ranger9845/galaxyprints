"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { createPrintMethodAction } from "@/lib/actions/printMethods";

export function AddMethodForm() {
  const [state, formAction] = useActionState(createPrintMethodAction, {});
  return (
    <form action={formAction} className="card p-6 flex flex-col gap-4">
      <h3 className="font-semibold text-slate-900">Add Print Method</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="add-name">Method Name</label>
          <input id="add-name" name="name" required placeholder="e.g. Resin (MSLA)" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="add-desc">Description (optional)</label>
          <input id="add-desc" name="description" placeholder="Brief description for your reference" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="add-mat">Material Rate ($/g)</label>
          <input id="add-mat" name="materialRate" type="number" min={0} step={0.01} required placeholder="0.25" className="input" />
          <p className="mt-1 text-xs text-slate-400">Resin ≈ 0.25 · PETG ≈ 0.12 · PLA ≈ 0.07</p>
        </div>
        <div>
          <label className="label" htmlFor="add-hr">Hourly Rate ($/hr)</label>
          <input id="add-hr" name="hourlyRate" type="number" min={0} step={0.5} required placeholder="20" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="add-sort">Sort Order</label>
          <input id="add-sort" name="sortOrder" type="number" min={0} step={1} defaultValue={99} className="input" />
          <p className="mt-1 text-xs text-slate-400">Lower = higher priority in auto-select</p>
        </div>
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Method added!</p>}
      <SubmitButton pendingLabel="Adding…" className="btn-primary self-start">
        Add Method
      </SubmitButton>
    </form>
  );
}
