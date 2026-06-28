"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { setTrackingInfoAction } from "@/lib/actions/orderManagement";

export function TrackingForm({
  orderId,
  trackingNumber,
  carrier,
}: {
  orderId: string;
  trackingNumber: string | null;
  carrier: string | null;
}) {
  const [state, formAction] = useActionState(setTrackingInfoAction, {});

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-6">
      <h2 className="font-semibold text-slate-900">Shipping &amp; Tracking</h2>
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label className="label" htmlFor="carrier">
          Carrier
        </label>
        <input
          id="carrier"
          name="carrier"
          required
          defaultValue={carrier ?? ""}
          placeholder="USPS, UPS, FedEx..."
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="trackingNumber">
          Tracking Number
        </label>
        <input
          id="trackingNumber"
          name="trackingNumber"
          required
          defaultValue={trackingNumber ?? ""}
          className="input"
        />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Tracking info saved.</p>}
      <SubmitButton pendingLabel="Saving…" className="btn-primary self-start">
        Save Tracking Info
      </SubmitButton>
    </form>
  );
}
