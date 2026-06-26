export const FLAT_SHIPPING_CENTS = 599;
export const FREE_SHIPPING_THRESHOLD_CENTS = 7500;

export function calcShippingCents(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
}
