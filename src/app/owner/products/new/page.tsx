import { createProductAction } from "@/lib/actions/products";
import { ProductForm } from "../ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Add Product</h1>
      <ProductForm action={createProductAction} />
    </div>
  );
}
