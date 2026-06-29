"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
import { updatePrintSettings } from "@/lib/repo/printSettings";
import { createMaterial, updateMaterial, deleteMaterial } from "@/lib/repo/materials";
import { dollarsToCents } from "@/lib/money";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

const settingsSchema = z.object({
  maxLengthMm: z.coerce.number().positive("Must be greater than 0").max(10000),
  maxWidthMm: z.coerce.number().positive("Must be greater than 0").max(10000),
  maxHeightMm: z.coerce.number().positive("Must be greater than 0").max(10000),
  basePrice: z.coerce.number().min(0, "Can't be negative"),
  pricePerCm3: z.coerce.number().min(0, "Can't be negative"),
});

export async function updatePrintSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireOwner();

  const parsed = settingsSchema.safeParse({
    maxLengthMm: formData.get("maxLengthMm"),
    maxWidthMm: formData.get("maxWidthMm"),
    maxHeightMm: formData.get("maxHeightMm"),
    basePrice: formData.get("basePrice"),
    pricePerCm3: formData.get("pricePerCm3"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const autoQuoteEnabled = formData.get("autoQuoteEnabled") === "on";

  updatePrintSettings({
    maxLengthMm: data.maxLengthMm,
    maxWidthMm: data.maxWidthMm,
    maxHeightMm: data.maxHeightMm,
    basePriceCents: dollarsToCents(data.basePrice),
    pricePerCm3Cents: dollarsToCents(data.pricePerCm3),
    autoQuoteEnabled,
  });

  revalidatePath("/owner/settings");
  return { success: true };
}

export interface MaterialFormState {
  error?: string;
  success?: boolean;
}

const materialSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  priceMultiplier: z.coerce.number().positive("Must be greater than 0").max(100),
});

export async function createMaterialAction(
  _prevState: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  await requireOwner();

  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    priceMultiplier: formData.get("priceMultiplier"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const autoQuoteEligible = formData.get("autoQuoteEligible") === "on";

  try {
    createMaterial({ name: data.name, priceMultiplier: data.priceMultiplier, autoQuoteEligible });
  } catch {
    return { error: `A material named "${data.name}" already exists.` };
  }
  revalidatePath("/owner/settings");
  return { success: true };
}

const updateMaterialSchema = materialSchema.extend({
  id: z.string().min(1),
});

export async function updateMaterialAction(
  _prevState: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  await requireOwner();

  const parsed = updateMaterialSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    priceMultiplier: formData.get("priceMultiplier"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const autoQuoteEligible = formData.get("autoQuoteEligible") === "on";
  const active = formData.get("active") === "on";

  try {
    updateMaterial(data.id, { name: data.name, priceMultiplier: data.priceMultiplier, autoQuoteEligible, active });
  } catch {
    return { error: `A material named "${data.name}" already exists.` };
  }
  revalidatePath("/owner/settings");
  return { success: true };
}

export async function deleteMaterialAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  deleteMaterial(id);
  revalidatePath("/owner/settings");
}
