"use client";

import { type ChangeEvent, useActionState, useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { ModelViewer } from "@/components/ModelViewer";
import { submitCustomPrintRequestAction, type CustomPrintFormState } from "@/lib/actions/customPrints";
import type { User } from "@/lib/types";

export function CustomPrintForm({ user }: { user: User | null }) {
  const [state, formAction] = useActionState<CustomPrintFormState, FormData>(submitCustomPrintRequestAction, {});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stlBase64 = sessionStorage.getItem("cad_stl");
    const cadFileName = sessionStorage.getItem("cad_filename") ?? "cad-model.stl";
    if (!stlBase64 || !fileInputRef.current) return;
    try {
      const binaryStr = atob(stlBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
      const file = new File([bytes], cadFileName, { type: "application/octet-stream" });
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      setPreviewUrl(URL.createObjectURL(file));
      setFileName(cadFileName);
      sessionStorage.removeItem("cad_stl");
      sessionStorage.removeItem("cad_filename");
    } catch { /* ignore */ }
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) { setPreviewUrl(null); setFileName(null); return; }
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
  }

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-6">
      <div>
        <label className="label" htmlFor="file">3D Model File (.stl, .obj, .3mf)</label>
        <input ref={fileInputRef} id="file" name="file" type="file" required accept=".stl,.obj,.3mf" onChange={handleFileChange} className="input" />
      </div>
      {previewUrl && fileName && (
        <div>
          <p className="label">Preview</p>
          <ModelViewer fileUrl={previewUrl} fileName={fileName} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="contactEmail">Email</label>
        <input id="contactEmail" name="contactEmail" type="email" required defaultValue={user?.email} className="input" />
        <p className="mt-1 text-xs text-slate-500">We&apos;ll send your quote to this email.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="material">Preferred Material</label>
          <input id="material" name="material" placeholder="PLA, PETG, Resin..." className="input" />
        </div>
        <div>
          <label className="label" htmlFor="color">Preferred Color</label>
          <input id="color" name="color" placeholder="Any color preference" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number" min={1} step={1} defaultValue={1} required className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={4} placeholder="Anything we should know? Sizing, finish, deadline..." className="input" />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <SubmitButton pendingLabel="Submitting…">Request a Quote</SubmitButton>
    </form>
  );
}
