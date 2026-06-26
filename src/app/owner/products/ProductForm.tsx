"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ProductFormState } from "@/lib/actions/products";
import type { Product } from "@/lib/types";

export function ProductForm({
  action,
  product,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  product?: Product;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" required defaultValue={product?.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="imageEmoji">
            Emoji
          </label>
          <input
            id="imageEmoji"
            name="imageEmoji"
            required
            defaultValue={product?.imageEmoji ?? "🪐"}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="material">
            Material
          </label>
          <input id="material" name="material" required defaultValue={product?.material} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="color">
            Color
          </label>
          <input id="color" name="color" required defaultValue={product?.color} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="price">
            Price (USD)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : undefined}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="printHours">
            Print Hours
          </label>
          <input
            id="printHours"
            name="printHours"
            type="number"
            min="0"
            step="0.5"
            required
            defaultValue={product?.printHours}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="stock">
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={product?.stock}
            className="input"
          />
        </div>
        {product && (
          <div className="flex items-end gap-2 pb-2">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={product.active}
              className="h-4 w-4"
            />
            <label htmlFor="active" className="text-sm font-medium text-slate-700">
              Active (visible in shop)
            </label>
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          defaultValue={product?.description}
          rows={4}
          className="input"
        />
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Saved!</p>}

      <SubmitButton pendingLabel="Saving…">{product ? "Save Changes" : "Create Product"}</SubmitButton>
    </form>
  );
}
