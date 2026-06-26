import { getDb } from "@/lib/db/client";
import type { PointsTransaction } from "@/lib/types";

interface PointsTransactionRow {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  order_id: string | null;
  created_at: string;
}

function mapTransaction(row: PointsTransactionRow): PointsTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    reason: row.reason,
    orderId: row.order_id,
    createdAt: row.created_at,
  };
}

export function listPointsTransactions(userId: string): PointsTransaction[] {
  const rows = getDb()
    .prepare("SELECT * FROM points_transactions WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as unknown as PointsTransactionRow[];
  return rows.map(mapTransaction);
}

export const POINTS_REASON_LABELS: Record<string, string> = {
  earned_from_purchase: "Earned from purchase",
  redeemed_at_checkout: "Redeemed at checkout",
  order_cancelled_reversal: "Earned points reversed (order cancelled)",
  order_cancelled_refund: "Redeemed points refunded (order cancelled)",
  manual_adjustment: "Adjusted by store owner",
};
