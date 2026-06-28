import { randomUUID } from "node:crypto";
import { getDb, runInTransaction } from "@/lib/db/client";
import { applyPointsDelta } from "@/lib/repo/users";
import { restockProduct, decrementStock } from "@/lib/repo/products";
import type { Order, OrderItem, OrderStatus, OrderStatusEvent } from "@/lib/types";

interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  contact_email: string;
  status: string;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  points_used: number;
  points_earned: number;
  shipping_name: string;
  shipping_address1: string;
  shipping_address2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  tracking_number: string | null;
  carrier: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  color: string;
  material: string;
  custom_request_id: string | null;
}

interface OrderStatusEventRow {
  id: string;
  order_id: string;
  status: string;
  message: string;
  created_at: string;
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    contactEmail: row.contact_email,
    status: row.status as OrderStatus,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    discountCents: row.discount_cents,
    totalCents: row.total_cents,
    pointsUsed: row.points_used,
    pointsEarned: row.points_earned,
    shippingName: row.shipping_name,
    shippingAddress1: row.shipping_address1,
    shippingAddress2: row.shipping_address2,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state,
    shippingZip: row.shipping_zip,
    shippingCountry: row.shipping_country,
    trackingNumber: row.tracking_number,
    carrier: row.carrier,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
    color: row.color,
    material: row.material,
    customRequestId: row.custom_request_id,
  };
}

function mapStatusEvent(row: OrderStatusEventRow): OrderStatusEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status as OrderStatus,
    message: row.message,
    createdAt: row.created_at,
  };
}

function generateOrderNumber(): string {
  const random = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `GP-${random}`;
}

function uniqueOrderNumber(): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateOrderNumber();
    if (!findOrderByOrderNumber(candidate)) return candidate;
  }
  throw new Error("Could not generate a unique order number");
}

export function findOrderByOrderNumber(orderNumber: string): Order | null {
  const row = getDb()
    .prepare("SELECT * FROM orders WHERE order_number = ?")
    .get(orderNumber.toUpperCase().trim()) as unknown as OrderRow | undefined;
  return row ? mapOrder(row) : null;
}

export function findOrderById(id: string): Order | null {
  const row = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as unknown as OrderRow | undefined;
  return row ? mapOrder(row) : null;
}

export function getOrderItems(orderId: string): OrderItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .all(orderId) as unknown as OrderItemRow[];
  return rows.map(mapOrderItem);
}

export function getOrderStatusEvents(orderId: string): OrderStatusEvent[] {
  const rows = getDb()
    .prepare("SELECT * FROM order_status_events WHERE order_id = ? ORDER BY created_at ASC")
    .all(orderId) as unknown as OrderStatusEventRow[];
  return rows.map(mapStatusEvent);
}

export function listOrdersByUser(userId: string): Order[] {
  const rows = getDb()
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as unknown as OrderRow[];
  return rows.map(mapOrder);
}

export function listAllOrders(filterStatus?: OrderStatus): Order[] {
  const rows = filterStatus
    ? (getDb()
        .prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC")
        .all(filterStatus) as unknown as OrderRow[])
    : (getDb().prepare("SELECT * FROM orders ORDER BY created_at DESC").all() as unknown as OrderRow[]);
  return rows.map(mapOrder);
}

export interface CreateOrderItemInput {
  productId: string | null;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  color: string;
  material: string;
  customRequestId?: string | null;
}

export interface CreateOrderInput {
  userId: string | null;
  contactEmail: string;
  items: CreateOrderItemInput[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  pointsUsed: number;
  pointsEarned: number;
  shippingName: string;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
}

export function createOrder(input: CreateOrderInput): Order {
  return runInTransaction((db) => {
    const id = randomUUID();
    const orderNumber = uniqueOrderNumber();

    db.prepare(
      `INSERT INTO orders (
        id, order_number, user_id, contact_email, status, subtotal_cents, shipping_cents,
        discount_cents, total_cents, points_used, points_earned, shipping_name, shipping_address1,
        shipping_address2, shipping_city, shipping_state, shipping_zip, shipping_country
      ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      orderNumber,
      input.userId,
      input.contactEmail.toLowerCase().trim(),
      input.subtotalCents,
      input.shippingCents,
      input.discountCents,
      input.totalCents,
      input.pointsUsed,
      input.pointsEarned,
      input.shippingName,
      input.shippingAddress1,
      input.shippingAddress2,
      input.shippingCity,
      input.shippingState,
      input.shippingZip,
      input.shippingCountry
    );

    for (const item of input.items) {
      db.prepare(
        `INSERT INTO order_items (id, order_id, product_id, product_name, unit_price_cents, quantity, color, material, custom_request_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        id,
        item.productId,
        item.productName,
        item.unitPriceCents,
        item.quantity,
        item.color,
        item.material,
        item.customRequestId ?? null
      );
      if (item.productId) decrementStock(item.productId, item.quantity);
    }

    db.prepare(
      "INSERT INTO order_status_events (id, order_id, status, message) VALUES (?, ?, 'PENDING', ?)"
    ).run(randomUUID(), id, "Order placed and payment received.");

    if (input.userId) {
      if (input.pointsUsed > 0) {
        applyPointsDelta(db, input.userId, -input.pointsUsed, "redeemed_at_checkout", id);
      }
      if (input.pointsEarned > 0) {
        applyPointsDelta(db, input.userId, input.pointsEarned, "earned_from_purchase", id);
      }
    }

    return findOrderById(id)!;
  });
}

const FORWARD_STATUS_MESSAGES: Record<OrderStatus, string> = {
  PENDING: "Order placed and payment received.",
  IN_PRODUCTION: "Your print has started on the printer bed.",
  QUALITY_CHECK: "Print complete — inspecting and cleaning up your piece.",
  SHIPPED: "Your order has shipped.",
  DELIVERED: "Order marked as delivered.",
  CANCELLED: "Order was cancelled.",
};

export function transitionOrderStatus(orderId: string, newStatus: OrderStatus, message?: string): Order {
  return runInTransaction((db) => {
    const order = findOrderById(orderId);
    if (!order) throw new Error("Order not found");

    if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
      const items = getOrderItems(orderId);
      for (const item of items) {
        if (item.productId) restockProduct(item.productId, item.quantity);
      }
      if (order.userId) {
        if (order.pointsEarned > 0) {
          applyPointsDelta(db, order.userId, -order.pointsEarned, "order_cancelled_reversal", orderId);
        }
        if (order.pointsUsed > 0) {
          applyPointsDelta(db, order.userId, order.pointsUsed, "order_cancelled_refund", orderId);
        }
      }
    }

    db.prepare(
      "UPDATE orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
    ).run(newStatus, orderId);

    db.prepare(
      "INSERT INTO order_status_events (id, order_id, status, message) VALUES (?, ?, ?, ?)"
    ).run(randomUUID(), orderId, newStatus, message || FORWARD_STATUS_MESSAGES[newStatus]);

    return findOrderById(orderId)!;
  });
}

export function setTrackingInfo(orderId: string, trackingNumber: string, carrier: string): Order {
  getDb()
    .prepare(
      "UPDATE orders SET tracking_number = ?, carrier = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
    )
    .run(trackingNumber, carrier, orderId);
  return findOrderById(orderId)!;
}

export function getOrderForGuestTracking(orderNumber: string, email: string): Order | null {
  const order = findOrderByOrderNumber(orderNumber);
  if (!order) return null;
  if (order.contactEmail.toLowerCase() !== email.toLowerCase().trim()) return null;
  return order;
}

export interface OwnerStats {
  totalRevenueCents: number;
  totalOrders: number;
  activeOrders: number;
  totalCustomers: number;
  totalPointsOutstanding: number;
}

export function getOwnerStats(): OwnerStats {
  const db = getDb();
  const revenue = db
    .prepare("SELECT COALESCE(SUM(total_cents), 0) as total FROM orders WHERE status != 'CANCELLED'")
    .get() as { total: number };
  const totalOrders = db.prepare("SELECT COUNT(*) as c FROM orders").get() as { c: number };
  const activeOrders = db
    .prepare("SELECT COUNT(*) as c FROM orders WHERE status NOT IN ('DELIVERED', 'CANCELLED')")
    .get() as { c: number };
  const customers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'CUSTOMER'").get() as {
    c: number;
  };
  const points = db.prepare("SELECT COALESCE(SUM(points), 0) as p FROM users").get() as { p: number };

  return {
    totalRevenueCents: revenue.total,
    totalOrders: totalOrders.c,
    activeOrders: activeOrders.c,
    totalCustomers: customers.c,
    totalPointsOutstanding: points.p,
  };
}
