// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ═══════════════════════════════ TYPES ══════════════════════════════════════ */

type ShapeType = "box"|"sphere"|"cylinder"|"cone"|"torus"|"plane"|"ring"|"torusKnot"|"capsule";
type TransformMode = "translate"|"rotate"|"scale";
type ViewMode = "solid"|"wireframe"|"xray";

interface Mat {
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  wire: boolean;
}

type ShapeParams =
  | { type:"box"; width:number; height:number; depth:number }
  | { type:"sphere"; radius:number; wSegs:number; hSegs:number }
  | { type:"cylinder"; rTop:number; rBot:number; height:number; segs:number }
  | { type:"cone"; radius:number; height:number; segs:number }
  | { type:"torus"; radius:number; tube:number; rSegs:number; tSegs:number }
  | { type:"plane"; width:number; height:number }
  | { type:"ring"; inner:number; outer:number; segs:number }
  | { type:"torusKnot"; radius:number; tube:number; p:number; q:number }
  | { type:"capsule"; radius:number; length:number };

interface Shape {
  id: string;
  name: string;
  mat: Mat;
  params: ShapeParams;
  pos: { x:number; y:number; z:number };
  rot: { x:number; y:number; z:number };
  scl: { x:number; y:number; z:number };
  visible: boolean;
  locked: boolean;
}

/* ════════════════════════════ CONSTANTS ════════════════════════════════════ */

const COLORS = ["#7c3aed","#2563eb","#16a34a","#ea580c","#dc2626","#0891b2","#d97706","#9333ea","#be185d","#0f766e"];
let _ctr = 0;
const uid = () => `s${++_ctr}`;

/* ═══════════════════════ GEOMETRY ═════════════════════════════════════════ */

function makeGeo(T: any, p: ShapeParams): any {
  switch(p.type) {
    case "box":       return new T.BoxGeometry(p.width, p.height, p.depth);
    case "sphere":    return new T.SphereGeometry(p.radius, p.wSegs, p.hSegs);
    case "cylinder":  return new T.CylinderGeometry(p.rTop, p.rBot, p.height, p.segs);
    case "cone":      return new T.ConeGeometry(p.radius, p.height, p.segs);
    case "torus":     return new T.TorusGeometry(p.radius, p.tube, p.rSegs, p.tSegs);
    case "plane":     return new T.PlaneGeometry(p.width, p.height);
    case "ring":      return new T.RingGeometry(p.inner, p.outer, p.segs);
    case "torusKnot": return new T.TorusKnotGeometry(p.radius, p.tube, 100, 16, p.p, p.q);
    case "capsule":   return new T.CapsuleGeometry(p.radius, p.length, 8, 16);
  }
}

function defParams(t: ShapeType): ShapeParams {
  switch(t) {
    case "box":       return { type:"box", width:1, height:1, depth:1 };
    case "sphere":    return { type:"sphere", radius:0.6, wSegs:32, hSegs:16 };
    case "cylinder":  return { type:"cylinder", rTop:0.4, rBot:0.4, height:1, segs:32 };
    case "cone":      return { type:"cone", radius:0.5, height:1, segs:32 };
    case "torus":     return { type:"torus", radius:0.5, tube:0.18, rSegs:16, tSegs:100 };
    case "plane":     return { type:"plane", width:2, height:2 };
    case "ring":      return { type:"ring", inner:0.3, outer:0.6, segs:32 };
    case "torusKnot": return { type:"torusKnot", radius:0.4, tube:0.12, p:2, q:3 };
    case "capsule":   return { type:"capsule", radius:0.3, length:0.8 };
  }
}

function defMat(idx: number = 0): Mat {
  return { color:COLORS[idx % COLORS.length], roughness:0.4, metalness:0.1, opacity:1, wire:false };
}

function r3(v: { x:number; y:number; z:number }) {
  return { x:+v.x.toFixed(3), y:+v.y.toFixed(3), z:+v.z.toFixed(3) };
}

/* ═══════════════════════ MINI COMPONENTS ══════════════════════════════════ */

function Num({ label, value, onChange, step = 0.1, min }: {
  label: string; value: number; onChange: (v:number) => void; step?: number; min?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-6 shrink-0 text-[9px] font-bold uppercase text-slate-500">{label}</span>
      <input type="number" step={step} min={min} value={+value.toFixed(4)}
        onChange={e => { const v = parseFloat(e.target.value); if(!isNaN(v)) onChange(min !== undefined ? Math.max(min, v) : v); }}
        className="w-full rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[10px] font-mono text-slate-200 focus:border-violet-500 focus:outline-none" />
    </div>
  );
}

function Slider({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v:number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-14 shrink-0 text-[9px] text-slate-500">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-violet-500" />
      <span className="w-7 text-right text-[9px] font-mono text-slate-400">{value.toFixed(2)}</span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ShapeParamsEditor({ params, onChange }: { params: ShapeParams; onChange: (p:ShapeParams) => void }) {
  return (
    <div className="space-y-1.5">
      {params.type === "box" && (<>
        <Num label="W" value={params.width}  min={0.01} onChange={v => onChange({...params, width:v})} />
        <Num label="H" value={params.height} min={0.01} onChange={v => onChange({...params, height:v})} />
        <Num label="D" value={params.depth}  min={0.01} onChange={v => onChange({...params, depth:v})} />
      </>)}
      {params.type === "sphere" && (<>
        <Num label="R"  value={params.radius} min={0.01} onChange={v => onChange({...params, radius:v})} />
        <Num label="WS" value={params.wSegs}  min={3} step={1} onChange={v => onChange({...params, wSegs:Math.round(v)})} />
        <Num label="HS" value={params.hSegs}  min={2} step={1} onChange={v => onChange({...params, hSegs:Math.round(v)})} />
      </>)}
      {params.type === "cylinder" && (<>
        <Num label="rT" value={params.rTop}   min={0}    onChange={v => onChange({...params, rTop:v})} />
        <Num label="rB" value={params.rBot}   min={0}    onChange={v => onChange({...params, rBot:v})} />
        <Num label="H"  value={params.height} min={0.01} onChange={v => onChange({...params, height:v})} />
        <Num label="Sg" value={params.segs}   min={3} step={1} onChange={v => onChange({...params, segs:Math.round(v)})} />
      </>)}
      {params.type === "cone" && (<>
        <Num label="R"  value={params.radius} min={0.01} onChange={v => onChange({...params, radius:v})} />
        <Num label="H"  value={params.height} min={0.01} onChange={v => onChange({...params, height:v})} />
        <Num label="Sg" value={params.segs}   min={3} step={1} onChange={v => onChange({...params, segs:Math.round(v)})} />
      </>)}
      {params.type === "torus" && (<>
        <Num label="R"  value={params.radius} min={0.01} onChange={v => onChange({...params, radius:v})} />
        <Num label="Tu" value={params.tube}   min={0.01} onChange={v => onChange({...params, tube:v})} />
        <Num label="RS" value={params.rSegs}  min={3} step={1} onChange={v => onChange({...params, rSegs:Math.round(v)})} />
        <Num label="TS" value={params.tSegs}  min={3} step={1} onChange={v => onChange({...params, tSegs:Math.round(v)})} />
      </>)}
      {params.type === "plane" && (<>
        <Num label="W" value={params.width}  min={0.01} onChange={v => onChange({...params, width:v})} />
        <Num label="H" value={params.height} min={0.01} onChange={v => onChange({...params, height:v})} />
      </>)}
      {params.type === "ring" && (<>
        <Num label="iR" value={params.inner} min={0.01} onChange={v => onChange({...params, inner:v})} />
        <Num label="oR" value={params.outer} min={0.01} onChange={v => onChange({...params, outer:v})} />
        <Num label="Sg" value={params.segs}  min={3} step={1} onChange={v => onChange({...params, segs:Math.round(v)})} />
      </>)}
      {params.type === "torusKnot" && (<>
        <Num label="R"  value={params.radius} min={0.01} onChange={v => onChange({...params, radius:v})} />
        <Num label="Tu" value={params.tube}   min={0.01} onChange={v => onChange({...params, tube:v})} />
        <Num label="P"  value={params.p}      min={1} step={1} onChange={v => onChange({...params, p:Math.round(v)})} />
        <Num label="Q"  value={params.q}      min={1} step={1} onChange={v => onChange({...params, q:Math.round(v)})} />
      </>)}
      {params.type === "capsule" && (<>
        <Num label="R" value={params.radius} min={0.01} onChange={v => onChange({...params, radius:v})} />
        <Num label="L" value={params.length} min={0.01} onChange={v => onChange({...params, length:v})} />
      </>)}
    </div>
  );
}

/* ═══════════════════════════ MAIN COMPONENT ════════════════════════════════ */

export function CadEditor({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const THREERef   = useRef<any>(null);
  const sceneRef   = useRef<any>(null);
  const rendRef    = useRef<any>(null);
  const rafRef     = useRef(0);
  const meshMapRef = useRef<Map<string, any>>(new Map());
  const gridRef    = useRef<any>(null);
  const tcRef      = useRef<any>(null);
  const camRef     = useRef<any>(null);
  const orbitRef   = useRef<any>(null);

  const [shapes,      setShapes]      = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode,        setMode]        = useState<TransformMode>("translate");
  const [viewMode,    setViewMode]    = useState<ViewMode>("solid");
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [snapSize,    setSnapSize]    = useState(0.25);
  const [showGrid,    setShowGrid]    = useState(true);
  const [propTab,     setPropTab]     = useState<"transform"|"material"|"object">("transform");
  const [history,     setHistory]     = useState<Shape[][]>([[]]);
  const [histIdx,     setHistIdx]     = useState(0);
  const [bbInfo,      setBbInfo]      = useState<{w:number;h:number;d:number}|null>(null);
  const [localSpace,  setLocalSpace]  = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [arrayModal,  setArrayModal]  = useState(false);
  const [arrayAxis,   setArrayAxis]   = useState<"x"|"y"|"z">("x");
  const [arrayCount,  setArrayCount]  = useState(3);
  const [arraySpacing,setArraySpacing]= useState(2);

  const selectedIdsRef = useRef<Set<string>>(new Set());
  const shapesRef      = useRef<Shape[]>([]);
  const historyRef     = useRef<Shape[][]>([[]]);
  const histIdxRef     = useRef(0);
  const snapRef        = useRef(false);
  const snapSzRef      = useRef(0.25);
  const viewModeRef    = useRef<ViewMode>("solid");

  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { histIdxRef.current = histIdx; }, [histIdx]);
  useEffect(() => { snapRef.current = snapEnabled; }, [snapEnabled]);
  useEffect(() => { snapSzRef.current = snapSize; }, [snapSize]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { tcRef.current?.setMode(mode); }, [mode]);
  useEffect(() => { tcRef.current?.setSpace(localSpace ? "local" : "world"); }, [localSpace]);
  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);
  useEffect(() => {
    for (const [id, mesh] of meshMapRef.current) {
      const s = shapesRef.current.find(x => x.id === id);
      applyView(mesh, viewMode, s?.mat);
    }
  }, [viewMode]);

  /* THREE.JS INIT */
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let onDown: any, onUp: any, ro: ResizeObserver;
    (async () => {
      const T = await import("three");
      const { OrbitControls }     = await import("three/examples/jsm/controls/OrbitControls.js");
      const { TransformControls } = await import("three/examples/jsm/controls/TransformControls.js");
      if (disposed || !containerRef.current) return;
      THREERef.current = T;
      const scene = new T.Scene();
      scene.background = new T.Color(0x111827);
      sceneRef.current = scene;
      scene.add(new T.AmbientLight(0xffffff, 0.5));
      const sun = new T.DirectionalLight(0xffffff, 1.2);
      sun.position.set(10, 16, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.setScalar(2048);
      sun.shadow.camera.near = 0.1; sun.shadow.camera.far = 100;
      sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
      sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15;
      scene.add(sun);
      const fill = new T.DirectionalLight(0x8899ff, 0.25);
      fill.position.set(-6, 4, -8); scene.add(fill);
      const grid = new T.GridHelper(40, 40, 0x1e3a5f, 0x1a2744);
      scene.add(grid); gridRef.current = grid;
      const floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity:0.15 }));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.userData.isHelper = true;
      scene.add(floor);
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const ren = new T.WebGLRenderer({ antialias: true });
      ren.setPixelRatio(Math.min(devicePixelRatio, 2));
      ren.shadowMap.enabled = true;
      ren.setSize(w, h);
      containerRef.current.replaceChildren(ren.domElement);
      rendRef.current = ren;
      const cam = new T.PerspectiveCamera(50, w / h, 0.01, 1000);
      cam.position.set(7, 5, 7); cam.lookAt(0, 0, 0);
      camRef.current = cam;
      const orbit = new OrbitControls(cam, ren.domElement);
      orbit.enableDamping = true; orbit.dampingFactor = 0.06;
      orbitRef.current = orbit;
      const tc = new TransformControls(cam, ren.domElement);
      tc.setMode("translate"); tc.setSize(0.85);
      tc.addEventListener("dragging-changed", (e: any) => {
        orbit.enabled = !e.value;
        if (!e.value) {
          const id = [...selectedIdsRef.current][0]; if (!id) return;
          const mesh = meshMapRef.current.get(id); if (!mesh) return;
          if (snapRef.current) {
            const sz = snapSzRef.current;
            mesh.position.x = Math.round(mesh.position.x / sz) * sz;
            mesh.position.y = Math.round(mesh.position.y / sz) * sz;
            mesh.position.z = Math.round(mesh.position.z / sz) * sz;
          }
          pushHistoryRef.current(shapesRef.current);
        }
      });
      tc.addEventListener("change", () => {
        const T2 = THREERef.current;
        const id = [...selectedIdsRef.current][0];
        if (!id || !T2) return;
        const mesh = meshMapRef.current.get(id); if (!mesh) return;
        setShapes(prev => prev.map(s => s.id !== id ? s : {
          ...s,
          pos: r3(mesh.position),
          rot: {
            x: +T2.MathUtils.radToDeg(mesh.rotation.x).toFixed(2),
            y: +T2.MathUtils.radToDeg(mesh.rotation.y).toFixed(2),
            z: +T2.MathUtils.radToDeg(mesh.rotation.z).toFixed(2),
          },
          scl: r3(mesh.scale),
        }));
        updateBBRef.current(mesh);
      });
      scene.add(tc as any); tcRef.current = tc;
      const ray = new T.Raycaster();
      const ptr = new T.Vector2();
      let pdX = 0, pdY = 0;
      onDown = (e: PointerEvent) => { pdX = e.clientX; pdY = e.clientY; };
      onUp = (e: PointerEvent) => {
        if (e.button !== 0) return;
        if (Math.hypot(e.clientX - pdX, e.clientY - pdY) > 6) return;
        const rect = ren.domElement.getBoundingClientRect();
        ptr.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(ptr, cam);
        if (tc.object) { const h = ray.intersectObject(tc as any, true); if (h.length > 0) return; }
        const meshes = [...meshMapRef.current.values()];
        const hits = ray.intersectObjects(meshes, false);
        if (hits.length > 0) {
          const hit = hits[0].object;
          const entry = [...meshMapRef.current.entries()].find(([, m]) => m === hit);
          if (!entry) return;
          const [id] = entry;
          const shape = shapesRef.current.find(s => s.id === id);
          if (shape?.locked) return;
          if (e.shiftKey) {
            const ns = new Set(selectedIdsRef.current);
            ns.has(id) ? ns.delete(id) : ns.add(id);
            setSelectedIds(ns);
            const lastId = [...ns].at(-1);
            if (lastId) { const m = meshMapRef.current.get(lastId); if (m) tc.attach(m); } else tc.detach();
          } else {
            setSelectedIds(new Set([id])); tc.attach(hit); updateBBRef.current(hit);
          }
        } else if (!e.shiftKey) {
          tc.detach(); setSelectedIds(new Set()); setBbInfo(null);
        }
      };
      ren.domElement.addEventListener("pointerdown", onDown);
      ren.domElement.addEventListener("pointerup", onUp);
      ro = new ResizeObserver(() => {
        if (disposed || !containerRef.current) return;
        const nw = containerRef.current.clientWidth; const nh = containerRef.current.clientHeight;
        cam.aspect = nw / nh; cam.updateProjectionMatrix(); ren.setSize(nw, nh);
      });
      ro.observe(containerRef.current);
      const loop = () => {
        if (disposed) return;
        rafRef.current = requestAnimationFrame(loop);
        orbit.update(); ren.render(scene, cam);
      };
      loop();
    })();
    return () => {
      disposed = true; cancelAnimationFrame(rafRef.current);
      rendRef.current?.domElement.removeEventListener("pointerdown", onDown);
      rendRef.current?.domElement.removeEventListener("pointerup", onUp);
      ro?.disconnect(); tcRef.current?.dispose(); orbitRef.current?.dispose(); rendRef.current?.dispose();
    };
  }, []);

  function applyView(mesh: any, vm: ViewMode, mat?: Mat) {
    if (!mesh?.material) return;
    const m = mesh.material;
    m.wireframe = vm === "wireframe" || !!mat?.wire;
    m.transparent = vm === "xray" || (mat?.opacity ?? 1) < 1;
    m.opacity = vm === "xray" ? 0.3 : (mat?.opacity ?? 1);
    m.depthWrite = vm !== "xray"; m.needsUpdate = true;
  }

  const updateBBRef = useRef((mesh: any) => {
    const T = THREERef.current;
    if (!T || !mesh) { setBbInfo(null); return; }
    const bb = new T.Box3().setFromObject(mesh);
    const sz = new T.Vector3(); bb.getSize(sz);
    setBbInfo({ w: +sz.x.toFixed(3), h: +sz.y.toFixed(3), d: +sz.z.toFixed(3) });
  });

  const pushHistoryRef = useRef((newShapes: Shape[]) => {
    const h = historyRef.current.slice(0, histIdxRef.current + 1);
    const next = [...h, newShapes.map(s => ({ ...s }))];
    if (next.length > 52) next.shift();
    historyRef.current = next; histIdxRef.current = next.length - 1;
    setHistory([...next]); setHistIdx(next.length - 1);
  });

  const restoreShapes = useCallback((target: Shape[]) => {
    const T = THREERef.current;
    if (!T || !sceneRef.current) return;
    for (const [, mesh] of meshMapRef.current) {
      sceneRef.current.remove(mesh); mesh.geometry?.dispose();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m: any) => m?.dispose());
    }
    meshMapRef.current.clear(); tcRef.current?.detach();
    target.forEach(s => {
      const geo  = makeGeo(T, s.params);
      const tMat = new T.MeshStandardMaterial({
        color: s.mat.color, roughness: s.mat.roughness, metalness: s.mat.metalness,
        opacity: s.mat.opacity, transparent: s.mat.opacity < 1, wireframe: s.mat.wire,
      });
      const mesh = new T.Mesh(geo, tMat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.position.set(s.pos.x, s.pos.y, s.pos.z);
      mesh.rotation.set(T.MathUtils.degToRad(s.rot.x), T.MathUtils.degToRad(s.rot.y), T.MathUtils.degToRad(s.rot.z));
      mesh.scale.set(s.scl.x, s.scl.y, s.scl.z);
      mesh.visible = s.visible; sceneRef.current.add(mesh); meshMapRef.current.set(s.id, mesh);
    });
    setShapes(target.map(s => ({ ...s }))); setSelectedIds(new Set()); setBbInfo(null);
  }, []);

  const addShape = useCallback((type: ShapeType) => {
    const T = THREERef.current; if (!T || !sceneRef.current) return;
    const id = uid(); const count = meshMapRef.current.size;
    const mat = defMat(count); const params = defParams(type);
    const geo  = makeGeo(T, params);
    const tMat = new T.MeshStandardMaterial({ color: mat.color, roughness: mat.roughness, metalness: mat.metalness });
    const mesh = new T.Mesh(geo, tMat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const off = count * 0.4;
    mesh.position.set(off % 3, 0, Math.floor(off / 3) * 0.5);
    const bb = new T.Box3().setFromObject(mesh); mesh.position.y -= bb.min.y;
    sceneRef.current.add(mesh); meshMapRef.current.set(id, mesh);
    const shape: Shape = {
      id, name:`${type.charAt(0).toUpperCase()}${type.slice(1)} ${_ctr}`, mat, params,
      pos: r3(mesh.position), rot: {x:0,y:0,z:0}, scl: {x:1,y:1,z:1}, visible: true, locked: false,
    };
    const next = [...shapesRef.current, shape];
    setShapes(next); setSelectedIds(new Set([id]));
    tcRef.current?.attach(mesh); updateBBRef.current(mesh); pushHistoryRef.current(next);
  }, []);

  const deleteSelected = useCallback(() => {
    const ids = selectedIdsRef.current; if (!ids.size) return;
    ids.forEach(id => {
      const mesh = meshMapRef.current.get(id); if (!mesh) return;
      sceneRef.current?.remove(mesh); mesh.geometry?.dispose();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m: any) => m?.dispose());
      meshMapRef.current.delete(id);
    });
    tcRef.current?.detach();
    const next = shapesRef.current.filter(s => !ids.has(s.id));
    setShapes(next); setSelectedIds(new Set()); setBbInfo(null); pushHistoryRef.current(next);
  }, []);

  const duplicateSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (!ids.size || !sceneRef.current) return;
    const T = THREERef.current; if (!T) return;
    const next = [...shapesRef.current]; const newIds = new Set<string>();
    ids.forEach(id => {
      const mesh = meshMapRef.current.get(id); if (!mesh) return;
      const orig = shapesRef.current.find(s => s.id === id); if (!orig) return;
      const nid = uid(); const nm = mesh.clone(); nm.position.x += 1.5;
      sceneRef.current.add(nm); meshMapRef.current.set(nid, nm);
      next.push({ ...orig, id: nid, name: orig.name + " copy", pos: { ...orig.pos, x: +(orig.pos.x + 1.5).toFixed(3) } });
      newIds.add(nid);
    });
    tcRef.current?.detach();
    const lastId = [...newIds].at(-1);
    if (lastId) { const m = meshMapRef.current.get(lastId); if (m) tcRef.current?.attach(m); }
    setShapes(next); setSelectedIds(newIds); pushHistoryRef.current(next);
  }, []);

  const updateMat = useCallback((id: string, patch: Partial<Mat>) => {
    const mesh = meshMapRef.current.get(id); if (!mesh) return;
    const m = mesh.material;
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const nm = { ...s.mat, ...patch };
      if (patch.color     !== undefined) m.color.set(patch.color);
      if (patch.roughness !== undefined) m.roughness = patch.roughness;
      if (patch.metalness !== undefined) m.metalness = patch.metalness;
      if (patch.opacity   !== undefined) { m.opacity = patch.opacity; m.transparent = patch.opacity < 1 || viewModeRef.current === "xray"; m.needsUpdate = true; }
      if (patch.wire      !== undefined) { m.wireframe = patch.wire; m.needsUpdate = true; }
      return { ...s, mat: nm };
    }));
  }, []);

  const updateParams = useCallback((id: string, params: ShapeParams) => {
    const T = THREERef.current; const mesh = meshMapRef.current.get(id);
    if (!T || !mesh) return;
    mesh.geometry.dispose(); mesh.geometry = makeGeo(T, params);
    setShapes(prev => prev.map(s => s.id === id ? { ...s, params } : s));
    updateBBRef.current(mesh);
  }, []);

  const setPos = useCallback((id: string, axis: "x"|"y"|"z", val: number) => {
    const mesh = meshMapRef.current.get(id); if (!mesh) return;
    mesh.position[axis] = val;
    setShapes(prev => prev.map(s => s.id === id ? { ...s, pos: { ...s.pos, [axis]: val } } : s));
    updateBBRef.current(mesh);
  }, []);

  const setRot = useCallback((id: string, axis: "x"|"y"|"z", deg: number) => {
    const T = THREERef.current; if (!T) return;
    const mesh = meshMapRef.current.get(id); if (!mesh) return;
    mesh.rotation[axis] = T.MathUtils.degToRad(deg);
    setShapes(prev => prev.map(s => s.id === id ? { ...s, rot: { ...s.rot, [axis]: deg } } : s));
  }, []);

  const setScl = useCallback((id: string, axis: "x"|"y"|"z", val: number) => {
    const mesh = meshMapRef.current.get(id); if (!mesh) return;
    mesh.scale[axis] = val;
    setShapes(prev => prev.map(s => s.id === id ? { ...s, scl: { ...s.scl, [axis]: val } } : s));
    updateBBRef.current(mesh);
  }, []);

  const toggleVisible = useCallback((id: string) => {
    const mesh = meshMapRef.current.get(id); if (!mesh) return;
    setShapes(prev => prev.map(s => { if (s.id !== id) return s; mesh.visible = !s.visible; return { ...s, visible: !s.visible }; }));
  }, []);

  const toggleLock = useCallback((id: string) => {
    setShapes(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (!s.locked && selectedIdsRef.current.has(id)) {
        setSelectedIds(p => { const n = new Set(p); n.delete(id); return n; }); tcRef.current?.detach();
      }
      return { ...s, locked: !s.locked };
    }));
  }, []);

  const renameShape = useCallback((id: string, name: string) => {
    setShapes(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  const undo = useCallback(() => {
    const idx = histIdxRef.current; if (idx <= 0) return;
    const ni = idx - 1; restoreShapes(historyRef.current[ni]); histIdxRef.current = ni; setHistIdx(ni);
  }, [restoreShapes]);

  const redo = useCallback(() => {
    const idx = histIdxRef.current; const h = historyRef.current;
    if (idx >= h.length - 1) return;
    const ni = idx + 1; restoreShapes(h[ni]); histIdxRef.current = ni; setHistIdx(ni);
  }, [restoreShapes]);

  const selectAll = useCallback(() => {
    const ids = new Set(shapesRef.current.filter(s => !s.locked).map(s => s.id));
    setSelectedIds(ids);
    const lastId = [...ids].at(-1);
    if (lastId) { const m = meshMapRef.current.get(lastId); if (m) tcRef.current?.attach(m); }
  }, []);

  const centerSelected = useCallback(() => {
    selectedIdsRef.current.forEach(id => {
      const mesh = meshMapRef.current.get(id); if (!mesh) return;
      mesh.position.set(0, mesh.position.y, 0);
      setShapes(prev => prev.map(s => s.id === id ? { ...s, pos: { x:0, y:s.pos.y, z:0 } } : s));
    });
    pushHistoryRef.current(shapesRef.current);
  }, []);

  const mirrorSelected = useCallback((axis: "x"|"y"|"z") => {
    selectedIdsRef.current.forEach(id => {
      const mesh = meshMapRef.current.get(id); if (!mesh) return;
      mesh.scale[axis] *= -1;
      setShapes(prev => prev.map(s => s.id === id ? { ...s, scl: { ...s.scl, [axis]: s.scl[axis] * -1 } } : s));
    });
    pushHistoryRef.current(shapesRef.current);
  }, []);

  const flattenToGround = useCallback(() => {
    const T = THREERef.current; if (!T) return;
    selectedIdsRef.current.forEach(id => {
      const mesh = meshMapRef.current.get(id); if (!mesh) return;
      const bb = new T.Box3().setFromObject(mesh); mesh.position.y -= bb.min.y;
      setShapes(prev => prev.map(s => s.id === id ? { ...s, pos: { ...s.pos, y: +mesh.position.y.toFixed(3) } } : s));
    });
    pushHistoryRef.current(shapesRef.current);
  }, []);

  const applyArray = useCallback(() => {
    const ids = selectedIdsRef.current; if (!ids.size || !sceneRef.current) return;
    const T = THREERef.current; if (!T) return;
    const next = [...shapesRef.current];
    ids.forEach(id => {
      const mesh = meshMapRef.current.get(id); if (!mesh) return;
      const orig = shapesRef.current.find(s => s.id === id); if (!orig) return;
      for (let i = 1; i < arrayCount; i++) {
        const nid = uid(); const nm = mesh.clone();
        nm.position.copy(mesh.position); nm.position[arrayAxis] += arraySpacing * i;
        sceneRef.current.add(nm); meshMapRef.current.set(nid, nm);
        next.push({ ...orig, id: nid, name: `${orig.name}[${i}]`, pos: { ...orig.pos, [arrayAxis]: +(orig.pos[arrayAxis] + arraySpacing * i).toFixed(3) } });
      }
    });
    setShapes(next); setArrayModal(false); pushHistoryRef.current(next);
  }, [arrayAxis, arrayCount, arraySpacing]);

  const importSTL = useCallback(async (file: File) => {
    const T = THREERef.current; if (!T || !sceneRef.current) return;
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const geo = new STLLoader().parse(await file.arrayBuffer());
    geo.computeVertexNormals(); geo.center();
    const tMat = new T.MeshStandardMaterial({ color:"#8888aa", roughness:0.4, metalness:0.2 });
    const mesh = new T.Mesh(geo, tMat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const bb = new T.Box3().setFromObject(mesh); mesh.position.y = -bb.min.y;
    sceneRef.current.add(mesh); const id = uid(); meshMapRef.current.set(id, mesh);
    const shape: Shape = {
      id, name: file.name.replace(/\.stl$/i, ""),
      mat: { color:"#8888aa", roughness:0.4, metalness:0.2, opacity:1, wire:false },
      params: { type:"box", width:1, height:1, depth:1 },
      pos: r3(mesh.position), rot:{x:0,y:0,z:0}, scl:{x:1,y:1,z:1}, visible:true, locked:false,
    };
    const next = [...shapesRef.current, shape];
    setShapes(next); setSelectedIds(new Set([id]));
    tcRef.current?.attach(mesh); updateBBRef.current(mesh); pushHistoryRef.current(next);
  }, []);

  const exportSTL = useCallback(async () => {
    if (meshMapRef.current.size === 0) return;
    setIsExporting(true);
    const T = THREERef.current;
    const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
    const tmp = new T.Scene();
    for (const mesh of meshMapRef.current.values()) tmp.add(mesh.clone());
    const result = new STLExporter().parse(tmp, { binary: true }) as DataView;
    const url = URL.createObjectURL(new Blob([result.buffer], { type:"model/stl" }));
    Object.assign(document.createElement("a"), { href:url, download:"model.stl" }).click();
    URL.revokeObjectURL(url); setIsExporting(false);
  }, []);

  const exportOBJ = useCallback(async () => {
    if (meshMapRef.current.size === 0) return;
    setIsExporting(true);
    const T = THREERef.current;
    const { OBJExporter } = await import("three/examples/jsm/exporters/OBJExporter.js");
    const tmp = new T.Scene();
    for (const mesh of meshMapRef.current.values()) tmp.add(mesh.clone());
    const result = new OBJExporter().parse(tmp);
    const url = URL.createObjectURL(new Blob([result], { type:"text/plain" }));
    Object.assign(document.createElement("a"), { href:url, download:"model.obj" }).click();
    URL.revokeObjectURL(url); setIsExporting(false);
  }, []);

  const submitPrint = useCallback(async () => {
    if (meshMapRef.current.size === 0) return;
    setIsExporting(true);
    const T = THREERef.current;
    const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
    const tmp = new T.Scene();
    for (const mesh of meshMapRef.current.values()) tmp.add(mesh.clone());
    const result = new STLExporter().parse(tmp, { binary: true }) as DataView;
    const bytes = new Uint8Array(result.buffer);
    let str = ""; for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    try { sessionStorage.setItem("cad_stl", btoa(str)); sessionStorage.setItem("cad_filename", "cad-model.stl"); } catch {}
    setIsExporting(false); router.push("/custom-print");
  }, [router]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "g" || e.key === "G") setMode("translate");
      if (e.key === "r" || e.key === "R") setMode("rotate");
      if (e.key === "s" || e.key === "S") setMode("scale");
      if (e.key === "f" || e.key === "F") flattenToGround();
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) { e.preventDefault(); duplicateSelected(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) { e.preventDefault(); selectAll(); }
      if (e.key === "Escape") { tcRef.current?.detach(); setSelectedIds(new Set()); setBbInfo(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [deleteSelected, duplicateSelected, undo, redo, selectAll, flattenToGround]);

  const primary = shapes.find(s => selectedIds.has(s.id)) || null;
  const isEmpty = shapes.length === 0;
  const SHAPES: [ShapeType, string, string][] = [
    ["box","⬛","Box"], ["sphere","●","Sphere"], ["cylinder","⏺","Cyl"],
    ["cone","▲","Cone"], ["torus","⭕","Torus"], ["plane","▬","Plane"],
    ["ring","◎","Ring"], ["torusKnot","✦","Knot"], ["capsule","💊","Cap"],
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background:"#0f1117", color:"#e2e8f0" }}>
      {/* TOP TOOLBAR */}
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-slate-800 bg-slate-900 px-2 py-1.5">
        <div className="flex items-center gap-0.5 border-r border-slate-700 pr-2 mr-1">
          <label className="tbtn cursor-pointer" title="Import STL">📂 Import
            <input type="file" accept=".stl" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importSTL(f); e.target.value = ""; }} />
          </label>
          <button onClick={exportSTL} disabled={isEmpty||isExporting} className="tbtn">⬇ STL</button>
          <button onClick={exportOBJ} disabled={isEmpty||isExporting} className="tbtn">⬇ OBJ</button>
        </div>
        <div className="flex items-center gap-0.5 border-r border-slate-700 pr-2 mr-1">
          <button onClick={undo} disabled={histIdx<=0} className="tbtn" title="Undo ⌘Z">↩</button>
          <button onClick={redo} disabled={histIdx>=history.length-1} className="tbtn" title="Redo ⌘Y">↪</button>
          <button onClick={duplicateSelected} disabled={!selectedIds.size} className="tbtn" title="Duplicate ⌘D">⊕</button>
          <button onClick={deleteSelected} disabled={!selectedIds.size} className="tbtn text-rose-400" title="Delete">✕</button>
        </div>
        <div className="flex items-center gap-0.5 border-r border-slate-700 pr-2 mr-1">
          {(["translate","rotate","scale"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`tbtn ${mode===m?"bg-violet-700 text-white":""}`}>
              {m==="translate"?"✥ Move":m==="rotate"?"↻ Rot":"⤢ Scale"}
            </button>
          ))}
          <button onClick={() => setLocalSpace(v => !v)} className={`tbtn ${localSpace?"bg-slate-700":""}`}>{localSpace?"LOCAL":"WORLD"}</button>
        </div>
        <div className="flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
          <button onClick={() => setSnapEnabled(v => !v)} className={`tbtn ${snapEnabled?"bg-amber-800 text-amber-200":""}`}>🧲 Snap</button>
          {snapEnabled && (
            <select value={snapSize} onChange={e => setSnapSize(parseFloat(e.target.value))}
              className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-[10px] text-slate-300">
              {[0.1,0.25,0.5,1,2].map(v => <option key={v} value={v}>{v}u</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-0.5 border-r border-slate-700 pr-2 mr-1">
          {(["solid","wireframe","xray"] as const).map(vm => (
            <button key={vm} onClick={() => setViewMode(vm)} className={`tbtn ${viewMode===vm?"bg-slate-700":""}`}>
              {vm==="solid"?"◼ Solid":vm==="wireframe"?"⊡ Wire":"◻ X-Ray"}
            </button>
          ))}
          <button onClick={() => setShowGrid(v => !v)} className={`tbtn ${showGrid?"bg-slate-700":""}`}>⊞ Grid</button>
        </div>
        <div className="flex items-center gap-0.5 border-r border-slate-700 pr-2 mr-1">
          <button onClick={() => mirrorSelected("x")} disabled={!selectedIds.size} className="tbtn">↔X</button>
          <button onClick={() => mirrorSelected("y")} disabled={!selectedIds.size} className="tbtn">↕Y</button>
          <button onClick={() => mirrorSelected("z")} disabled={!selectedIds.size} className="tbtn">↔Z</button>
          <button onClick={centerSelected}  disabled={!selectedIds.size} className="tbtn">⊙ Ctr</button>
          <button onClick={flattenToGround} disabled={!selectedIds.size} className="tbtn">⬇ Gnd</button>
          <button onClick={() => setArrayModal(true)} disabled={!selectedIds.size} className="tbtn">⁝ Arr</button>
        </div>
        <div className="ml-auto">
          <button onClick={submitPrint} disabled={isEmpty||isExporting}
            className="rounded bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-40">
            🖨 Request Print Quote
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <aside className="flex w-48 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-950">
          <div className="shrink-0 border-b border-slate-800 p-2">
            <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-slate-600">Add Shape</p>
            <div className="grid grid-cols-3 gap-1">
              {SHAPES.map(([type, icon, label]) => (
                <button key={type} onClick={() => addShape(type)}
                  className="flex flex-col items-center rounded border border-slate-800 py-1.5 text-[8px] transition-all hover:border-violet-600 hover:bg-violet-950 hover:text-violet-300 active:scale-95">
                  <span className="text-lg leading-none">{icon}</span>
                  <span className="mt-1 text-slate-500">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Scene</p>
              <span className="text-[8px] text-slate-700">{shapes.length}</span>
            </div>
            {isEmpty ? <p className="text-[10px] italic text-slate-700">Empty scene</p> : (
              <ul className="space-y-0.5">
                {shapes.map(s => (
                  <li key={s.id}
                    className={`group flex items-center gap-1 rounded px-1.5 py-1 text-[10px] cursor-pointer transition-colors ${selectedIds.has(s.id)?"bg-violet-900/50 text-violet-200":"text-slate-500 hover:bg-slate-800 hover:text-slate-300"}`}
                    onClick={e => {
                      if (s.locked) return;
                      const ns = e.shiftKey ? new Set(selectedIds) : new Set<string>();
                      ns.has(s.id) ? ns.delete(s.id) : ns.add(s.id); setSelectedIds(ns);
                      const lastId = [...ns].at(-1);
                      if (lastId) { const m = meshMapRef.current.get(lastId); if (m) { tcRef.current?.attach(m); updateBBRef.current(m); } } else tcRef.current?.detach();
                    }}>
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: s.mat.color }} />
                    <span className="flex-1 truncate">{s.name}</span>
                    <button onClick={e => { e.stopPropagation(); toggleVisible(s.id); }} className="shrink-0 opacity-0 group-hover:opacity-100 text-[9px]">{s.visible?"👁":"🚫"}</button>
                    <button onClick={e => { e.stopPropagation(); toggleLock(s.id); }} className="shrink-0 opacity-0 group-hover:opacity-100 text-[9px]">{s.locked?"🔒":"🔓"}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* VIEWPORT */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={containerRef} className="h-full w-full" />
          <div className="pointer-events-none absolute left-2 top-2 text-[9px] font-bold tracking-widest text-slate-700">
            PERSPECTIVE · {viewMode.toUpperCase()}
          </div>
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">🪐</div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Start modeling</p>
              <p className="text-xs text-slate-600 mb-4">Add shapes from the left panel</p>
              <div className="rounded border border-slate-800 bg-slate-900/80 p-3 text-[9px] text-slate-600 leading-relaxed grid grid-cols-2 gap-x-4">
                <span>G — Move</span><span>R — Rotate</span>
                <span>S — Scale</span><span>F — Flatten</span>
                <span>Del — Delete</span><span>⌘D — Dup</span>
                <span>⌘Z — Undo</span><span>⌘Y — Redo</span>
                <span>⌘A — All</span><span>Esc — Deselect</span>
                <span>Shift+Click — Multi</span><span>Scroll — Zoom</span>
              </div>
            </div>
          )}
          {bbInfo && (
            <div className="pointer-events-none absolute bottom-2 left-2 rounded border border-slate-700 bg-slate-900/90 px-2 py-1 text-[9px] font-mono text-slate-400">
              W:{bbInfo.w}  H:{bbInfo.h}  D:{bbInfo.d}
            </div>
          )}
          {selectedIds.size > 1 && (
            <div className="pointer-events-none absolute top-2 right-2 rounded bg-violet-900/80 px-2 py-0.5 text-[9px] text-violet-200">
              {selectedIds.size} selected
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <aside className="flex w-52 shrink-0 flex-col overflow-hidden border-l border-slate-800 bg-slate-950">
          <div className="flex shrink-0 border-b border-slate-800">
            {(["transform","material","object"] as const).map(tab => (
              <button key={tab} onClick={() => setPropTab(tab)}
                className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors ${propTab===tab?"border-b-2 border-violet-500 text-violet-400":"text-slate-600 hover:text-slate-400"}`}>
                {tab==="transform"?"⤢":tab==="material"?"◈":"ℹ"} {tab.slice(0,4)}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {!primary ? <p className="text-[10px] italic text-slate-700">No selection</p> : (<>
              {propTab === "transform" && (
                <div className="space-y-4">
                  <Section label="Position">
                    <Num label="X" value={primary.pos.x} onChange={v => setPos(primary.id,"x",v)} />
                    <Num label="Y" value={primary.pos.y} onChange={v => setPos(primary.id,"y",v)} />
                    <Num label="Z" value={primary.pos.z} onChange={v => setPos(primary.id,"z",v)} />
                  </Section>
                  <Section label="Rotation °">
                    <Num label="X" value={primary.rot.x} step={1} onChange={v => setRot(primary.id,"x",v)} />
                    <Num label="Y" value={primary.rot.y} step={1} onChange={v => setRot(primary.id,"y",v)} />
                    <Num label="Z" value={primary.rot.z} step={1} onChange={v => setRot(primary.id,"z",v)} />
                  </Section>
                  <Section label="Scale">
                    <Num label="X" value={primary.scl.x} min={0.001} onChange={v => setScl(primary.id,"x",v)} />
                    <Num label="Y" value={primary.scl.y} min={0.001} onChange={v => setScl(primary.id,"y",v)} />
                    <Num label="Z" value={primary.scl.z} min={0.001} onChange={v => setScl(primary.id,"z",v)} />
                  </Section>
                  {bbInfo && (
                    <Section label="Bounding Box">
                      <div className="space-y-0.5 text-[10px] font-mono text-slate-500">
                        <div>W: <span className="text-slate-300">{bbInfo.w}</span></div>
                        <div>H: <span className="text-slate-300">{bbInfo.h}</span></div>
                        <div>D: <span className="text-slate-300">{bbInfo.d}</span></div>
                      </div>
                    </Section>
                  )}
                </div>
              )}
              {propTab === "material" && (
                <div className="space-y-4">
                  <Section label="Color">
                    <div className="flex items-center gap-2">
                      <input type="color" value={primary.mat.color}
                        onChange={e => updateMat(primary.id, { color: e.target.value })}
                        className="h-8 w-8 cursor-pointer rounded border border-slate-700 bg-transparent p-0.5" />
                      <span className="font-mono text-[10px] text-slate-400">{primary.mat.color.toUpperCase()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => updateMat(primary.id, { color:c })}
                          className="h-5 w-5 rounded-sm border border-black/30 hover:scale-125 transition-transform"
                          style={{ background:c }} />
                      ))}
                    </div>
                  </Section>
                  <Section label="Surface">
                    <Slider label="Roughness" value={primary.mat.roughness} min={0} max={1} onChange={v => updateMat(primary.id,{roughness:v})} />
                    <Slider label="Metalness" value={primary.mat.metalness} min={0} max={1} onChange={v => updateMat(primary.id,{metalness:v})} />
                    <Slider label="Opacity"   value={primary.mat.opacity}   min={0} max={1} onChange={v => updateMat(primary.id,{opacity:v})} />
                  </Section>
                  <Section label="Display">
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-500">
                      <input type="checkbox" checked={primary.mat.wire} onChange={e => updateMat(primary.id,{wire:e.target.checked})} className="accent-violet-500" />
                      Wireframe overlay
                    </label>
                  </Section>
                </div>
              )}
              {propTab === "object" && (
                <div className="space-y-4">
                  <Section label="Name">
                    <input type="text" value={primary.name} onChange={e => renameShape(primary.id,e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 focus:border-violet-500 focus:outline-none" />
                  </Section>
                  <Section label="Flags">
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-500">
                      <input type="checkbox" checked={primary.visible} onChange={() => toggleVisible(primary.id)} className="accent-violet-500" />
                      Visible
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-500">
                      <input type="checkbox" checked={primary.locked} onChange={() => toggleLock(primary.id)} className="accent-violet-500" />
                      Locked
                    </label>
                  </Section>
                  <Section label={`Params · ${primary.params.type}`}>
                    <ShapeParamsEditor params={primary.params} onChange={p => updateParams(primary.id,p)} />
                  </Section>
                  <Section label="Quick Ops">
                    <div className="grid grid-cols-2 gap-1">
                      {(["x","y","z"] as const).map(ax => (
                        <button key={ax} onClick={() => mirrorSelected(ax)} className="smbtn">↔ {ax.toUpperCase()}</button>
                      ))}
                      <button onClick={centerSelected}  className="smbtn col-span-2">⊙ Center</button>
                      <button onClick={flattenToGround} className="smbtn col-span-2">⬇ To Ground</button>
                      <button onClick={() => setArrayModal(true)} className="smbtn col-span-2">⁝ Array…</button>
                    </div>
                  </Section>
                </div>
              )}
            </>)}
          </div>
        </aside>
      </div>

      {/* STATUS BAR */}
      <div className="flex shrink-0 items-center gap-4 border-t border-slate-800 bg-slate-900 px-3 py-1 text-[9px] text-slate-600">
        <span>{shapes.length} objects</span>
        <span className={selectedIds.size?"text-violet-400":""}>{selectedIds.size} selected</span>
        <span className="capitalize">{mode}</span><span>{viewMode}</span>
        {snapEnabled && <span className="text-amber-600">🧲 {snapSize}</span>}
        <span>{localSpace?"local":"world"}</span>
        <span className="ml-auto text-slate-700">hist {histIdx}/{history.length-1}</span>
      </div>

      {/* ARRAY MODAL */}
      {arrayModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-60 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <h3 className="mb-3 text-sm font-bold text-slate-200">⁝ Array Modifier</h3>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-slate-500">Axis</span>
                <select value={arrayAxis} onChange={e => setArrayAxis(e.target.value as any)}
                  className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200">
                  <option value="x">X</option><option value="y">Y</option><option value="z">Z</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-slate-500">Count</span>
                <input type="number" min={2} max={50} value={arrayCount} onChange={e => setArrayCount(Math.max(2,parseInt(e.target.value)||2))}
                  className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-slate-500">Spacing</span>
                <input type="number" step={0.5} value={arraySpacing} onChange={e => setArraySpacing(parseFloat(e.target.value)||1)}
                  className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={applyArray} className="flex-1 rounded bg-violet-600 py-1.5 text-xs font-bold text-white hover:bg-violet-500">Apply</button>
              <button onClick={() => setArrayModal(false)} className="flex-1 rounded border border-slate-700 py-1.5 text-xs text-slate-400 hover:bg-slate-800">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tbtn{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;color:#64748b;background:transparent;border:1px solid transparent;cursor:pointer;transition:all 0.1s;white-space:nowrap;}
        .tbtn:hover:not(:disabled){background:#1e293b;color:#cbd5e1;border-color:#334155;}
        .tbtn:disabled{opacity:0.3;cursor:not-allowed;}
        .smbtn{padding:4px 6px;border-radius:4px;font-size:10px;font-weight:500;color:#64748b;background:#1e293b;border:1px solid #334155;cursor:pointer;transition:all 0.1s;text-align:center;}
        .smbtn:hover{background:#293548;color:#94a3b8;}
      `}</style>
    </div>
  );
}
