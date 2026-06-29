"use client";

import { useActionState } from "react";
import { updateMaterialAction, deleteMaterialAction, type MaterialFormState } from "@/lib/actions/printSettings";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SubmitButton } from "@/components/SubmitButton";
import type { Material } from "@/lib/types";

const ROW_GRID = "grid grid-cols-[1fr_100px_100px_80px_70px_70px] items-center gap-x-3 gap-y-1 px-4 py-3";

export function MaterialRow({ material }: { material: Material }) {
  const [state, formAction] = useActionState<MaterialFormState, FormData>(updateMaterialAction, {});

  return (
    <div className={ROW_GRID}>
      <form action={formAction} className="contents">
        <input type="hidden" name="id" value={material.id} />
        <input name="name" defaultValue={material.name} required className="input" />
        <input
          name="priceMultiplier"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={material.priceMultiplier}
          required
          className="input"
        />
        <input
          type="checkbox"
          name="autoQuoteEligible"
          defaultChecked={material.autoQuoteEligible}
          className="h-4 w-4 justify-self-center"
        />
        <input type="checkbox" name="active" defaultChecked={material.active} className="h-4 w-4 justify-self-center" />
        <SubmitButton className="text-sm font-medium text-violet-700 hover:text-violet-800" pendingLabel="…">
          Save
        </SubmitButton>
      </form>
      <form action={deleteMaterialAction} className="contents">
        <input type="hidden" name="id" value={material.id} />
        <ConfirmSubmitButton
          confirmMessage={`Delete "${material.name}"? Existing requests keep showing this name, but it won't be selectable anymore.`}
          className="text-sm font-medium text-rose-600 hover:text-rose-700"
        >
          Delete
        </ConfirmSubmitButton>
      </form>
      {state.error && <p className="col-span-6 text-xs text-rose-600">{state.error}</p>}
    </div>
  );
}
