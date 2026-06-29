"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
import { createPrintMethod, updatePrintMethod, deletePrintMethod } from "@/lib/repo/printMethods";

const methodSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional().default(""),
  materialRate: z.coerce.number().min(0).max(100),
  hourlyRate: z.coerce.number().min(0).max(1000),
  sortOrder: z.coerce.number().int().min(0).optional().default(99),
});

export interface PrintMethodFormState {
  error?: string;
  success?: boolean;
}

export async function createPrintMethodAction(
  _prev: PrintMethodFormState,
  formData: FormData
): Promise<PrintMethodFormState> {
  await requireOwner();
  const parsed = methodSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    materialRate: formData.get("materialRate"),
    hourlyRate: formData.get("hourlyRate"),
    sortOrder: formData.get("sortOrder") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  createPrintMethod(parsed.data);
  revalidatePath("/owner/print-methods");
  return { success: true };
}

export async function updatePrintMethodAction(
  _prev: PrintMethodFormState,
  formData: FormData
): Promise<PrintMethodFormState> {
  await requireOwner();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id" };
  const parsed = methodSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    materialRate: formData.get("materialRate"),
    hourlyRate: formData.get("hourlyRate"),
    sortOrder: formData.get("sortOrder") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const active = formData.get("active") === "1";
  updatePrintMethod(id, { ...parsed.data, active });
  revalidatePath("/owner/print-methods");
  return { success: true };
}

export async function deletePrintMethodAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  deletePrintMethod(id);
  revalidatePath("/owner/print-methods");
}
