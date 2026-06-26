import Link from "next/link";
import { listActiveProducts } from "@/lib/repo/products";
import { formatCents } from "@/lib/money";

export const metadata = {
  title: "Shop — Galaxy Prints",
};

export default async function ShopPage() {
  const products = listActiveProducts();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Shop</h1>
        <p className="mt-1 text-slate-600">Hand-finished 3D prints, made on demand.</p>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-600">No products available yet. Check back soon!</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/shop/${product.slug}`}
              className="card group flex flex-col overflow-hidden p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-6xl">
                {product.imageEmoji}
              </div>
              <h2 className="mt-4 font-semibold text-slate-900 group-hover:text-violet-700">
                {product.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {product.material} · {product.color}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-slate-900">{formatCents(product.priceCents)}</span>
                {product.stock <= 0 ? (
                  <span className="badge bg-slate-100 text-slate-500">Out of stock</span>
                ) : product.stock <= 5 ? (
                  <span className="badge bg-amber-100 text-amber-800">Only {product.stock} left</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
