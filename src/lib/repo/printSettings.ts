import { getDb } from "@/lib/db/client";
import type { PrintSettings } from "@/lib/types";

interface PrintSettingsRow {
  id: string;
  max_length_mm: number;
  max_width_mm: number;
  max_height_mm: number;
  base_price_cents: number;
  price_per_cm3_cents: number;
  auto_quote_enabled: number;
  updated_at: string;
}

function mapPrintSettings(row: PrintSettingsRow): PrintSettings {
  return {
    id: row.id,
    maxLengthMm: row.max_length_mm,
    maxWidthMm: row.max_width_mm,
    maxHeightMm: row.max_height_mm,
    basePriceCents: row.base_price_cents,
    pricePerCm3Cents: row.price_per_cm3_cents,
    autoQuoteEnabled: !!row.auto_quote_enabled,
    updatedAt: row.updated_at,
  };
}

export function getPrintSettings(): PrintSettings {
  const db = getDb();
  let row = db.prepare("SELECT * FROM print_settings WHERE id = 'default'").get() as
    | unknown as PrintSettingsRow
    | undefined;
  if (!row) {
    db.prepare("INSERT INTO print_settings (id) VALUES ('default')").run();
    row = db.prepare("SELECT * FROM print_settings WHERE id = 'default'").get() as unknown as PrintSettingsRow;
  }
  return mapPrintSettings(row);
}

export interface UpdatePrintSettingsInput {
  maxLengthMm: number;
  maxWidthMm: number;
  maxHeightMm: number;
  basePriceCents: number;
  pricePerCm3Cents: number;
  autoQuoteEnabled: boolean;
}

export function updatePrintSettings(input: UpdatePrintSettingsInput): PrintSettings {
  getPrintSettings(); // ensure the row exists before updating
  getDb()
    .prepare(
      `UPDATE print_settings SET max_length_mm = ?, max_width_mm = ?, max_height_mm = ?,
       base_price_cents = ?, price_per_cm3_cents = ?, auto_quote_enabled = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = 'default'`
    )
    .run(
      input.maxLengthMm,
      input.maxWidthMm,
      input.maxHeightMm,
      input.basePriceCents,
      input.pricePerCm3Cents,
      input.autoQuoteEnabled ? 1 : 0
    );
  return getPrintSettings();
}
