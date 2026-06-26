export const POINTS_PER_DOLLAR = 10;
export const POINT_VALUE_CENTS = 1; // 1 point = $0.01 when redeemed
export const MAX_REDEMPTION_SHARE = 0.5; // can't wipe out more than 50% of subtotal with points
export const REDEEM_STEP = 100; // must redeem in blocks of 100 points ($1)

export function calcPointsEarned(amountPaidCents: number): number {
  return Math.floor((amountPaidCents / 100) * POINTS_PER_DOLLAR);
}

export function pointsToCents(points: number): number {
  return points * POINT_VALUE_CENTS;
}

export function maxRedeemablePoints(subtotalCents: number, availablePoints: number): number {
  const capByOrderValue = Math.floor((subtotalCents * MAX_REDEMPTION_SHARE) / POINT_VALUE_CENTS);
  const cap = Math.min(availablePoints, capByOrderValue);
  return Math.max(0, Math.floor(cap / REDEEM_STEP) * REDEEM_STEP);
}
