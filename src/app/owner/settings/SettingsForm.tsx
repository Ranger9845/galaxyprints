"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { updatePrintSettingsAction } from "@/lib/actions/printSettings";
import type { PrintSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: PrintSettings }) {
  const [state, formAction] = useActionState(updatePrintSettingsAction, {});

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Build Volume & Pricing</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="maxLengthMm">
            Max Length (mm)
          </label>
          <input
            id="maxLengthMm"
            name="maxLengthMm"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={settings.maxLengthMm}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="maxWidthMm">
            Max Width (mm)
          </label>
          <input
            id="maxWidthMm"
            name="maxWidthMm"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={settings.maxWidthMm}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="maxHeightMm">
            Max Height (mm)
          </label>
          <input
            id="maxHeightMm"
            name="maxHeightMm"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={settings.maxHeightMm}
            className="input"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Uploads are rejected automatically if they can&apos;t be rotated to fit inside these dimensions.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="basePrice">
            Base Price (USD)
          </label>
          <input
            id="basePrice"
            name="basePrice"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={(settings.basePriceCents / 100).toFixed(2)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="pricePerCm3">
            Price per cm³ (USD)
          </label>
          <input
            id="pricePerCm3"
            name="pricePerCm3"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={(settings.pricePerCm3Cents / 100).toFixed(2)}
            className="input"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Suggested price = base price + (price per cm³ × material multiplier × volume) × quantity.
      </p>

      <div className="flex items-center gap-2">
        <input
          id="autoQuoteEnabled"
          name="autoQuoteEnabled"
          type="checkbox"
          defaultChecked={settings.autoQuoteEnabled}
          className="h-4 w-4"
        />
        <label htmlFor="autoQuoteEnabled" className="text-sm font-medium text-slate-700">
          Automatically send a quote when a request fits the build volume and uses an auto-quote-eligible material
        </label>
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Saved!</p>}

      <div>
        <SubmitButton pendingLabel="Saving…">Save Settings</SubmitButton>
      </div>
    </form>
  );
}
