"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { acceptCustomPrintQuoteAction } from "@/lib/actions/customPrints";
import { formatCents } from "@/lib/money";
import { calcShippingCents } from "@/lib/shipping";

export function AcceptQuoteForm({
  requestId,
  contactEmail,
  quotePriceCents,
  defaultName,
}: {
  requestId: string;
  contactEmail: string;
  quotePriceCents: number;
  defaultName?: string;
}) {
  const router = useRouter();
  const [shippingName, setShippingName] = useState(defaultName ?? "");
  const [shippingAddress1, setShippingAddress1] = useState("");
  const [shippingAddress2, setShippingAddress2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCountry, setShippingCountry] = useState("United States");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shippingCents = calcShippingCents(quotePriceCents);
  const totalCents = quotePriceCents + shippingCents;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await acceptCustomPrintQuoteAction({
      requestId,
      contactEmail,
      shippingName,
      shippingAddress1,
      shippingAddress2,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
    });
    if (result.error) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    router.push(`/order-confirmation/${result.orderNumber}?email=${encodeURIComponent(contactEmail)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-6">
      <h2 className="font-semibold text-slate-900">Accept Quote &amp; Ship To</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="shippingName">
            Full name
          </label>
          <input
            id="shippingName"
            required
            className="input"
            value={shippingName}
            onChange={(e) => setShippingName(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="shippingAddress1">
            Address
          </label>
          <input
            id="shippingAddress1"
            required
            className="input"
            value={shippingAddress1}
            onChange={(e) => setShippingAddress1(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="shippingAddress2">
            Apt, suite, etc. (optional)
          </label>
          <input
            id="shippingAddress2"
            className="input"
            value={shippingAddress2}
            onChange={(e) => setShippingAddress2(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="shippingCity">
            City
          </label>
          <input
            id="shippingCity"
            required
            className="input"
            value={shippingCity}
            onChange={(e) => setShippingCity(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="shippingState">
            State / Province
          </label>
          <input
            id="shippingState"
            required
            className="input"
            value={shippingState}
            onChange={(e) => setShippingState(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="shippingZip">
            ZIP / Postal Code
          </label>
          <input
            id="shippingZip"
            required
            className="input"
            value={shippingZip}
            onChange={(e) => setShippingZip(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="shippingCountry">
            Country
          </label>
          <input
            id="shippingCountry"
            required
            className="input"
            value={shippingCountry}
            onChange={(e) => setShippingCountry(e.target.value)}
          />
        </div>
      </div>

      <hr className="border-slate-200" />
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Quoted price</span>
        <span className="font-medium text-slate-900">{formatCents(quotePriceCents)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Shipping</span>
        <span className="font-medium text-slate-900">
          {shippingCents === 0 ? "Free" : formatCents(shippingCents)}
        </span>
      </div>
      <div className="flex justify-between text-base font-bold text-slate-900">
        <span>Total</span>
        <span>{formatCents(totalCents)}</span>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary mt-2">
        {submitting ? "Placing Order…" : "Accept & Pay"}
      </button>
    </form>
  );
}
