"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { setCustomPrintQuoteAction } from "@/lib/actions/customPrints";
import type { PrintMethod } from "@/lib/types";

const ORIGIN_LAT = 35.5168;
const ORIGIN_LNG = -96.9097;

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shippingFromMiles(miles: number): number {
  if (miles < 150) return 5.99;
  if (miles < 500) return 8.99;
  if (miles < 1000) return 12.99;
  return 15.99;
}

function autoSelectMethod(customerMaterial: string, methods: PrintMethod[]): PrintMethod | null {
  if (!methods.length) return null;
  const m = customerMaterial.toLowerCase().trim();
  if (!m) return methods[0];
  const keywords = [
    { terms: ["resin", "sla", "msla", "dlp", "lcd"], priority: 10 },
    { terms: ["petg"], priority: 9 },
    { terms: ["abs"], priority: 9 },
    { terms: ["nylon", "pa"], priority: 9 },
    { terms: ["pla"], priority: 8 },
    { terms: ["fdm", "fff", "plastic"], priority: 7 },
  ];
  let best: PrintMethod | null = null;
  let bestScore = -1;
  for (const method of methods) {
    const nameLower = method.name.toLowerCase();
    for (const { terms, priority } of keywords) {
      const customerMatchesTerm = terms.some((t) => m.includes(t));
      const methodMatchesTerm = terms.some((t) => nameLower.includes(t));
      if (customerMatchesTerm && methodMatchesTerm && priority > bestScore) {
        best = method;
        bestScore = priority;
      }
    }
  }
  return best ?? methods[0];
}

interface Breakdown {
  printCost: number;
  shippingCost: number;
  total: number;
  distanceMiles?: number;
  zipNotFound?: boolean;
  gramsUsed: number;
  printHours: number;
  methodName: string;
}

export function QuoteForm({
  requestId,
  quotePriceCents,
  quoteNotes,
  shippingZip,
  fileSizeBytes,
  quantity,
  material,
  printMethods,
}: {
  requestId: string;
  quotePriceCents: number | null;
  quoteNotes: string;
  shippingZip: string;
  fileSizeBytes: number;
  quantity: number;
  material: string;
  printMethods: PrintMethod[];
}) {
  const [state, formAction] = useActionState(setCustomPrintQuoteAction, {});
  const priceRef = useRef<HTMLInputElement>(null);

  const fileSizeKB = fileSizeBytes / 1024;
  const estGrams = Math.max(5, Math.round(fileSizeKB / 30));
  const estHours = Math.max(0.5, parseFloat((fileSizeKB / 500).toFixed(1)));

  const autoMethod = autoSelectMethod(material, printMethods);
  const [selectedMethodId, setSelectedMethodId] = useState(autoMethod?.id ?? "");
  const selectedMethod = printMethods.find((m) => m.id === selectedMethodId) ?? autoMethod;

  const [grams, setGrams] = useState(estGrams);
  const [hours, setHours] = useState(estHours);
  const [matRate, setMatRate] = useState(selectedMethod?.materialRate ?? 0.25);
  const [hourlyRate, setHourlyRate] = useState(selectedMethod?.hourlyRate ?? 20);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);

  useEffect(() => {
    if (selectedMethod) {
      setMatRate(selectedMethod.materialRate);
      setHourlyRate(selectedMethod.hourlyRate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethodId]);

  async function handleAutoCalc() {
    setLoading(true);
    setBreakdown(null);
    let shippingCost = 5.99;
    let distanceMiles: number | undefined;
    let zipNotFound = false;
    if (shippingZip) {
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(shippingZip)}&country=US&format=json&limit=1`,
          { headers: { "User-Agent": "GalaxyPrints/1.0 (auto-quote)" } }
        );
        const results = await geo.json();
        if (results.length > 0) {
          const { lat, lon } = results[0];
          distanceMiles = Math.round(haversineMiles(ORIGIN_LAT, ORIGIN_LNG, parseFloat(lat), parseFloat(lon)));
          shippingCost = shippingFromMiles(distanceMiles);
        } else {
          zipNotFound = true;
        }
      } catch {
        zipNotFound = true;
      }
    }
    const matCost = grams * matRate;
    const laborCost = hours * hourlyRate;
    const printCostPerUnit = Math.max(10, matCost + laborCost);
    const printCost = parseFloat((printCostPerUnit * quantity).toFixed(2));
    const total = parseFloat((printCost + shippingCost).toFixed(2));
    setBreakdown({ printCost, shippingCost, total, distanceMiles, zipNotFound, gramsUsed: grams, printHours: hours, methodName: selectedMethod?.name ?? "Unknown" });
    if (priceRef.current) priceRef.current.value = total.toFixed(2);
    setLoading(false);
  }

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-6">
      <h2 className="font-semibold text-slate-900">Send Quote</h2>
      <input type="hidden" name="requestId" value={requestId} />

      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <h3 className="text-sm font-semibold text-violet-900">Auto-Quote Calculator</h3>
        </div>

        {printMethods.length > 0 && (
          <div>
            <label className="label text-xs text-violet-800">Print Method</label>
            <select value={selectedMethodId} onChange={(e) => setSelectedMethodId(e.target.value)} className="input text-sm">
              {printMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — ${m.materialRate.toFixed(2)}/g · ${m.hourlyRate.toFixed(2)}/hr
                </option>
              ))}
            </select>
            {selectedMethod?.description && <p className="mt-1 text-xs text-slate-400">{selectedMethod.description}</p>}
            {autoMethod && autoMethod.id === selectedMethodId && material && (
              <p className="mt-0.5 text-xs text-violet-600">↑ Auto-selected based on customer&apos;s request: &quot;{material}&quot;</p>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label text-xs text-violet-800">
              {selectedMethod?.name?.toLowerCase().includes("resin") ? "Resin Used (grams)" : "Filament Used (grams)"}
            </label>
            <input type="number" min={1} step={1} value={grams} onChange={(e) => setGrams(parseInt(e.target.value) || 0)} className="input text-sm" />
            <p className="mt-0.5 text-xs text-slate-400">Est. from file size · adjust if needed</p>
          </div>
          <div>
            <label className="label text-xs text-violet-800">Print Time (hrs)</label>
            <input type="number" min={0.1} step={0.1} value={hours} onChange={(e) => setHours(parseFloat(e.target.value) || 0)} className="input text-sm" />
            <p className="mt-0.5 text-xs text-slate-400">Est. from file size · adjust if needed</p>
          </div>
          <div>
            <label className="label text-xs text-violet-800">Material Rate ($/g)</label>
            <input type="number" min={0.01} step={0.01} value={matRate} onChange={(e) => setMatRate(parseFloat(e.target.value) || 0)} className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs text-violet-800">Hourly Rate ($/hr)</label>
            <input type="number" min={1} step={0.5} value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} className="input text-sm" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 bg-white/60 rounded px-3 py-2 border border-violet-100">
          <span>Qty: <strong className="text-slate-700">{quantity}</strong></span>
          {shippingZip ? (
            <span>Customer ZIP: <strong className="text-violet-700">{shippingZip}</strong><span className="ml-1 text-slate-400">(ships from Meeker, OK)</span></span>
          ) : (
            <span className="text-amber-600">⚠ No ZIP — flat $5.99 shipping used</span>
          )}
        </div>

        <button type="button" onClick={handleAutoCalc} disabled={loading} className="btn-primary self-start">
          {loading ? "Calculating…" : "⚡ Auto-Calculate"}
        </button>

        {breakdown && (
          <div className="rounded-lg bg-white border border-violet-200 p-3 text-sm text-slate-700 flex flex-col gap-1.5">
            <div className="text-xs font-semibold text-violet-700 mb-0.5 uppercase tracking-wide">{breakdown.methodName}</div>
            <div className="text-xs text-slate-400">
              {breakdown.gramsUsed}g {breakdown.methodName.toLowerCase().includes("resin") ? "resin" : "filament"} · {breakdown.printHours}hr print time
            </div>
            <div className="flex justify-between">
              <span>Print + Materials{quantity > 1 ? ` (${quantity}×)` : ""}</span>
              <span className="font-medium">${breakdown.printCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping{breakdown.distanceMiles !== undefined ? ` (~${breakdown.distanceMiles} mi from Meeker, OK)` : breakdown.zipNotFound ? " (ZIP not found — flat rate)" : " (flat rate — no ZIP)"}</span>
              <span className="font-medium">${breakdown.shippingCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-slate-200 pt-1.5 mt-0.5 text-violet-900">
              <span>Total Quote</span>
              <span>${breakdown.total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">↑ Applied to the price field below — adjust before sending if needed</p>
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="price">Total Price ($)</label>
        <input ref={priceRef} id="price" name="price" type="number" min={0.01} step={0.01} required
          defaultValue={quotePriceCents != null ? (quotePriceCents / 100).toFixed(2) : undefined}
          className="input" />
      </div>
      <div>
        <label className="label" htmlFor="quoteNotes">Note to customer (optional)</label>
        <textarea id="quoteNotes" name="quoteNotes" rows={3} defaultValue={quoteNotes} className="input" />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Quote sent.</p>}
      <SubmitButton pendingLabel="Sending…" className="btn-primary self-start">Send Quote</SubmitButton>
    </form>
  );
}
