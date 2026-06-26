import { notFound } from "next/navigation";
import { findProductById } from "@/lib/repo/products";
import { updateProductAction } from "@/lib/actions/products";
import { ProductForm } from "../../ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = findProductById(id);
  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Edit Product</h1>
      <ProductForm action={updateProductAction} product={product} />
    </div>
  );
}
