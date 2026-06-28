"use server";

import { z } from "zod";
import { findProductById } from "@/lib/repo/products";
import { createOrder, type CreateOrderItemInput } from "@/lib/repo/orders";
import { getCurrentUser } from "@/lib/auth/guards";
import { calcShippingCents } from "@/lib/shipping";
import { calcPointsEarned, maxRedeemablePoints, pointsToCents } from "@/lib/points";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
});

const placeOrderSchema = z.object({
  items: z.array(itemSchema).min(1),
  contactEmail: z.string().trim().email(),
  pointsToRedeem: z.number().int().min(0),
  shippingName: z.string().trim().min(1).max(200),
  shippingAddress1: z.string().trim().min(1).max(200),
  shippingAddress2: z.string().trim().max(200).optional().default(""),
  shippingCity: z.string().trim().min(1).max(100),
  shippingState: z.string().trim().min(1).max(100),
  shippingZip: z.string().trim().min(1).max(20),
  shippingCountry: z.string().trim().min(1).max(100),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export interface PlaceOrderResult {
  error?: string;
  orderNumber?: string;
}

export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid order." };
  }
  const data = parsed.data;
  const user = await getCurrentUser();

  const orderItems: CreateOrderItemInput[] = [];
  let subtotalCents = 0;
  for (const item of data.items) {
    const product = findProductById(item.productId);
    if (!product || !product.active) {
      return { error: "One of the items in your cart is no longer available." };
    }
    if (product.stock < item.quantity) {
      return { error: `Only ${product.stock} left of "${product.name}" — please update your cart.` };
    }
    subtotalCents += product.priceCents * item.quantity;
    orderItems.push({
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
      color: product.color,
      material: product.material,
    });
  }

  let pointsUsed = 0;
  let discountCents = 0;
  if (user && data.pointsToRedeem > 0) {
    const cap = maxRedeemablePoints(subtotalCents, user.points);
    if (data.pointsToRedeem > cap) {
      return { error: "You can't redeem that many points for this order." };
    }
    pointsUsed = data.pointsToRedeem;
    discountCents = pointsToCents(pointsUsed);
  }

  const shippingCents = calcShippingCents(subtotalCents);
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
  const pointsEarned = user ? calcPointsEarned(totalCents) : 0;

  const order = createOrder({
    userId: user?.id ?? null,
    contactEmail: data.contactEmail,
    items: orderItems,
    subtotalCents,
    shippingCents,
    discountCents,
    totalCents,
    pointsUsed,
    pointsEarned,
    shippingName: data.shippingName,
    shippingAddress1: data.shippingAddress1,
    shippingAddress2: data.shippingAddress2 ?? "",
    shippingCity: data.shippingCity,
    shippingState: data.shippingState,
    shippingZip: data.shippingZip,
    shippingCountry: data.shippingCountry,
  });

  return { orderNumber: order.orderNumber };
}
