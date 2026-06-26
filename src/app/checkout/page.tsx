import { getCurrentUser } from "@/lib/auth/guards";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return <CheckoutForm user={user} />;
}
