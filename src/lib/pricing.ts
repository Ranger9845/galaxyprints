import type { Material, PrintSettings } from "@/lib/types";

/** Suggested total price for a custom print job. Returns null when the volume is unknown
 *  (e.g. unmeasured 3MF uploads), since the formula has no input to work from in that case. */
export function computeSuggestedPriceCents(
  volumeCm3: number | null,
  quantity: number,
  material: Pick<Material, "priceMultiplier">,
  settings: Pick<PrintSettings, "basePriceCents" | "pricePerCm3Cents">
): number | null {
  if (volumeCm3 == null) return null;
  const perUnitCents = settings.basePriceCents + settings.pricePerCm3Cents * material.priceMultiplier * volumeCm3;
  return Math.round(perUnitCents * quantity);
}

/** Whether a request qualifies for automatic quoting: auto-quote must be enabled globally,
 *  the chosen material must opt in, and the model must have a measured volume. */
export function isAutoQuoteEligible(
  settings: Pick<PrintSettings, "autoQuoteEnabled">,
  material: Pick<Material, "autoQuoteEligible"> | null,
  volumeCm3: number | null
): boolean {
  return settings.autoQuoteEnabled && !!material?.autoQuoteEligible && volumeCm3 != null;
}
