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

const ownerEmail = process.env.OWNER_EMAIL;
const ownerPassword = process.env.OWNER_PASSWORD;
const ownerName = process.env.OWNER_NAME || "Owner";

if (!ownerEmail || !ownerPassword) {
  console.log("OWNER_EMAIL/OWNER_PASSWORD not set — skipping owner bootstrap. Database schema is ready.");
  db.close();
  process.exit(0);
}

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(ownerEmail);
if (existing) {
  console.log(`Owner account already exists: ${ownerEmail}`);
} else {
  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(ownerPassword, 10);
  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, points) VALUES (?, ?, ?, ?, 'OWNER', 0)"
  ).run(id, ownerName, ownerEmail, passwordHash);
  console.log(`Owner account created: ${ownerEmail}`);
}

db.close();
