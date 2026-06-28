import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "node:fs";
import { getCurrentUser } from "@/lib/auth/guards";
import { findCustomPrintRequestById } from "@/lib/repo/customPrintRequests";
import { resolveUploadPath } from "@/lib/uploads";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customRequest = findCustomPrintRequestById(id);
  if (!customRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const email = request.nextUrl.searchParams.get("email");

  const isOwner = user?.role === "OWNER";
  const ownsAsUser = !!user && customRequest.userId === user.id;
  const ownsAsGuest = !!email && customRequest.contactEmail.toLowerCase() === email.toLowerCase().trim();

  if (!isOwner && !ownsAsUser && !ownsAsGuest) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filePath = resolveUploadPath(customRequest.filePath);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(customRequest.fileName)}"`,
    },
  });
}
