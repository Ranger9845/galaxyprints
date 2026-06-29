import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { PrintMethod } from "@/lib/types";

interface PrintMethodRow {
  id: string;
  name: string;
  description: string;
  material_rate: number;
  hourly_rate: number;
  active: number;
  sort_order: number;
  created_at: string;
}

function mapRow(row: PrintMethodRow): PrintMethod {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    materialRate: row.material_rate,
    hourlyRate: row.hourly_rate,
    active: !!row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function listPrintMethods(activeOnly = true): PrintMethod[] {
  const rows = activeOnly
    ? getDb().prepare("SELECT * FROM print_methods WHERE active = 1 ORDER BY sort_order ASC, name ASC").all()
    : getDb().prepare("SELECT * FROM print_methods ORDER BY sort_order ASC, name ASC").all();
  return (rows as unknown as PrintMethodRow[]).map(mapRow);
}

export function findPrintMethodById(id: string): PrintMethod | null {
  const row = getDb()
    .prepare("SELECT * FROM print_methods WHERE id = ?")
    .get(id) as unknown as PrintMethodRow | undefined;
  return row ? mapRow(row) : null;
}

export function createPrintMethod(input: {
  name: string;
  description: string;
  materialRate: number;
  hourlyRate: number;
  sortOrder: number;
}): PrintMethod {
  const id = randomUUID();
  getDb()
    .prepare("INSERT INTO print_methods (id, name, description, material_rate, hourly_rate, sort_order) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, input.name, input.description, input.materialRate, input.hourlyRate, input.sortOrder);
  return findPrintMethodById(id)!;
}

export function updatePrintMethod(
  id: string,
  input: { name: string; description: string; materialRate: number; hourlyRate: number; active: boolean; sortOrder: number }
): PrintMethod {
  getDb()
    .prepare("UPDATE print_methods SET name=?, description=?, material_rate=?, hourly_rate=?, active=?, sort_order=? WHERE id=?")
    .run(input.name, input.description, input.materialRate, input.hourlyRate, input.active ? 1 : 0, input.sortOrder, id);
  return findPrintMethodById(id)!;
}

export function deletePrintMethod(id: string): void {
  getDb().prepare("DELETE FROM print_methods WHERE id = ?").run(id);
}
