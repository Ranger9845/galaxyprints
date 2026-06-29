"use client";

import { type ChangeEvent, useActionState, useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { ModelViewer, type MeasuredDimensions } from "@/components/ModelViewer";
import { ModelBuilder } from "@/components/ModelBuilder";
import { submitCustomPrintRequestAction, type CustomPrintFormState } from "@/lib/actions/customPrints";
import type { Material, PrintSettings, User } from "@/lib/types";

function fitsClientSide(dims: MeasuredDimensions, settings: PrintSettings): boolean {
  const modelSorted = [dims.lengthMm, dims.widthMm, dims.heightMm].sort((a, b) => b - a);
  const maxSorted = [settings.maxLengthMm, settings.maxWidthMm, settings.maxHeightMm].sort((a, b) => b - a);
  return modelSorted.every((d, i) => d <= maxSorted[i]);
}

export function CustomPrintForm({
  user,
  materials,
  settings,
}: {
  user: User | null;
  materials: Material[];
  settings: PrintSettings;
}) {
  const [state, formAction] = useActionState<CustomPrintFormState, FormData>(submitCustomPrintRequestAction, {});
  const [activeTab, setActiveTab] = useState<"upload" | "build">("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [measured, setMeasured] = useState<MeasuredDimensions | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setFile(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setMeasured(null);
    if (!file) {
      setPreviewUrl(null);
      setFileName(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  function handleBuilderExport(file: File) {
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
    }
    setFile(file);
  }

  const oversized = measured ? !fitsClientSide(measured, settings) : false;

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-6">
      <div>
        <p className="label">3D Model</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              activeTab === "upload" ? "bg-violet-600 text-white" : "border border-slate-300 text-slate-700"
            }`}
          >
            Upload a File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("build")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              activeTab === "build" ? "bg-violet-600 text-white" : "border border-slate-300 text-slate-700"
            }`}
          >
            Build Your Own
          </button>
        </div>

        <div className={activeTab === "upload" ? "mt-3" : "mt-3 hidden"}>
          <label className="label" htmlFor="file">
            3D Model File (.stl, .obj, .3mf)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            ref={fileInputRef}
            accept=".stl,.obj,.3mf"
            onChange={handleFileChange}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">
            Max build size: {settings.maxLengthMm} × {settings.maxWidthMm} × {settings.maxHeightMm} mm (your model
            can be rotated to fit).
          </p>
        </div>

        {activeTab === "build" && (
          <div className="mt-3">
            <ModelBuilder onExport={handleBuilderExport} />
          </div>
        )}
      </div>

      {previewUrl && fileName && (
        <div>
          <p className="label">Preview</p>
          <ModelViewer fileUrl={previewUrl} fileName={fileName} onMeasured={setMeasured} />
          {measured && (
            <p className={`mt-1 text-xs ${oversized ? "font-medium text-rose-600" : "text-slate-500"}`}>
              Measured size: {measured.lengthMm.toFixed(1)} × {measured.widthMm.toFixed(1)} ×{" "}
              {measured.heightMm.toFixed(1)} mm
              {oversized ? " — this won't fit our build volume, even rotated." : ""}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="label" htmlFor="contactEmail">
          Email
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          defaultValue={user?.email}
          className="input"
        />
        <p className="mt-1 text-xs text-slate-500">We&apos;ll send your quote to this email.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="materialId">
            Material
          </label>
          <select id="materialId" name="materialId" required defaultValue="" className="input">
            <option value="" disabled>
              Choose a material
            </option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="color">
            Preferred Color
          </label>
          <input id="color" name="color" placeholder="Any color preference" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="quantity">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            defaultValue={1}
            required
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Anything we should know? Sizing, finish, deadline..."
          className="input"
        />
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <SubmitButton pendingLabel="Submitting…">Request a Quote</SubmitButton>
    </form>
  );
}
