import Link from "next/link";
import { CartIndicator } from "@/components/cart/CartIndicator";
import type { User } from "@/lib/types";

export function Header({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span aria-hidden className="text-2xl">🪐</span>
          Galaxy Prints
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/shop" className="hover:text-violet-700">Shop</Link>
          <Link href="/custom-print" className="hover:text-violet-700">Custom Print</Link>
          <Link href="/cad-editor" className="hover:text-violet-700">3D Editor</Link>
          <Link href="/track" className="hover:text-violet-700">Track Order</Link>
          {user?.role === "OWNER" && (
            <Link href="/owner" className="hover:text-violet-700">Owner Dashboard</Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          {user && user.role === "CUSTOMER" && (
            <Link href="/account/points" className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 sm:inline-flex">
              <span aria-hidden>✨</span>
              {user.points} pts
            </Link>
          )}
          <CartIndicator />
          {user ? (
            <Link href={user.role === "OWNER" ? "/owner" : "/account"} className="text-sm font-medium text-slate-700 hover:text-violet-700">
              {user.role === "OWNER" ? "Owner" : "My Account"}
            </Link>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">Sign In</Link>
          )}
        </div>
      </div>
      <nav className="flex items-center gap-4 border-t border-slate-100 px-4 py-2 text-sm font-medium text-slate-600 md:hidden">
        <Link href="/shop" className="hover:text-violet-700">Shop</Link>
        <Link href="/custom-print" className="hover:text-violet-700">Custom Print</Link>
        <Link href="/cad-editor" className="hover:text-violet-700">3D Editor</Link>
        <Link href="/track" className="hover:text-violet-700">Track Order</Link>
        {user?.role === "OWNER" && (
          <Link href="/owner" className="hover:text-violet-700">Dashboard</Link>
        )}
      </nav>
    </header>
  );
}
