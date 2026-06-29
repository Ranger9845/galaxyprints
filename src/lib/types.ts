export type Role = "CUSTOMER" | "OWNER";

export const ORDER_STATUSES = [
  "PENDING",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Order Received",
  IN_PRODUCTION: "In Production",
  QUALITY_CHECK: "Quality Check",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  PENDING: "We've received your order and it's queued for printing.",
  IN_PRODUCTION: "Your print is on the printer bed right now.",
  QUALITY_CHECK: "Print finished — we're inspecting and cleaning it up.",
  SHIPPED: "Your package is on its way to you.",
  DELIVERED: "Delivered! Enjoy your print.",
  CANCELLED: "This order was cancelled.",
};

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  points: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  imageEmoji: string;
  material: string;
  color: string;
  printHours: number;
  stock: number;
  active: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  color: string;
  material: string;
  customRequestId: string | null;
}

export interface OrderStatusEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  message: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  contactEmail: string;
  status: OrderStatus;
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
  trackingNumber: string | null;
  carrier: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  orderId: string | null;
  createdAt: string;
}

export const CUSTOM_PRINT_STATUSES = ["SUBMITTED", "QUOTED", "ACCEPTED", "DECLINED", "CANCELLED"] as const;

export type CustomPrintStatus = (typeof CUSTOM_PRINT_STATUSES)[number];

export const CUSTOM_PRINT_STATUS_LABELS: Record<CustomPrintStatus, string> = {
  SUBMITTED: "Awaiting Review",
  QUOTED: "Quote Ready",
  ACCEPTED: "Accepted — Order Placed",
  DECLINED: "Quote Declined",
  CANCELLED: "Cancelled",
};

export interface CustomPrintRequest {
  id: string;
  userId: string | null;
  contactEmail: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  notes: string;
  material: string;
  materialId: string | null;
  color: string;
  quantity: number;
  status: CustomPrintStatus;
  quotePriceCents: number | null;
  quoteNotes: string;
  orderId: string | null;
  bboxLengthMm: number | null;
  bboxWidthMm: number | null;
  bboxHeightMm: number | null;
  volumeCm3: number | null;
  autoQuoted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  priceMultiplier: number;
  autoQuoteEligible: boolean;
  active: boolean;
  createdAt: string;
}

export interface PrintSettings {
  id: string;
  maxLengthMm: number;
  maxWidthMm: number;
  maxHeightMm: number;
  basePriceCents: number;
  pricePerCm3Cents: number;
  autoQuoteEnabled: boolean;
  updatedAt: string;
}

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}
