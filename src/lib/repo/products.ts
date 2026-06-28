import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { Product } from "@/lib/types";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  image_emoji: string;
  material: string;
  color: string;
  print_hours: number;
  stock: number;
  active: number;
  created_at: string;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceCents: row.price_cents,
    imageEmoji: row.image_emoji,
    material: row.material,
    color: row.color,
    printHours: row.print_hours,
    stock: row.stock,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

export function listActiveProducts(): Product[] {
  const rows = getDb()
    .prepare("SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC")
    .all() as unknown as ProductRow[];
  return rows.map(mapProduct);
}

export function listAllProducts(): Product[] {
  const rows = getDb().prepare("SELECT * FROM products ORDER BY created_at DESC").all() as unknown as ProductRow[];
  return rows.map(mapProduct);
}

export function findProductBySlug(slug: string): Product | null {
  const row = getDb().prepare("SELECT * FROM products WHERE slug = ?").get(slug) as unknown as
    | ProductRow
    | undefined;
  return row ? mapProduct(row) : null;
}

export function findProductById(id: string): Product | null {
  const row = getDb().prepare("SELECT * FROM products WHERE id = ?").get(id) as unknown as
    | ProductRow
    | undefined;
  return row ? mapProduct(row) : null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createProduct(input: {
  name: string;
  description: string;
  priceCents: number;
  imageEmoji: string;
  material: string;
  color: string;
  printHours: number;
  stock: number;
}): Product {
  const id = randomUUID();
  let slug = slugify(input.name);
  if (findProductBySlug(slug)) {
    slug = `${slug}-${id.slice(0, 6)}`;
  }
  getDb()
    .prepare(
      `INSERT INTO products (id, name, slug, description, price_cents, image_emoji, material, color, print_hours, stock, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .run(
      id,
      input.name,
      slug,
      input.description,
      input.priceCents,
      input.imageEmoji,
      input.material,
      input.color,
      input.printHours,
      input.stock
    );
  return findProductById(id)!;
}

export function updateProduct(
  id: string,
  input: {
    name: string;
    description: string;
    priceCents: number;
    imageEmoji: string;
    material: string;
    color: string;
    printHours: number;
    stock: number;
    active: boolean;
  }
): Product {
  getDb()
    .prepare(
      `UPDATE products SET name = ?, description = ?, price_cents = ?, image_emoji = ?, material = ?,
       color = ?, print_hours = ?, stock = ?, active = ? WHERE id = ?`
    )
    .run(
      input.name,
      input.description,
      input.priceCents,
      input.imageEmoji,
      input.material,
      input.color,
      input.printHours,
      input.stock,
      input.active ? 1 : 0,
      id
    );
  return findProductById(id)!;
}

export function decrementStock(productId: string, quantity: number): void {
  getDb()
    .prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?")
    .run(quantity, productId);
}

export function restockProduct(productId: string, quantity: number): void {
  getDb().prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, productId);
}

export function deleteProduct(id: string): void {
  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
}
