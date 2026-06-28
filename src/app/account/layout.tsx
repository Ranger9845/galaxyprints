import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireUser("/account");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <nav className="mb-8 flex gap-6 border-b border-slate-200 text-sm font-medium text-slate-600">
        <Link href="/account" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Overview
        </Link>
        <Link href="/account/orders" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Orders
        </Link>
        <Link href="/account/custom-prints" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Custom Prints
        </Link>
        <Link href="/account/points" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Points
        </Link>
      </nav>
      {children}
    </div>
  );
}
