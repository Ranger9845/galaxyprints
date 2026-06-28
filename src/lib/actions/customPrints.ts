"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireOwner } from "@/lib/auth/guards";
import { isAllowedModelFile, MAX_UPLOAD_BYTES, saveUploadedModelFile } from "@/lib/uploads";
import {
  createCustomPrintRequest,
  declineCustomPrintQuote,
  findCustomPrintRequestById,
  markCustomPrintRequestOrdered,
  setCustomPrintQuote,
} from "@/lib/repo/customPrintRequests";
import { createOrder } from "@/lib/repo/orders";
import { dollarsToCents } from "@/lib/money";
import { calcShippingCents } from "@/lib/shipping";
import { calcPointsEarned } from "@/lib/points";

export interface CustomPrintFormState {
  error?: string;
  success?: boolean;
}

const submitSchema = z.object({
  contactEmail: z.string().trim().email(),
  notes: z.string().trim().max(2000).optional().default(""),
  material: z.string().trim().max(100).optional().default(""),
  color: z.string().trim().max(100).optional().default(""),
  quantity: z.coerce.number().int().min(1).max(100),
});

export async function submitCustomPrintRequestAction(
  _prevState: CustomPrintFormState,
  formData: FormData
): Promise<CustomPrintFormState> {
  const user = await getCurrentUser();

  const parsed = submitSchema.safeParse({
    contactEmail: formData.get("contactEmail"),
    notes: formData.get("notes") || undefined,
    material: formData.get("material") || undefined,
    color: formData.get("color") || undefined,
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a 3D model file to upload." };
  }
  if (!isAllowedModelFile(file.name)) {
    return { error: "Only .stl, .obj, and .3mf files are supported." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That file is too large (20MB max)." };
  }

  const data = parsed.data;
  const saved = await saveUploadedModelFile(file);

  const request = createCustomPrintRequest({
    userId: user?.id ?? null,
    contactEmail: data.contactEmail,
    fileName: saved.fileName,
    filePath: saved.filePath,
    fileSizeBytes: saved.sizeBytes,
    notes: data.notes ?? "",
    material: data.material ?? "",
    color: data.color ?? "",
    quantity: data.quantity,
  });

  revalidatePath("/owner/custom-prints");
  if (user) {
    redirect(`/account/custom-prints/${request.id}`);
  }
  redirect(`/custom-print/status?id=${request.id}&email=${encodeURIComponent(data.contactEmail)}`);
}

const quoteSchema = z.object({
  requestId: z.string().min(1),
  price: z.coerce.number().positive("Price must be greater than 0"),
  quoteNotes: z.string().trim().max(1000).optional().default(""),
});

export async function setCustomPrintQuoteAction(
  _prevState: CustomPrintFormState,
  formData: FormData
): Promise<CustomPrintFormState> {
  await requireOwner();

  const parsed = quoteSchema.safeParse({
    requestId: formData.get("requestId"),
    price: formData.get("price"),
    quoteNotes: formData.get("quoteNotes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  setCustomPrintQuote(data.requestId, dollarsToCents(data.price), data.quoteNotes ?? "");
  revalidatePath("/owner/custom-prints");
  revalidatePath(`/owner/custom-prints/${data.requestId}`);
  return { success: true };
}

export async function declineCustomPrintQuoteAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const contactEmail = formData.get("contactEmail");
  if (typeof id !== "string" || !id) return;

  const request = findCustomPrintRequestById(id);
  if (!request || request.status !== "QUOTED") return;

  const user = await getCurrentUser();
  const ownsAsUser = !!user && request.userId === user.id;
  const ownsAsGuest =
    typeof contactEmail === "string" &&
    request.contactEmail.toLowerCase() === contactEmail.toLowerCase().trim();
  if (!ownsAsUser && !ownsAsGuest) return;

  declineCustomPrintQuote(id);
  revalidatePath(`/account/custom-prints/${id}`);
  revalidatePath("/custom-print/status");
}

const acceptQuoteSchema = z.object({
  requestId: z.string().min(1),
  contactEmail: z.string().trim().email(),
  shippingName: z.string().trim().min(1).max(200),
  shippingAddress1: z.string().trim().min(1).max(200),
  shippingAddress2: z.string().trim().max(200).optional().default(""),
  shippingCity: z.string().trim().min(1).max(100),
  shippingState: z.string().trim().min(1).max(100),
  shippingZip: z.string().trim().min(1).max(20),
  shippingCountry: z.string().trim().min(1).max(100),
});

export type AcceptQuoteInput = z.infer<typeof acceptQuoteSchema>;

export interface AcceptQuoteResult {
  error?: string;
  orderNumber?: string;
}

export async function acceptCustomPrintQuoteAction(input: AcceptQuoteInput): Promise<AcceptQuoteResult> {
  const parsed = acceptQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const request = findCustomPrintRequestById(data.requestId);
  if (!request || request.status !== "QUOTED" || request.quotePriceCents == null) {
    return { error: "This quote is no longer available." };
  }

  const user = await getCurrentUser();
  const ownsAsUser = !!user && request.userId === user.id;
  const ownsAsGuest = request.contactEmail.toLowerCase() === data.contactEmail.toLowerCase().trim();
  if (!ownsAsUser && !ownsAsGuest) {
    return { error: "We couldn't verify this request." };
  }

  const subtotalCents = request.quotePriceCents;
  const shippingCents = calcShippingCents(subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  const pointsEarned = user ? calcPointsEarned(totalCents) : 0;

  const order = createOrder({
    userId: user?.id ?? request.userId ?? null,
    contactEmail: data.contactEmail,
    items: [
      {
        productId: null,
        productName: `Custom Print: ${request.fileName}`,
        unitPriceCents: subtotalCents,
        quantity: 1,
        color: request.color,
        material: request.material,
        customRequestId: request.id,
      },
    ],
    subtotalCents,
    shippingCents,
    discountCents: 0,
    totalCents,
    pointsUsed: 0,
    pointsEarned,
    shippingName: data.shippingName,
    shippingAddress1: data.shippingAddress1,
    shippingAddress2: data.shippingAddress2 ?? "",
    shippingCity: data.shippingCity,
    shippingState: data.shippingState,
    shippingZip: data.shippingZip,
    shippingCountry: data.shippingCountry,
  });

  markCustomPrintRequestOrdered(request.id, order.id);

  return { orderNumber: order.orderNumber };
}
