import Link from "next/link";
import type { ReactNode } from "react";
import { requireOwner } from "@/lib/auth/guards";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireOwner();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-700">
        🪐 Owner Dashboard
      </div>
      <nav className="mb-8 flex gap-6 border-b border-slate-200 text-sm font-medium text-slate-600">
        <Link href="/owner" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Overview
        </Link>
        <Link href="/owner/products" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Products
        </Link>
        <Link href="/owner/orders" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Orders
        </Link>
        <Link href="/owner/custom-prints" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Custom Prints
        </Link>
        <Link href="/owner/customers" className="-mb-px border-b-2 border-transparent py-3 hover:border-violet-600 hover:text-violet-700">
          Customers
        </Link>
      </nav>
      {children}
    </div>
  );
}
