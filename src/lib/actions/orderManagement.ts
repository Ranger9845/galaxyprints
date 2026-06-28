"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
import { transitionOrderStatus, setTrackingInfo } from "@/lib/repo/orders";
import { ORDER_STATUSES } from "@/lib/types";

export interface OrderActionState {
  error?: string;
  success?: boolean;
}

const statusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
  message: z.string().trim().max(500).optional(),
});

export async function updateOrderStatusAction(
  _prevState: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  await requireOwner();

  const parsed = statusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { orderId, status, message } = parsed.data;
  transitionOrderStatus(orderId, status, message);
  revalidatePath("/owner/orders");
  return { success: true };
}

const trackingSchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().trim().min(1, "Tracking number is required").max(100),
  carrier: z.string().trim().min(1, "Carrier is required").max(100),
});

export async function setTrackingInfoAction(
  _prevState: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  await requireOwner();

  const parsed = trackingSchema.safeParse({
    orderId: formData.get("orderId"),
    trackingNumber: formData.get("trackingNumber"),
    carrier: formData.get("carrier"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  setTrackingInfo(parsed.data.orderId, parsed.data.trackingNumber, parsed.data.carrier);
  revalidatePath("/owner/orders");
  return { success: true };
}
