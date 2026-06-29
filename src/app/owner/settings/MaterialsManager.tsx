import { MaterialRow } from "./MaterialRow";
import { AddMaterialForm } from "./AddMaterialForm";
import type { Material } from "@/lib/types";

const HEADER_GRID = "grid grid-cols-[1fr_100px_100px_80px_70px_70px] gap-x-3 bg-slate-50 px-4 py-3 text-left text-xs font-medium text-slate-500";

export function MaterialsManager({ materials }: { materials: Material[] }) {
  return (
    <div className="card flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Materials</h2>
        <p className="text-sm text-slate-600">
          The price multiplier scales the per-cm³ price above. Only active, auto-quote-eligible materials can
          receive an automatic quote.
        </p>
      </div>

      {materials.length === 0 ? (
        <p className="text-slate-600">No materials yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className={HEADER_GRID}>
            <div>Name</div>
            <div>Price ×</div>
            <div>Auto-Quote</div>
            <div>Active</div>
            <div></div>
            <div></div>
          </div>
          <div className="divide-y divide-slate-100">
            {materials.map((material) => (
              <MaterialRow key={material.id} material={material} />
            ))}
          </div>
        </div>
      )}

      <AddMaterialForm />
    </div>
  );
}
