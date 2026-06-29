import { listPrintMethods } from "@/lib/repo/printMethods";
import { updatePrintMethodAction, deletePrintMethodAction } from "@/lib/actions/printMethods";
import { AddMethodForm } from "./AddMethodForm";

export default async function PrintMethodsPage() {
  const methods = listPrintMethods(false);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Print Methods</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure the printing methods you offer. These drive auto-quote cost calculations.
          Resin (MSLA) is the primary method and is auto-selected when a customer doesn&apos;t specify.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {methods.map((m) => (
          <details key={m.id} className={`card overflow-hidden ${!m.active ? "opacity-60" : ""}`}>
            <summary className="flex items-center gap-3 cursor-pointer list-none p-4 hover:bg-slate-50 select-none">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{m.name}</span>
                  {!m.active && (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
                      Inactive
                    </span>
                  )}
                  {m.sortOrder === 1 && (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-700">
                      ⭐ Primary
                    </span>
                  )}
                </div>
                {m.description && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{m.description}</p>
                )}
              </div>
              <div className="text-right text-xs text-slate-500 shrink-0 mr-2">
                <div className="font-medium">${m.materialRate.toFixed(2)}/g</div>
                <div>${m.hourlyRate.toFixed(2)}/hr</div>
              </div>
              <span className="text-slate-400 text-sm">▾</span>
            </summary>

            <div className="border-t border-slate-100 p-4">
              <form action={updatePrintMethodAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={m.id} />
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
                  <p className="mt-0.5 text-xs text-slate-400">1 = first in auto-select, higher = lower priority</p>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="active"
                      value="1"
                      defaultChecked={m.active}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">Active (shown in quote calculator)</span>
                  </label>
                </div>
                <div className="sm:col-span-2 flex items-center gap-4">
                  <button type="submit" className="btn-primary text-sm py-1.5 px-4">
                    Save Changes
                  </button>
                  <form action={deletePrintMethodAction} className="inline">
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="text-xs text-rose-500 hover:text-rose-700 underline"
                      formAction={deletePrintMethodAction}
                    >
                      Delete method
                    </button>
                  </form>
                </div>
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
