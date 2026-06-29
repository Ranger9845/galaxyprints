import { useActionState } from "react";
import Link from "next/link";
import { listPrintMethods } from "@/lib/repo/printMethods";
import { createPrintMethodAction, updatePrintMethodAction, deletePrintMethodAction } from "@/lib/actions/printMethods";
import { SubmitButton } from "@/components/SubmitButton";

function AddMethodForm() {
  "use client";
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
      <SubmitButton pendingLabel="Adding…" className="btn-primary self-start">Add Method</SubmitButton>
    </form>
  );
}

export default async function PrintMethodsPage() {
  const methods = listPrintMethods(false);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Print Methods</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure the printing methods you offer. These drive auto-quote cost calculations.
          Resin is the primary method — it&apos;s auto-selected when a customer doesn&apos;t specify.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {methods.map((m) => (
          <details key={m.id} className={`card p-4 ${!m.active ? "opacity-50" : ""}`}>
            <summary className="flex items-center gap-3 cursor-pointer list-none">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{m.name}</span>
                  {!m.active && (
                    <span className="badge bg-slate-100 text-slate-500 text-xs">Inactive</span>
                  )}
                  {m.sortOrder === 1 && (
                    <span className="badge bg-violet-100 text-violet-700 text-xs">⭐ Primary</span>
                  )}
                </div>
                {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
              </div>
              <div className="text-right text-xs text-slate-500 shrink-0">
                <div>${m.materialRate.toFixed(2)}/g · ${m.hourlyRate.toFixed(2)}/hr</div>
              </div>
              <span className="text-slate-400 text-sm ml-2">▾</span>
            </summary>
            <div className="mt-4 border-t border-slate-100 pt-4 flex flex-col gap-3">
              <form action={updatePrintMethodAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="active" value={m.active ? "1" : "0"} />
                <div className="sm:col-span-2">
                  <label className="label text-xs">Name</label>
                  <input name="name" defaultValue={m.name} required className="input text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-xs">Description</label>
                  <input name="description" defaultValue={m.description} className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Material Rate ($/g)</label>
                  <input name="materialRate" type="number" min={0} step={0.01} defaultValue={m.materialRate} required className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Hourly Rate ($/hr)</label>
                  <input name="hourlyRate" type="number" min={0} step={0.5} defaultValue={m.hourlyRate} required className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Sort Order</label>
                  <input name="sortOrder" type="number" min={0} defaultValue={m.sortOrder} className="input text-sm" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="active"
                      value="1"
                      defaultChecked={m.active}
                      onChange={(e) => {
                        const hidden = e.target.form?.querySelector('input[name="active"][type="hidden"]') as HTMLInputElement;
                        if (hidden) hidden.value = e.target.checked ? "1" : "0";
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">Active</span>
                  </label>
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" className="btn-primary text-sm py-1.5 px-4">Save Changes</button>
                </div>
              </form>
              <form action={deletePrintMethodAction}>
                <input type="hidden" name="id" value={m.id} />
                <button
                  type="submit"
                  className="text-xs text-rose-600 hover:text-rose-800 underline"
                  onClick={(e) => { if (!confirm("Delete this print method?")) e.preventDefault(); }}
                >
                  Delete method
                </button>
              </form>
            </div>
          </details>
        ))}

        {methods.length === 0 && (
          <p className="text-sm text-slate-500 card p-6">No print methods yet — add one below.</p>
        )}
      </div>

      <AddMethodForm />
    </div>
  );
}
