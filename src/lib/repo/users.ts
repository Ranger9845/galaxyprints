import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb, runInTransaction } from "@/lib/db/client";
import type { Role, User } from "@/lib/types";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  points: number;
  created_at: string;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as Role,
    points: row.points,
    createdAt: row.created_at,
  };
}

export function findUserByEmail(email: string): User | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as unknown as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function findUserById(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}): User {
  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO users (id, name, email, password_hash, role, points) VALUES (?, ?, ?, ?, ?, 0)"
    )
    .run(id, input.name, input.email.toLowerCase().trim(), input.passwordHash, input.role ?? "CUSTOMER");
  return findUserById(id)!;
}

export function listCustomers(): User[] {
  const rows = getDb()
    .prepare("SELECT * FROM users WHERE role = 'CUSTOMER' ORDER BY created_at DESC")
    .all() as unknown as UserRow[];
  return rows.map(mapUser);
}

export function applyPointsDelta(
  db: DatabaseSync,
  userId: string,
  delta: number,
  reason: string,
  orderId?: string
): void {
  db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(delta, userId);
  db.prepare(
    "INSERT INTO points_transactions (id, user_id, amount, reason, order_id) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), userId, delta, reason, orderId ?? null);
}

export function adjustUserPoints(userId: string, delta: number, reason: string, orderId?: string): User {
  return runInTransaction((db) => {
    applyPointsDelta(db, userId, delta, reason, orderId);
    return findUserById(userId)!;
  });
}
