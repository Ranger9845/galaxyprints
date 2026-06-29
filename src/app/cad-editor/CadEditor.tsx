"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ShapeType = "box" | "sphere" | "cylinder" | "cone" | "torus";
type TransformMode = "translate" | "rotate" | "scale";

type ShapeParams =
  | { type: "box"; width: number; height: number; depth: number }
  | { type: "sphere"; radius: number }
  | { type: "cylinder"; radiusTop: number; radiusBottom: number; height: number }
  | { type: "cone"; radius: number; height: number }
  | { type: "torus"; radius: number; tube: number };

interface Shape {
  id: string;
  name: string;
  color: string;
  params: ShapeParams;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

const COLORS = ["#7c3aed","#2563eb","#16a34a","#ea580c","#dc2626","#0891b2","#d97706","#9333ea"];
let _counter = 0;
function nextId() { return `s${++_counter}`; }

function defaultParams(type: ShapeType): ShapeParams {
  switch (type) {
    case "box":      return { type: "box", width: 1, height: 1, depth: 1 };
    case "sphere":   return { type: "sphere", radius: 0.6 };
    case "cylinder": return { type: "cylinder", radiusTop: 0.4, radiusBottom: 0.4, height: 1 };
    case "cone":     return { type: "cone", radius: 0.5, height: 1 };
    case "torus":    return { type: "torus", radius: 0.5, tube: 0.18 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeGeometry(T: any, params: ShapeParams) {
  switch (params.type) {
    case "box":      return new T.BoxGeometry(params.width, params.height, params.depth);
    case "sphere":   return new T.SphereGeometry(params.radius, 32, 32);
    case "cylinder": return new T.CylinderGeometry(params.radiusTop, params.radiusBottom, params.height, 32);
    case "cone":     return new T.ConeGeometry(params.radius, params.height, 32);
    case "torus":    return new T.TorusGeometry(params.radius, params.tube, 16, 100);
  }
}

function typeLabel(t: ShapeType) { return t[0].toUpperCase() + t.slice(1); }
function r3(v: { x: number; y: number; z: number }) {
  return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] uppercase text-slate-400">{label}</span>
      <input type="number" step={0.05} min={0.01} value={value}
        onChange={(e) => onChange(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
        className="input py-1 text-xs" />
    </div>
  );
}

function ParamsSection({ params, onChange }: { params: ShapeParams; onChange: (p: ShapeParams) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Dimensions</label>
      <div className="space-y-1">
        {params.type === "box" && (<>
          <NumberField label="width"  value={params.width}  onChange={(v) => onChange({ ...params, width: v })} />
          <NumberField label="height" value={params.height} onChange={(v) => onChange({ ...params, height: v })} />
          <NumberField label="depth"  value={params.depth}  onChange={(v) => onChange({ ...params, depth: v })} />
        </>)}
        {params.type === "sphere" && (
          <NumberField label="radius" value={params.radius} onChange={(v) => onChange({ ...params, radius: v })} />
        )}
        {params.type === "cylinder" && (<>
          <NumberField label="top R"  value={params.radiusTop}    onChange={(v) => onChange({ ...params, radiusTop: v })} />
          <NumberField label="bot R"  value={params.radiusBottom} onChange={(v) => onChange({ ...params, radiusBottom: v })} />
          <NumberField label="height" value={params.height}       onChange={(v) => onChange({ ...params, height: v })} />
        </>)}
        {params.type === "cone" && (<>
          <NumberField label="radius" value={params.radius} onChange={(v) => onChange({ ...params, radius: v })} />
          <NumberField label="height" value={params.height} onChange={(v) => onChange({ ...params, height: v })} />
        </>)}
        {params.type === "torus" && (<>
          <NumberField label="radius" value={params.radius} onChange={(v) => onChange({ ...params, radius: v })} />
          <NumberField label="tube"   value={params.tube}   onChange={(v) => onChange({ ...params, tube: v })} />
        </>)}
      </div>
    </div>
  );
}
export function CadEditor({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const THREERef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef  = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rendRef    = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tcRef      = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meshMapRef = useRef<Map<string, any>>(new Map());
  const rafRef     = useRef(0);
  const [shapes, setShapes]           = useState<Shape[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [mode, setMode]               = useState<TransformMode>("translate");
  const [isExporting, setIsExporting] = useState(false);
  const selIdRef = useRef<string | null>(null);
  useEffect(() => { selIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { tcRef.current?.setMode(mode); }, [mode]);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extraCleanup: (() => void) | undefined;
    (async () => {
      const T = await import("three");
      const { OrbitControls }     = await import("three/examples/jsm/controls/OrbitControls.js");
      const { TransformControls } = await import("three/examples/jsm/controls/TransformControls.js");
      if (disposed || !containerRef.current) return;
      THREERef.current = T;
      const scene = new T.Scene();
      scene.background = new T.Color(0xf1f5f9);
      scene.add(new T.GridHelper(30, 30, 0xcbd5e1, 0xe2e8f0));
      scene.add(new T.AmbientLight(0xffffff, 0.55));
      const dl1 = new T.DirectionalLight(0xffffff, 0.9); dl1.position.set(5, 10, 7.5); scene.add(dl1);
      const dl2 = new T.DirectionalLight(0xffffff, 0.3); dl2.position.set(-5, 5, -5); scene.add(dl2);
      sceneRef.current = scene;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const cam = new T.PerspectiveCamera(45, w / h, 0.01, 1000);
      cam.position.set(5, 4, 5); cam.lookAt(0, 0, 0);
      cameraRef.current = cam;
      const ren = new T.WebGLRenderer({ antialias: true });
      ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      ren.setSize(w, h);
      containerRef.current.replaceChildren(ren.domElement);
      rendRef.current = ren;
      const orbit = new OrbitControls(cam, ren.domElement);
      orbit.enableDamping = true; orbit.dampingFactor = 0.06;
      orbitRef.current = orbit;
      const tc = new TransformControls(cam, ren.domElement);
      tc.setMode("translate");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tc.addEventListener("dragging-changed", (e: any) => { orbit.enabled = !e.value; });
      tc.addEventListener("change", () => {
        const id = selIdRef.current; if (!id) return;
        const mesh = meshMapRef.current.get(id); if (!mesh) return;
        setShapes((prev) => prev.map((s) => s.id !== id ? s : {
          ...s,
          position: r3(mesh.position),
          rotation: {
            x: +T.MathUtils.radToDeg(mesh.rotation.x).toFixed(1),
            y: +T.MathUtils.radToDeg(mesh.rotation.y).toFixed(1),
            z: +T.MathUtils.radToDeg(mesh.rotation.z).toFixed(1),
          },
          scale: r3(mesh.scale),
        }));
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scene.add(tc as any); tcRef.current = tc;
      const raycaster = new T.Raycaster();
      const ptr = new T.Vector2();
      let pdX = 0, pdY = 0;
      function onDown(e: PointerEvent) { pdX = e.clientX; pdY = e.clientY; }
      function onUp(e: PointerEvent) {
        if (e.button !== 0) return;
        if (Math.hypot(e.clientX - pdX, e.clientY - pdY) > 5) return;
        const rect = ren.domElement.getBoundingClientRect();
        ptr.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ptr, cam);
        if (tc.object) { const gh = raycaster.intersectObject(tc as any, true); if (gh.length > 0) return; }
        const meshList = [...meshMapRef.current.values()];
        const hits = raycaster.intersectObjects(meshList, false);
        if (hits.length > 0) {
          const hitMesh = hits[0].object;
          const entry = [...meshMapRef.current.entries()].find(([, m]) => m === hitMesh);
          if (entry) { tc.attach(hitMesh); setSelectedId(entry[0]); }
        } else { tc.detach(); setSelectedId(null); }
      }
      ren.domElement.addEventListener("pointerdown", onDown);
      ren.domElement.addEventListener("pointerup", onUp);
      const ro = new ResizeObserver(() => {
        if (disposed || !containerRef.current) return;
        const nw = containerRef.current.clientWidth; const nh = containerRef.current.clientHeight;
        cam.aspect = nw / nh; cam.updateProjectionMatrix(); ren.setSize(nw, nh);
      });
      ro.observe(containerRef.current);
      function loop() { if (disposed) return; rafRef.current = requestAnimationFrame(loop); orbit.update(); ren.render(scene, cam); }
      loop();
      extraCleanup = () => {
        ren.domElement.removeEventListener("pointerdown", onDown);
        ren.domElement.removeEventListener("pointerup", onUp);
        ro.disconnect(); tc.dispose(); orbit.dispose(); ren.dispose();
      };
    })();
    return () => { disposed = true; cancelAnimationFrame(rafRef.current); extraCleanup?.(); };
  }, []);
  const addShape = useCallback((type: ShapeType) => {
    const T = THREERef.current; if (!T || !sceneRef.current) return;
    const id = nextId();
    const color = COLORS[meshMapRef.current.size % COLORS.length];
    const params = defaultParams(type);
    const geo = makeGeometry(T, params);
    const mat = new T.MeshStandardMaterial({ color });
    const mesh = new T.Mesh(geo, mat);
    const box = new T.Box3().setFromObject(mesh);
    mesh.position.y = -box.min.y;
    sceneRef.current.add(mesh); meshMapRef.current.set(id, mesh);
    const shape: Shape = {
      id, name: `${typeLabel(type)} ${_counter}`, color, params,
      position: { x: 0, y: +mesh.position.y.toFixed(3), z: 0 },
      rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
    };
    setShapes((prev) => [...prev, shape]);
    tcRef.current?.attach(mesh); setSelectedId(id);
  }, []);

  const selectShape = useCallback((id: string) => {
    const mesh = meshMapRef.current.get(id); if (!mesh) return;
    tcRef.current?.attach(mesh); setSelectedId(id);
  }, []);

  const deleteSelected = useCallback(() => {
    const id = selIdRef.current; if (!id) return;
    const mesh = meshMapRef.current.get(id);
    if (mesh) {
      sceneRef.current?.remove(mesh); mesh.geometry?.dispose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m: any) => m?.dispose());
      meshMapRef.current.delete(id);
    }
    tcRef.current?.detach();
    setShapes((prev) => prev.filter((s) => s.id !== id)); setSelectedId(null);
  }, []);

  const duplicateSelected = useCallback(() => {
    const id = selIdRef.current; if (!id || !sceneRef.current) return;
    const mesh = meshMapRef.current.get(id); if (!mesh) return;
    const newId = nextId();
    const newMesh = mesh.clone(); newMesh.position.x += 1.5;
    sceneRef.current.add(newMesh); meshMapRef.current.set(newId, newMesh);
    setShapes((prev) => {
      const orig = prev.find((s) => s.id === id); if (!orig) return prev;
      return [...prev, { ...orig, id: newId, name: orig.name + " (copy)", position: { ...orig.position, x: +(orig.position.x + 1.5).toFixed(3) } }];
    });
    tcRef.current?.attach(newMesh); setSelectedId(newId);
  }, []);

  const updateColor = useCallback((id: string, color: string) => {
    const mesh = meshMapRef.current.get(id);
    if (mesh) mesh.material.color.set(color);
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)));
  }, []);

  const updateParams = useCallback((id: string, params: ShapeParams) => {
    const T = THREERef.current; const mesh = meshMapRef.current.get(id);
    if (!T || !mesh) return;
    mesh.geometry.dispose(); mesh.geometry = makeGeometry(T, params);
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, params } : s)));
  }, []);

  const updatePosition = useCallback((id: string, axis: "x" | "y" | "z", val: number) => {
    const mesh = meshMapRef.current.get(id);
    if (mesh) mesh.position[axis] = val;
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, position: { ...s.position, [axis]: val } } : s)));
  }, []);

  const getSTLBuffer = useCallback(async (): Promise<ArrayBuffer | null> => {
    const T = THREERef.current;
    if (!T || meshMapRef.current.size === 0) return null;
    const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
    const exporter = new STLExporter();
    const tmp = new T.Scene();
    for (const mesh of meshMapRef.current.values()) tmp.add(mesh.clone());
    const result = exporter.parse(tmp, { binary: true }) as DataView;
    return result.buffer;
  }, []);

  const downloadSTL = useCallback(async () => {
    setIsExporting(true); const buf = await getSTLBuffer(); setIsExporting(false);
    if (!buf) return;
    const url = URL.createObjectURL(new Blob([buf], { type: "model/stl" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "cad-model.stl" });
    a.click(); URL.revokeObjectURL(url);
  }, [getSTLBuffer]);

  const submitForPrint = useCallback(async () => {
    setIsExporting(true); const buf = await getSTLBuffer(); setIsExporting(false);
    if (!buf) return;
    const bytes = new Uint8Array(buf);
    let str = ""; for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    try {
      sessionStorage.setItem("cad_stl", btoa(str));
      sessionStorage.setItem("cad_filename", "cad-model.stl");
    } catch { downloadSTL(); return; }
    router.push("/custom-print");
  }, [getSTLBuffer, router, downloadSTL]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "g" || e.key === "G") setMode("translate");
      if (e.key === "r" || e.key === "R") setMode("rotate");
      if (e.key === "s" || e.key === "S") setMode("scale");
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) { e.preventDefault(); duplicateSelected(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, duplicateSelected]);

  const selectedShape = shapes.find((s) => s.id === selectedId);
  const isEmpty = shapes.length === 0;
  const SHAPE_PALETTE: [ShapeType, string, string][] = [
    ["box","⬛","Box"],["sphere","●","Sphere"],["cylinder","⏺","Cylinder"],
    ["cone","▲","Cone"],["torus","⭕","Torus"],
  ];
  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transform</span>
        {(["translate","rotate","scale"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${mode === m ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            {m === "translate" ? "✥ Move (G)" : m === "rotate" ? "↻ Rotate (R)" : "⤢ Scale (S)"}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={duplicateSelected} disabled={!selectedId} className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40">⊕ Dupe</button>
          <button onClick={deleteSelected} disabled={!selectedId} className="rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40">✕ Delete</button>
          <div className="h-5 w-px bg-slate-200" />
          <button onClick={downloadSTL} disabled={isEmpty || isExporting} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            {isExporting ? "…" : "⬇ Export STL"}
          </button>
          <button onClick={submitForPrint} disabled={isEmpty || isExporting} className="btn-primary btn-sm disabled:opacity-40">
            🖨 Request Print Quote
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-48 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Add Shape</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SHAPE_PALETTE.map(([type, icon, label]) => (
                <button key={type} onClick={() => addShape(type)}
                  className="rounded-lg border border-slate-200 py-2 text-[11px] font-medium text-slate-700 transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700">
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Objects ({shapes.length})</p>
            {isEmpty ? <p className="text-[11px] text-slate-400">None yet</p> : (
              <ul className="space-y-0.5">
                {shapes.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => selectShape(s.id)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] font-medium transition-colors ${selectedId === s.id ? "bg-violet-100 text-violet-800" : "text-slate-700 hover:bg-slate-100"}`}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <div className="relative flex-1 overflow-hidden">
          <div ref={containerRef} className="h-full w-full" />
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl">🪐</div>
                <p className="mt-3 text-lg font-semibold text-slate-500">Start designing</p>
                <p className="text-sm text-slate-400">Add shapes from the left panel</p>
                <p className="mt-4 rounded-lg bg-white/60 px-4 py-2 text-[11px] text-slate-400 backdrop-blur">
                  G · move | R · rotate | S · scale | Del · delete | ⌘D · duplicate
                </p>
              </div>
            </div>
          )}
        </div>
        <aside className="w-56 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Properties</p>
          {!selectedShape ? (
            <p className="text-[11px] text-slate-400">Click a shape to edit its properties.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-700">{selectedShape.name}</p>
                <p className="text-[10px] capitalize text-slate-400">{selectedShape.params.type}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={selectedShape.color} onChange={(e) => updateColor(selectedShape.id, e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-slate-300 p-0.5" />
                  <span className="text-xs font-mono text-slate-500">{selectedShape.color}</span>
                </div>
              </div>
              <ParamsSection params={selectedShape.params} onChange={(p) => updateParams(selectedShape.id, p)} />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Position</label>
                <div className="space-y-1">
                  {(["x","y","z"] as const).map((ax) => (
                    <div key={ax} className="flex items-center gap-2">
                      <span className="w-4 text-[10px] font-bold uppercase text-slate-400">{ax}</span>
                      <input type="number" step={0.1} value={selectedShape.position[ax]} onChange={(e) => updatePosition(selectedShape.id, ax, parseFloat(e.target.value) || 0)} className="input py-1 text-xs" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Rotation (°)</label>
                <div className="space-y-1 text-xs text-slate-500">
                  {(["x","y","z"] as const).map((ax) => (
                    <div key={ax} className="flex items-center gap-2">
                      <span className="w-4 text-[10px] font-bold uppercase text-slate-400">{ax}</span>
                      <span className="font-mono">{selectedShape.rotation[ax]}°</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Scale</label>
                <div className="space-y-1 text-xs text-slate-500">
                  {(["x","y","z"] as const).map((ax) => (
                    <div key={ax} className="flex items-center gap-2">
                      <span className="w-4 text-[10px] font-bold uppercase text-slate-400">{ax}</span>
                      <span className="font-mono">{selectedShape.scale[ax]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={deleteSelected} className="w-full rounded bg-rose-50 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">✕ Delete Shape</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
