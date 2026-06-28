"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
import { adjustUserPoints } from "@/lib/repo/users";

export interface PointsAdjustState {
  error?: string;
  success?: boolean;
}

const adjustSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().int().refine((v) => v !== 0, "Amount can't be zero"),
  reason: z.string().trim().min(1, "Reason is required").max(200),
});

export async function adjustPointsAction(
  _prevState: PointsAdjustState,
  formData: FormData
): Promise<PointsAdjustState> {
  await requireOwner();

  const parsed = adjustSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { userId, amount, reason } = parsed.data;
  adjustUserPoints(userId, amount, reason);
  revalidatePath("/owner/customers");
  revalidatePath(`/owner/customers/${userId}`);
  return { success: true };
}
