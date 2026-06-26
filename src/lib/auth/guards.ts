import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/repo/users";
import type { User } from "@/lib/types";

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return findUserById(session.sub);
}

export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  return user;
}

export async function requireOwner(nextPath?: string): Promise<User> {
  const user = await requireUser(nextPath);
  if (user.role !== "OWNER") {
    redirect("/");
  }
  return user;
}
