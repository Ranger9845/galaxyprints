import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { CustomPrintRequest, CustomPrintStatus } from "@/lib/types";

interface CustomPrintRequestRow {
  id: string;
  user_id: string | null;
  contact_email: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  notes: string;
  material: string;
  color: string;
  quantity: number;
  shipping_zip: string;
  status: string;
  quote_price_cents: number | null;
  quote_notes: string;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapCustomPrintRequest(row: CustomPrintRequestRow): CustomPrintRequest {
  return {
    id: row.id,
    userId: row.user_id,
    contactEmail: row.contact_email,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSizeBytes: row.file_size_bytes,
    notes: row.notes,
    material: row.material,
    color: row.color,
    quantity: row.quantity,
    shippingZip: row.shipping_zip ?? "",
    status: row.status as CustomPrintStatus,
    quotePriceCents: row.quote_price_cents,
    quoteNotes: row.quote_notes,
    orderId: row.order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findCustomPrintRequestById(id: string): CustomPrintRequest | null {
  const row = getDb()
    .prepare("SELECT * FROM custom_print_requests WHERE id = ?")
    .get(id) as unknown as CustomPrintRequestRow | undefined;
  return row ? mapCustomPrintRequest(row) : null;
}

export function getCustomPrintRequestForGuest(id: string, email: string): CustomPrintRequest | null {
  const request = findCustomPrintRequestById(id);
  if (!request) return null;
  if (request.contactEmail.toLowerCase() !== email.toLowerCase().trim()) return null;
  return request;
}

export function listCustomPrintRequestsByUser(userId: string): CustomPrintRequest[] {
  const rows = getDb()
    .prepare("SELECT * FROM custom_print_requests WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as unknown as CustomPrintRequestRow[];
  return rows.map(mapCustomPrintRequest);
}

export function listAllCustomPrintRequests(filterStatus?: CustomPrintStatus): CustomPrintRequest[] {
  const rows = filterStatus
    ? (getDb()
        .prepare("SELECT * FROM custom_print_requests WHERE status = ? ORDER BY created_at DESC")
        .all(filterStatus) as unknown as CustomPrintRequestRow[])
    : (getDb()
        .prepare("SELECT * FROM custom_print_requests ORDER BY created_at DESC")
        .all() as unknown as CustomPrintRequestRow[]);
  return rows.map(mapCustomPrintRequest);
}

export interface CreateCustomPrintRequestInput {
  userId: string | null;
  contactEmail: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  notes: string;
  material: string;
  color: string;
  quantity: number;
  shippingZip: string;
}

export function createCustomPrintRequest(input: CreateCustomPrintRequestInput): CustomPrintRequest {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO custom_print_requests
        (id, user_id, contact_email, file_name, file_path, file_size_bytes, notes, material, color, quantity, shipping_zip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.userId,
      input.contactEmail.toLowerCase().trim(),
      input.fileName,
      input.filePath,
      input.fileSizeBytes,
      input.notes,
      input.material,
      input.color,
      input.quantity,
      input.shippingZip ?? ""
    );
  return findCustomPrintRequestById(id)!;
}

export function setCustomPrintQuote(id: string, quotePriceCents: number, quoteNotes: string): CustomPrintRequest {
  getDb()
    .prepare(
      `UPDATE custom_print_requests SET status = 'QUOTED', quote_price_cents = ?, quote_notes = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    )
    .run(quotePriceCents, quoteNotes, id);
  return findCustomPrintRequestById(id)!;
}

export function declineCustomPrintQuote(id: string): CustomPrintRequest {
  getDb()
    .prepare(
      "UPDATE custom_print_requests SET status = 'DECLINED', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
    )
    .run(id);
  return findCustomPrintRequestById(id)!;
}

export function markCustomPrintRequestOrdered(id: string, orderId: string): CustomPrintRequest {
  getDb()
    .prepare(
      `UPDATE custom_print_requests SET status = 'ACCEPTED', order_id = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    )
    .run(orderId, id);
  return findCustomPrintRequestById(id)!;
}
