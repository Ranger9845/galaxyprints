import Link from "next/link";
import { notFound } from "next/navigation";
import { findProductBySlug } from "@/lib/repo/products";
import { formatCents } from "@/lib/money";
import { calcPointsEarned } from "@/lib/points";
import { AddToCartForm } from "./AddToCartForm";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = findProductBySlug(slug);
  if (!product || !product.active) notFound();

  const pointsEarned = calcPointsEarned(product.priceCents);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/shop" className="text-sm font-medium text-violet-700 hover:text-violet-800">
        ← Back to Shop
      </Link>

      <div className="mt-6 grid gap-10 sm:grid-cols-2">
        <div className="card flex h-80 items-center justify-center text-9xl">{product.imageEmoji}</div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-1 text-slate-500">
            {product.material} · {product.color}
          </p>
          <p className="mt-4 text-3xl font-bold text-slate-900">{formatCents(product.priceCents)}</p>
          <p className="mt-1 text-sm text-amber-700">✨ Earn {pointsEarned} points with this purchase</p>

          <p className="mt-4 text-slate-700">{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Print time</dt>
              <dd className="font-medium text-slate-900">{product.printHours}h</dd>
            </div>
            <div>
              <dt className="text-slate-500">In stock</dt>
              <dd className="font-medium text-slate-900">{product.stock} units</dd>
            </div>
          </dl>

          <div className="mt-8">
            <AddToCartForm product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
