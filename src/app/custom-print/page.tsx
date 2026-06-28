import { getCurrentUser } from "@/lib/auth/guards";
import { CustomPrintForm } from "./CustomPrintForm";

export default async function CustomPrintPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Custom Print Request</h1>
      <p className="mt-2 text-slate-600">
        Upload your own 3D model, preview it right here in your browser, and we&apos;ll send you a price quote
        before anything is charged.
      </p>
      <div className="mt-6">
        <CustomPrintForm user={user} />
      </div>
    </div>
  );
}
