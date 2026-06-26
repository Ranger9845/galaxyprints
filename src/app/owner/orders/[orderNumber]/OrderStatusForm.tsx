"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { updateOrderStatusAction } from "@/lib/actions/orderManagement";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";

export function OrderStatusForm({ orderId, currentStatus }: { orderId: string; currentStatus: OrderStatus }) {
  const [state, formAction] = useActionState(updateOrderStatusAction, {});

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-6">
      <h2 className="font-semibold text-slate-900">Update Status</h2>
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label className="label" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={currentStatus} className="input">
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="message">
          Note to customer (optional)
        </label>
        <input id="message" name="message" placeholder="Leave blank to use the default message" className="input" />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Status updated.</p>}
      <SubmitButton pendingLabel="Updating…" className="btn-primary self-start">
        Update Status
      </SubmitButton>
    </form>
  );
}
