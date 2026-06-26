import Link from "next/link";
import { listAllProducts } from "@/lib/repo/products";
import { deleteProductAction } from "@/lib/actions/products";
import { formatCents } from "@/lib/money";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function OwnerProductsPage() {
  const products = listAllProducts();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <Link href="/owner/products/new" className="btn-primary">
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-600">No products yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/owner/products/${product.id}/edit`}
                      className="flex items-center gap-2 font-medium text-slate-900 hover:text-violet-700"
                    >
                      <span className="text-lg">{product.imageEmoji}</span> {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatCents(product.priceCents)}</td>
                  <td className="px-4 py-3 text-slate-700">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        product.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {product.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/owner/products/${product.id}/edit`}
                        className="font-medium text-violet-700 hover:text-violet-800"
                      >
                        Edit
                      </Link>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <ConfirmSubmitButton
                          confirmMessage={`Delete "${product.name}"? This can't be undone.`}
                          className="font-medium text-rose-600 hover:text-rose-700"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
