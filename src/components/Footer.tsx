import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <span aria-hidden>🪐</span> Galaxy Prints
            </div>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Custom 3D-printed goods, designed and printed in small batches. Earn points on every order
              and redeem them for discounts.
            </p>
          </div>
          <div className="flex gap-10 text-sm">
            <div>
              <div className="font-semibold text-slate-900">Shop</div>
              <ul className="mt-2 space-y-1 text-slate-500">
                <li>
                  <Link href="/shop" className="hover:text-violet-700">
                    All products
                  </Link>
                </li>
                <li>
                  <Link href="/track" className="hover:text-violet-700">
                    Track an order
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Account</div>
              <ul className="mt-2 space-y-1 text-slate-500">
                <li>
                  <Link href="/login" className="hover:text-violet-700">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-violet-700">
                    Create account
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs text-slate-400">
          © {new Date().getFullYear()} Galaxy Prints. All prints are made to order.
        </p>
      </div>
    </footer>
  );
}
