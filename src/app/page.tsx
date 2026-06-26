import Link from "next/link";
import { listActiveProducts } from "@/lib/repo/products";
import { formatCents } from "@/lib/money";
import { POINTS_PER_DOLLAR } from "@/lib/points";

export default async function Home() {
  const products = listActiveProducts().slice(0, 4);

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.25),transparent_40%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 sm:py-28">
          <span className="badge bg-violet-500/20 text-violet-200">🪐 Custom 3D prints, made to order</span>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Galaxy Prints — out-of-this-world 3D printed goods, shipped to your door.
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            Browse our catalog of hand-finished prints, earn loyalty points on every order, and track
            your print&apos;s journey from the printer bed to your mailbox.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/shop" className="btn-primary">
              Shop the Catalog
            </Link>
            <Link href="/track" className="btn-outline border-slate-600 bg-transparent text-white hover:bg-white/10">
              Track an Order
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="card p-6">
            <div className="text-2xl">✨</div>
            <h3 className="mt-2 font-semibold text-slate-900">Earn points on every order</h3>
            <p className="mt-1 text-sm text-slate-600">
              Get {POINTS_PER_DOLLAR} points for every dollar you spend, then redeem them for a discount
              at checkout.
            </p>
          </div>
          <div className="card p-6">
            <div className="text-2xl">🖨️</div>
            <h3 className="mt-2 font-semibold text-slate-900">Printed fresh, just for you</h3>
            <p className="mt-1 text-sm text-slate-600">
              Every order is printed on demand and inspected before it ships — no warehouses full of
              dusty inventory.
            </p>
          </div>
          <div className="card p-6">
            <div className="text-2xl">📦</div>
            <h3 className="mt-2 font-semibold text-slate-900">Track it the whole way</h3>
            <p className="mt-1 text-sm text-slate-600">
              Follow your order from &quot;received&quot; to &quot;delivered&quot; — no account required.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Featured Prints</h2>
          <Link href="/shop" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
            View all →
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="text-slate-600">No products available yet. Check back soon!</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${product.slug}`}
                className="card group flex flex-col overflow-hidden p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50 text-5xl">
                  {product.imageEmoji}
                </div>
                <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-violet-700">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {product.material} · {product.color}
                </p>
                <p className="mt-2 font-bold text-slate-900">{formatCents(product.priceCents)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
