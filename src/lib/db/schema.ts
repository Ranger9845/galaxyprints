import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CUSTOMER', 'OWNER')) DEFAULT 'CUSTOMER',
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  image_emoji TEXT NOT NULL DEFAULT '🧩',
  material TEXT NOT NULL DEFAULT 'PLA',
  color TEXT NOT NULL DEFAULT 'White',
  print_hours REAL NOT NULL DEFAULT 1,
  stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','IN_PRODUCTION','QUALITY_CHECK','SHIPPED','DELIVERED','CANCELLED')) DEFAULT 'PENDING',
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  points_used INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  shipping_name TEXT NOT NULL,
  shipping_address1 TEXT NOT NULL,
  shipping_address2 TEXT NOT NULL DEFAULT '',
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'US',
  tracking_number TEXT,
  carrier TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS order_status_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS custom_print_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  contact_email TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  shipping_zip TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED','QUOTED','ACCEPTED','DECLINED','CANCELLED')) DEFAULT 'SUBMITTED',
  quote_price_cents INTEGER,
  quote_notes TEXT NOT NULL DEFAULT '',
  order_id TEXT REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS print_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  material_rate REAL NOT NULL DEFAULT 0.25,
  hourly_rate REAL NOT NULL DEFAULT 20.0,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 99,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_contact_email ON orders(contact_email);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events_order_id ON order_status_events(order_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_print_requests_user_id ON custom_print_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_print_requests_contact_email ON custom_print_requests(contact_email);
CREATE INDEX IF NOT EXISTS idx_custom_print_requests_status ON custom_print_requests(status);
`;

// Migrations for columns / tables added after initial schema
export function applySchemaMigrations(db: DatabaseSync): void {
  // order_items: add custom_request_id FK
  const orderItemCols = db.prepare("PRAGMA table_info(order_items)").all() as { name: string }[];
  if (!orderItemCols.some((c) => c.name === "custom_request_id")) {
    db.exec("ALTER TABLE order_items ADD COLUMN custom_request_id TEXT REFERENCES custom_print_requests(id)");
  }
  // custom_print_requests: add shipping_zip
  const cprCols = db.prepare("PRAGMA table_info(custom_print_requests)").all() as { name: string }[];
  if (!cprCols.some((c) => c.name === "shipping_zip")) {
    db.exec("ALTER TABLE custom_print_requests ADD COLUMN shipping_zip TEXT NOT NULL DEFAULT ''");
  }
  // print_methods: seed default methods if table is empty
  const pmCount = db.prepare("SELECT COUNT(*) as n FROM print_methods").get() as { n: number };
  if (pmCount.n === 0) {
    const id1 = randomUUID(), id2 = randomUUID(), id3 = randomUUID(), id4 = randomUUID();
    db.prepare(
      "INSERT INTO print_methods (id, name, description, material_rate, hourly_rate, active, sort_order) VALUES (?,?,?,?,?,1,?)"
    ).run(id1, "Resin (MSLA)", "High-detail resin printing — ideal for miniatures, jewelry, and fine detail. Our primary method.", 0.25, 20.0, 1);
    db.prepare(
      "INSERT INTO print_methods (id, name, description, material_rate, hourly_rate, active, sort_order) VALUES (?,?,?,?,?,1,?)"
    ).run(id2, "FDM – PLA", "Standard FDM plastic printing with PLA — most common, good for general parts.", 0.07, 12.0, 2);
    db.prepare(
      "INSERT INTO print_methods (id, name, description, material_rate, hourly_rate, active, sort_order) VALUES (?,?,?,?,?,1,?)"
    ).run(id3, "FDM – PETG", "FDM with PETG — stronger and more heat-resistant than PLA.", 0.12, 14.0, 3);
    db.prepare(
      "INSERT INTO print_methods (id, name, description, material_rate, hourly_rate, active, sort_order) VALUES (?,?,?,?,?,1,?)"
    ).run(id4, "FDM – ABS", "FDM with ABS — durable and impact-resistant.", 0.12, 14.0, 4);
  }
}
