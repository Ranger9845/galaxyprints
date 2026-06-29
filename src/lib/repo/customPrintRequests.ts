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
  material_id: string | null;
  color: string;
  quantity: number;
  status: string;
  quote_price_cents: number | null;
  quote_notes: string;
  order_id: string | null;
  bbox_length_mm: number | null;
  bbox_width_mm: number | null;
  bbox_height_mm: number | null;
  volume_cm3: number | null;
  auto_quoted: number;
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
    materialId: row.material_id,
    color: row.color,
    quantity: row.quantity,
    status: row.status as CustomPrintStatus,
    quotePriceCents: row.quote_price_cents,
    quoteNotes: row.quote_notes,
    orderId: row.order_id,
    bboxLengthMm: row.bbox_length_mm,
    bboxWidthMm: row.bbox_width_mm,
    bboxHeightMm: row.bbox_height_mm,
    volumeCm3: row.volume_cm3,
    autoQuoted: !!row.auto_quoted,
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
  materialId: string | null;
  color: string;
  quantity: number;
  bboxLengthMm: number | null;
  bboxWidthMm: number | null;
  bboxHeightMm: number | null;
  volumeCm3: number | null;
}

export function createCustomPrintRequest(input: CreateCustomPrintRequestInput): CustomPrintRequest {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO custom_print_requests
        (id, user_id, contact_email, file_name, file_path, file_size_bytes, notes, material, material_id, color,
         quantity, bbox_length_mm, bbox_width_mm, bbox_height_mm, volume_cm3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      input.materialId,
      input.color,
      input.quantity,
      input.bboxLengthMm,
      input.bboxWidthMm,
      input.bboxHeightMm,
      input.volumeCm3
    );
  return findCustomPrintRequestById(id)!;
}

export function setCustomPrintQuote(
  id: string,
  quotePriceCents: number,
  quoteNotes: string,
  autoQuoted = false
): CustomPrintRequest {
  getDb()
    .prepare(
      `UPDATE custom_print_requests SET status = 'QUOTED', quote_price_cents = ?, quote_notes = ?, auto_quoted = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    )
    .run(quotePriceCents, quoteNotes, autoQuoted ? 1 : 0, id);
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
