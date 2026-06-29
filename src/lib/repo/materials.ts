import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { Material } from "@/lib/types";

interface MaterialRow {
  id: string;
  name: string;
  price_multiplier: number;
  auto_quote_eligible: number;
  active: number;
  created_at: string;
}

function mapMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    name: row.name,
    priceMultiplier: row.price_multiplier,
    autoQuoteEligible: !!row.auto_quote_eligible,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

const DEFAULT_MATERIALS: { name: string; priceMultiplier: number }[] = [
  { name: "PLA", priceMultiplier: 1 },
  { name: "PETG", priceMultiplier: 1.1 },
  { name: "ABS", priceMultiplier: 1.1 },
  { name: "Resin", priceMultiplier: 1.8 },
];

function ensureDefaultMaterials(): void {
  const count = getDb().prepare("SELECT COUNT(*) AS n FROM materials").get() as { n: number };
  if (count.n > 0) return;
  for (const defaults of DEFAULT_MATERIALS) {
    createMaterial({ name: defaults.name, priceMultiplier: defaults.priceMultiplier, autoQuoteEligible: true });
  }
}

export function listMaterials(options: { activeOnly?: boolean } = {}): Material[] {
  ensureDefaultMaterials();
  const rows = options.activeOnly
    ? (getDb().prepare("SELECT * FROM materials WHERE active = 1 ORDER BY name").all() as unknown as MaterialRow[])
    : (getDb().prepare("SELECT * FROM materials ORDER BY name").all() as unknown as MaterialRow[]);
  return rows.map(mapMaterial);
}

export function findMaterialById(id: string): Material | null {
  const row = getDb().prepare("SELECT * FROM materials WHERE id = ?").get(id) as unknown as MaterialRow | undefined;
  return row ? mapMaterial(row) : null;
}

export interface CreateMaterialInput {
  name: string;
  priceMultiplier: number;
  autoQuoteEligible: boolean;
}

export function createMaterial(input: CreateMaterialInput): Material {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO materials (id, name, price_multiplier, auto_quote_eligible, active)
       VALUES (?, ?, ?, ?, 1)`
    )
    .run(id, input.name, input.priceMultiplier, input.autoQuoteEligible ? 1 : 0);
  return findMaterialById(id)!;
}

export interface UpdateMaterialInput {
  name: string;
  priceMultiplier: number;
  autoQuoteEligible: boolean;
  active: boolean;
}

export function updateMaterial(id: string, input: UpdateMaterialInput): Material {
  getDb()
    .prepare(
      `UPDATE materials SET name = ?, price_multiplier = ?, auto_quote_eligible = ?, active = ? WHERE id = ?`
    )
    .run(input.name, input.priceMultiplier, input.autoQuoteEligible ? 1 : 0, input.active ? 1 : 0, id);
  return findMaterialById(id)!;
}

export function deleteMaterial(id: string): void {
  getDb().prepare("UPDATE custom_print_requests SET material_id = NULL WHERE material_id = ?").run(id);
  getDb().prepare("DELETE FROM materials WHERE id = ?").run(id);
}
