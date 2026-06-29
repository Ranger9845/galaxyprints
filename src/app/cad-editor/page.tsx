import { getCurrentUser } from "@/lib/auth/guards";
import { CadEditor } from "./CadEditor";

export const metadata = {
  title: "Galaxy Prints — 3D CAD Editor",
};

export default async function CadEditorPage() {
  const user = await getCurrentUser();
  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
      <CadEditor userEmail={user?.email ?? ""} />
    </div>
  );
}
