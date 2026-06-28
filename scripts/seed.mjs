import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { SCHEMA_SQL } from "../src/lib/db/schema.ts";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec(SCHEMA_SQL);

function upsertUser({ name, email, password, role }) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return existing.id;
  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, points) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, name, email, passwordHash, role, role === "CUSTOMER" ? 250 : 0);
  return id;
}

upsertUser({
  name: "Galaxy Prints Owner",
  email: "owner@galaxyprints.test",
  password: "OwnerPass123!",
  role: "OWNER",
});

const customerId = upsertUser({
  name: "Jordan Customer",
  email: "customer@galaxyprints.test",
  password: "CustomerPass123!",
  role: "CUSTOMER",
});

const products = [
  {
    name: "Articulated Dragon",
    description:
      "A fully articulated 3D-printed dragon with moving joints from nose to tail tip. Print-in-place, no assembly required.",
    priceCents: 2899,
    imageEmoji: "🐉",
    material: "PLA",
    color: "Galaxy Purple",
    printHours: 9,
    stock: 24,
  },
  {
    name: "Geometric Planter",
    description: "Low-poly faceted planter pot with detachable drainage tray. Great for succulents.",
    priceCents: 1599,
    imageEmoji: "🪴",
    material: "PETG",
    color: "Sage Green",
    printHours: 4,
    stock: 40,
  },
  {
    name: "Cosmic Phone Stand",
    description: "Adjustable desk phone stand with a starfield finish. Fits most phones and small tablets.",
    priceCents: 1199,
    imageEmoji: "📱",
    material: "PLA",
    color: "Starlight Black",
    printHours: 2,
    stock: 60,
  },
  {
    name: "Voronoi Desk Lamp Shade",
    description: "Organic voronoi-pattern lamp shade that throws gorgeous shadows. Bulb and base sold separately.",
    priceCents: 3499,
    imageEmoji: "💡",
    material: "PLA",
    color: "Warm White",
    printHours: 11,
    stock: 15,
  },
  {
    name: "Modular Cable Organizer",
    description: "Snap-together cable clips and a desktop dock to keep your charging cables tidy.",
    priceCents: 999,
    imageEmoji: "🔌",
    material: "PETG",
    color: "Slate Gray",
    printHours: 1.5,
    stock: 80,
  },
  {
    name: "Rocket Ship Planter Trio",
    description: "Set of three rocket-shaped mini planters of ascending size. A fun gift for plant lovers.",
    priceCents: 2199,
    imageEmoji: "🚀",
    material: "PLA",
    color: "Galaxy Purple",
    printHours: 5,
    stock: 30,
  },
  {
    name: "Chess Set: Lost Civilization",
    description: "32-piece full chess set themed around a lost stone civilization. Board sold separately.",
    priceCents: 4499,
    imageEmoji: "♟️",
    material: "Resin",
    color: "Stone Gray",
    printHours: 18,
    stock: 10,
  },
  {
    name: "Honeycomb Wall Shelf",
    description: "Hexagonal floating wall shelf that clips together with neighboring units to form a honeycomb.",
    priceCents: 1899,
    imageEmoji: "🐝",
    material: "PETG",
    color: "Honey Amber",
    printHours: 6,
    stock: 20,
  },
];

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const insertProduct = db.prepare(
  `INSERT INTO products (id, name, slug, description, price_cents, image_emoji, material, color, print_hours, stock, active)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
);

const productIds = [];
for (const p of products) {
  const slug = slugify(p.name);
  const existing = db.prepare("SELECT id FROM products WHERE slug = ?").get(slug);
  if (existing) {
    productIds.push(existing.id);
    continue;
  }
  const id = randomUUID();
  insertProduct.run(id, p.name, slug, p.description, p.priceCents, p.imageEmoji, p.material, p.color, p.printHours, p.stock);
  productIds.push(id);
}

const existingOrder = db.prepare("SELECT id FROM orders LIMIT 1").get();
if (!existingOrder) {
  const orderId = randomUUID();
  const orderNumber = "GP-DEMO0001";
  const item = products[0];
  const productId = productIds[0];
  const subtotal = item.priceCents * 1;
  const shipping = 599;
  const total = subtotal + shipping;

  db.prepare(
    `INSERT INTO orders (
      id, order_number, user_id, contact_email, status, subtotal_cents, shipping_cents,
      discount_cents, total_cents, points_used, points_earned, shipping_name, shipping_address1,
      shipping_address2, shipping_city, shipping_state, shipping_zip, shipping_country,
      tracking_number, carrier
    ) VALUES (?, ?, ?, ?, 'SHIPPED', ?, ?, 0, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    orderId,
    orderNumber,
    customerId,
    "customer@galaxyprints.test",
    subtotal,
    shipping,
    total,
    Math.floor((total / 100) * 10),
    "Jordan Customer",
    "123 Orbit Lane",
    "",
    "Springfield",
    "IL",
    "62704",
    "US",
    "1Z999AA10123456784",
    "UPS"
  );

  db.prepare(
    "INSERT INTO order_items (id, order_id, product_id, product_name, unit_price_cents, quantity, color, material) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(randomUUID(), orderId, productId, item.name, item.priceCents, 1, item.color, item.material);

  const events = [
    ["PENDING", "Order placed and payment received."],
    ["IN_PRODUCTION", "Your print has started on the printer bed."],
    ["QUALITY_CHECK", "Print complete — inspecting and cleaning up your piece."],
    ["SHIPPED", "Your order has shipped."],
  ];
  for (const [status, message] of events) {
    db.prepare(
      "INSERT INTO order_status_events (id, order_id, status, message) VALUES (?, ?, ?, ?)"
    ).run(randomUUID(), orderId, status, message);
  }
}

console.log("Seed complete.");
console.log(`Owner login:    owner@galaxyprints.test / OwnerPass123!`);
console.log(`Customer login: customer@galaxyprints.test / CustomerPass123!`);

db.close();
