import { getPrintSettings } from "@/lib/repo/printSettings";
import { listMaterials } from "@/lib/repo/materials";
import { SettingsForm } from "./SettingsForm";
import { MaterialsManager } from "./MaterialsManager";

export default async function OwnerSettingsPage() {
  const settings = getPrintSettings();
  const materials = listMaterials();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Print Settings</h1>
        <p className="text-slate-600">
          Control the build volume, pricing formula, and which custom print requests get quoted automatically.
        </p>
      </div>
      <SettingsForm settings={settings} />
      <MaterialsManager materials={materials} />
    </div>
  );
}
