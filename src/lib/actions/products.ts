"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
import { createProduct, updateProduct, deleteProduct } from "@/lib/repo/products";
import { dollarsToCents } from "@/lib/money";

export interface ProductFormState {
  error?: string;
  success?: boolean;
}

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(2000),
  price: z.coerce.number().positive("Price must be greater than 0"),
  imageEmoji: z.string().trim().min(1, "Pick an emoji").max(8),
  material: z.string().trim().min(1, "Material is required").max(100),
  color: z.string().trim().min(1, "Color is required").max(100),
  printHours: z.coerce.number().min(0).max(1000),
  stock: z.coerce.number().int().min(0).max(100000),
});

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireOwner();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    imageEmoji: formData.get("imageEmoji"),
    material: formData.get("material"),
    color: formData.get("color"),
    printHours: formData.get("printHours"),
    stock: formData.get("stock"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const product = createProduct({
    name: data.name,
    description: data.description,
    priceCents: dollarsToCents(data.price),
    imageEmoji: data.imageEmoji,
    material: data.material,
    color: data.color,
    printHours: data.printHours,
    stock: data.stock,
  });

  revalidatePath("/owner/products");
  redirect(`/owner/products/${product.id}/edit`);
}

const updateInputSchema = productSchema.extend({
  id: z.string().min(1),
});

export async function updateProductAction(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireOwner();

  const parsed = updateInputSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    imageEmoji: formData.get("imageEmoji"),
    material: formData.get("material"),
    color: formData.get("color"),
    printHours: formData.get("printHours"),
    stock: formData.get("stock"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const active = formData.get("active") === "on";

  updateProduct(data.id, {
    name: data.name,
    description: data.description,
    priceCents: dollarsToCents(data.price),
    imageEmoji: data.imageEmoji,
    material: data.material,
    color: data.color,
    printHours: data.printHours,
    stock: data.stock,
    active,
  });

  revalidatePath("/owner/products");
  revalidatePath(`/owner/products/${data.id}/edit`);
  return { success: true };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireOwner();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  deleteProduct(id);
  revalidatePath("/owner/products");
}
