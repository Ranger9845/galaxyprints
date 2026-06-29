import path from "node:path";

export interface MeasuredGeometry {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  volumeCm3: number;
}

interface Bounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  signedVolumeMm3: number;
}

function newBounds(): Bounds {
  return {
    minX: Infinity,
    minY: Infinity,
    minZ: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    maxZ: -Infinity,
    signedVolumeMm3: 0,
  };
}

function accumulateTriangle(
  b: Bounds,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number
): void {
  b.minX = Math.min(b.minX, ax, bx, cx);
  b.minY = Math.min(b.minY, ay, by, cy);
  b.minZ = Math.min(b.minZ, az, bz, cz);
  b.maxX = Math.max(b.maxX, ax, bx, cx);
  b.maxY = Math.max(b.maxY, ay, by, cy);
  b.maxZ = Math.max(b.maxZ, az, bz, cz);
  // Signed tetrahedron volume relative to the origin (divergence theorem); summed over
  // all triangles this gives the mesh's enclosed volume for a closed, consistently-wound mesh.
  b.signedVolumeMm3 += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
}

function finish(b: Bounds): MeasuredGeometry | null {
  if (!Number.isFinite(b.minX) || !Number.isFinite(b.maxX)) return null;
  return {
    lengthMm: b.maxX - b.minX,
    widthMm: b.maxY - b.minY,
    heightMm: b.maxZ - b.minZ,
    volumeCm3: Math.abs(b.signedVolumeMm3) / 1000,
  };
}

function isBinaryStl(buffer: Buffer): boolean {
  if (buffer.length < 84) return true;
  const faceCount = buffer.readUInt32LE(80);
  const expectedBinarySize = 84 + faceCount * 50;
  if (expectedBinarySize === buffer.length) return true;
  // ASCII STL must begin with "solid" as the first five bytes.
  return buffer.subarray(0, 5).toString("ascii").toLowerCase() !== "solid";
}

function measureBinaryStl(buffer: Buffer): MeasuredGeometry | null {
  const bounds = newBounds();
  const faceCount = buffer.readUInt32LE(80);
  let offset = 84;
  for (let i = 0; i < faceCount && offset + 50 <= buffer.length; i++) {
    const ax = buffer.readFloatLE(offset + 12);
    const ay = buffer.readFloatLE(offset + 16);
    const az = buffer.readFloatLE(offset + 20);
    const bx = buffer.readFloatLE(offset + 24);
    const by = buffer.readFloatLE(offset + 28);
    const bz = buffer.readFloatLE(offset + 32);
    const cx = buffer.readFloatLE(offset + 36);
    const cy = buffer.readFloatLE(offset + 40);
    const cz = buffer.readFloatLE(offset + 44);
    accumulateTriangle(bounds, ax, ay, az, bx, by, bz, cx, cy, cz);
    offset += 50;
  }
  return finish(bounds);
}

function measureAsciiStl(buffer: Buffer): MeasuredGeometry | null {
  const bounds = newBounds();
  const text = buffer.toString("utf8");
  const vertexRe = /vertex\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)/g;
  const verts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = vertexRe.exec(text))) {
    verts.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  for (let i = 0; i + 9 <= verts.length; i += 9) {
    accumulateTriangle(
      bounds,
      verts[i],
      verts[i + 1],
      verts[i + 2],
      verts[i + 3],
      verts[i + 4],
      verts[i + 5],
      verts[i + 6],
      verts[i + 7],
      verts[i + 8]
    );
  }
  return finish(bounds);
}

function measureStl(buffer: Buffer): MeasuredGeometry | null {
  return isBinaryStl(buffer) ? measureBinaryStl(buffer) : measureAsciiStl(buffer);
}

function measureObj(buffer: Buffer): MeasuredGeometry | null {
  const bounds = newBounds();
  const vertices: number[][] = [];
  const lines = buffer.toString("utf8").split("\n");

  function resolveIndex(token: string): number {
    const raw = parseInt(token.split("/")[0], 10);
    return raw < 0 ? vertices.length + raw : raw - 1;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("v ")) {
      const parts = trimmed.slice(2).trim().split(/\s+/).map(Number);
      if (parts.length >= 3) vertices.push([parts[0], parts[1], parts[2]]);
    } else if (trimmed.startsWith("f ")) {
      const tokens = trimmed.slice(2).trim().split(/\s+/);
      const idx = tokens.map(resolveIndex).filter((i) => i >= 0 && i < vertices.length);
      for (let i = 1; i + 1 < idx.length; i++) {
        const a = vertices[idx[0]];
        const b = vertices[idx[i]];
        const c = vertices[idx[i + 1]];
        accumulateTriangle(bounds, a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      }
    }
  }
  return finish(bounds);
}

/** Computes bounding-box dimensions (mm) and enclosed volume (cm3) for STL/OBJ files.
 *  Returns null for formats we don't parse server-side (e.g. 3MF, which is a zipped XML
 *  bundle) — callers should treat that as "size not verified" rather than a rejection. */
export function measureModelFile(buffer: Buffer, fileName: string): MeasuredGeometry | null {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".stl") return measureStl(buffer);
  if (ext === ".obj") return measureObj(buffer);
  return null;
}

/** Permissive fit check: compares sorted dimensions on each side so a model can be rotated
 *  to fit the build volume rather than requiring its given X/Y/Z axes to line up with the bed's. */
export function fitsBuildVolume(
  dims: { lengthMm: number; widthMm: number; heightMm: number },
  max: { maxLengthMm: number; maxWidthMm: number; maxHeightMm: number }
): boolean {
  const modelSorted = [dims.lengthMm, dims.widthMm, dims.heightMm].sort((a, b) => b - a);
  const maxSorted = [max.maxLengthMm, max.maxWidthMm, max.maxHeightMm].sort((a, b) => b - a);
  return modelSorted.every((d, i) => d <= maxSorted[i]);
}
