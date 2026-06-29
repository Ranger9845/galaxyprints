import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "data", "uploads");

const ALLOWED_EXTENSIONS = [".stl", ".obj", ".3mf"];
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function isAllowedModelFile(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.includes(path.extname(fileName).toLowerCase());
}

export async function saveUploadedModelFile(
  file: File
): Promise<{ filePath: string; fileName: string; sizeBytes: number; buffer: Buffer }> {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext = path.extname(file.name).toLowerCase();
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOADS_DIR, storedName), buffer);
  return { filePath: storedName, fileName: file.name, sizeBytes: buffer.byteLength, buffer };
}

export function deleteUploadedModelFile(storedName: string): void {
  try {
    fs.unlinkSync(resolveUploadPath(storedName));
  } catch {
    // already gone — fine to ignore
  }
}

export function resolveUploadPath(storedName: string): string {
  return path.join(/* turbopackIgnore: true */ UPLOADS_DIR, path.basename(storedName));
}
