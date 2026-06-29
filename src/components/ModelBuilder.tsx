"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import type { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

type PrimitiveKind = "box" | "sphere" | "cylinder" | "cone";
type Vec3 = [number, number, number];
type TransformMode = "translate" | "rotate" | "scale";

interface ShapeDef {
  id: string;
  kind: PrimitiveKind;
  isHole: boolean;
  position: Vec3;
  rotationDeg: Vec3;
  size: Vec3;
}

const KIND_LABELS: Record<PrimitiveKind, string> = {
  box: "Box",
  sphere: "Sphere",
  cylinder: "Cylinder",
  cone: "Cone",
};

let shapeCounter = 0;

function createShape(kind: PrimitiveKind, index: number): ShapeDef {
  shapeCounter += 1;
  return {
    id: `shape-${Date.now()}-${shapeCounter}`,
    kind,
    isHole: false,
    position: [index * 25, 0, 0],
    rotationDeg: [0, 0, 0],
    size: [20, 20, 20],
  };
}

function getUnitGeometry(
  three: typeof THREE,
  cache: Map<PrimitiveKind, THREE.BufferGeometry>,
  kind: PrimitiveKind
): THREE.BufferGeometry {
  let geometry = cache.get(kind);
  if (!geometry) {
    switch (kind) {
      case "box":
        geometry = new three.BoxGeometry(1, 1, 1);
        break;
      case "sphere":
        geometry = new three.SphereGeometry(0.5, 32, 16);
        break;
      case "cylinder":
        geometry = new three.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case "cone":
        geometry = new three.ConeGeometry(0.5, 1, 32);
        break;
    }
    cache.set(kind, geometry);
  }
  return geometry;
}

function Vec3Field({
  label,
  values,
  step,
  onChange,
}: {
  label: string;
  values: Vec3;
  step: number;
  onChange: (axis: 0 | 1 | 2, value: number) => void;
}) {
  const axisLabels = ["X", "Y", "Z"] as const;
  return (
    <div>
      <p className="label">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {axisLabels.map((axisLabel, axis) => (
          <input
            key={axisLabel}
            type="number"
            step={step}
            value={values[axis]}
            aria-label={`${label} ${axisLabel}`}
            onChange={(e) => {
              const v = e.target.valueAsNumber;
              if (!Number.isNaN(v)) onChange(axis as 0 | 1 | 2, v);
            }}
            className="input"
          />
        ))}
      </div>
    </div>
  );
}

export function ModelBuilder({ onExport }: { onExport: (file: File) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shapes, setShapes] = useState<ShapeDef[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const shapesRef = useRef(shapes);
  const selectedIdRef = useRef(selectedId);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const threeRef = useRef<typeof THREE | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const geometryCacheRef = useRef<Map<PrimitiveKind, THREE.BufferGeometry>>(new Map());
  const solidMaterialRef = useRef<THREE.Material | null>(null);
  const holeMaterialRef = useRef<THREE.Material | null>(null);
  const reconcileRef = useRef<((shapes: ShapeDef[], selectedId: string | null) => void) | null>(null);

  function commitShape(id: string, patch: Partial<ShapeDef>) {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    let cleanup = () => {};

    async function init() {
      const container = containerRef.current;
      if (!container) return;

      const three = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { TransformControls: TransformControlsImpl } = await import(
        "three/examples/jsm/controls/TransformControls.js"
      );

      if (disposed || !containerRef.current) return;

      threeRef.current = three;

      const scene = new three.Scene();
      scene.background = new three.Color(0xf1f5f9);
      scene.add(new three.GridHelper(300, 30, 0xcbd5e1, 0xe2e8f0));
      sceneRef.current = scene;

      const camera = new three.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 10000);
      camera.position.set(150, 150, 150);
      camera.lookAt(0, 0, 0);

      const renderer = new three.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.replaceChildren(renderer.domElement);

      scene.add(new three.AmbientLight(0xffffff, 0.7));
      const dirLight = new three.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(5, 10, 7.5);
      scene.add(dirLight);

      solidMaterialRef.current = new three.MeshStandardMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.85,
      });
      holeMaterialRef.current = new three.MeshStandardMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.35,
      });

      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;

      const transformControls = new TransformControlsImpl(camera, renderer.domElement);
      transformControls.setMode(transformMode);
      transformControlsRef.current = transformControls;
      scene.add(transformControls.getHelper());

      transformControls.addEventListener("dragging-changed", (event) => {
        const isDragging = Boolean(event.value);
        orbitControls.enabled = !isDragging;
        if (!isDragging) {
          const id = selectedIdRef.current;
          const mesh = id ? meshMapRef.current.get(id) : undefined;
          if (id && mesh) {
            const patch: Partial<ShapeDef> = {
              position: [mesh.position.x, mesh.position.y, mesh.position.z],
              rotationDeg: [
                three.MathUtils.radToDeg(mesh.rotation.x),
                three.MathUtils.radToDeg(mesh.rotation.y),
                three.MathUtils.radToDeg(mesh.rotation.z),
              ],
              size: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
            };
            setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
          }
        }
      });

      let downX = 0;
      let downY = 0;
      function onPointerDown(e: PointerEvent) {
        downX = e.clientX;
        downY = e.clientY;
      }
      function onPointerUp(e: PointerEvent) {
        if (transformControls.dragging) return;
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) return;

        const rect = renderer.domElement.getBoundingClientRect();
        const pointer = new three.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new three.Raycaster();
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(Array.from(meshMapRef.current.values()), false);
        setSelectedId(hits.length > 0 ? (hits[0].object.userData.shapeId as string) : null);
      }
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointerup", onPointerUp);

      function reconcile(currentShapes: ShapeDef[], currentSelectedId: string | null) {
        const map = meshMapRef.current;
        const seen = new Set<string>();

        for (const shape of currentShapes) {
          seen.add(shape.id);
          let mesh = map.get(shape.id);
          if (!mesh) {
            const geometry = getUnitGeometry(three, geometryCacheRef.current, shape.kind);
            mesh = new three.Mesh(geometry);
            mesh.userData.shapeId = shape.id;
            scene.add(mesh);
            map.set(shape.id, mesh);
          }
          mesh.material = shape.isHole ? holeMaterialRef.current! : solidMaterialRef.current!;
          mesh.position.set(...shape.position);
          mesh.rotation.set(
            three.MathUtils.degToRad(shape.rotationDeg[0]),
            three.MathUtils.degToRad(shape.rotationDeg[1]),
            three.MathUtils.degToRad(shape.rotationDeg[2])
          );
          mesh.scale.set(...shape.size);
        }

        for (const [id, mesh] of Array.from(map.entries())) {
          if (!seen.has(id)) {
            scene.remove(mesh);
            map.delete(id);
          }
        }

        const selectedMesh = currentSelectedId ? map.get(currentSelectedId) : undefined;
        if (selectedMesh) {
          if (transformControls.object !== selectedMesh) transformControls.attach(selectedMesh);
        } else {
          transformControls.detach();
        }
      }
      reconcileRef.current = reconcile;
      reconcile(shapesRef.current, selectedIdRef.current);

      function animate() {
        if (disposed) return;
        orbitControls.update();
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      }
      animate();

      function handleResize() {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", handleResize);

      cleanup = () => {
        window.removeEventListener("resize", handleResize);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        reconcileRef.current = null;
        transformControls.dispose();
        orbitControls.dispose();
        meshMapRef.current.clear();
        geometryCacheRef.current.forEach((g) => g.dispose());
        geometryCacheRef.current.clear();
        solidMaterialRef.current?.dispose();
        holeMaterialRef.current?.dispose();
        renderer.dispose();
        sceneRef.current = null;
      };
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reconcileRef.current?.(shapes, selectedId);
  }, [shapes, selectedId]);

  useEffect(() => {
    transformControlsRef.current?.setMode(transformMode);
  }, [transformMode]);

  function addShape(kind: PrimitiveKind) {
    const shape = createShape(kind, shapesRef.current.length);
    setShapes((prev) => [...prev, shape]);
    setSelectedId(shape.id);
  }

  function deleteShape(id: string) {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function toggleHole(id: string) {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, isHole: !s.isHole } : s)));
  }

  function updateVec(field: "position" | "rotationDeg" | "size", axis: 0 | 1 | 2, value: number) {
    if (!selectedId) return;
    const current = shapes.find((s) => s.id === selectedId);
    if (!current) return;
    const next = [...current[field]] as Vec3;
    next[axis] = value;
    commitShape(selectedId, { [field]: next } as Partial<ShapeDef>);
  }

  async function handleExport() {
    setExportError(null);
    const currentShapes = shapesRef.current;
    const solids = currentShapes.filter((s) => !s.isHole);
    const holes = currentShapes.filter((s) => s.isHole);
    if (solids.length === 0) {
      setExportError("Add at least one solid shape (not just holes) before using this model.");
      return;
    }

    setExporting(true);
    try {
      const three = await import("three");
      const { Brush, Evaluator, ADDITION, SUBTRACTION } = await import("three-bvh-csg");
      const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
      const cache = geometryCacheRef.current;

      function makeBrush(shape: ShapeDef) {
        const geometry = getUnitGeometry(three, cache, shape.kind);
        const brush = new Brush(geometry);
        brush.position.set(...shape.position);
        brush.rotation.set(
          three.MathUtils.degToRad(shape.rotationDeg[0]),
          three.MathUtils.degToRad(shape.rotationDeg[1]),
          three.MathUtils.degToRad(shape.rotationDeg[2])
        );
        brush.scale.set(...shape.size);
        brush.updateMatrixWorld();
        return brush;
      }

      const evaluator = new Evaluator();
      let result = makeBrush(solids[0]);
      for (let i = 1; i < solids.length; i++) {
        result = evaluator.evaluate(result, makeBrush(solids[i]), ADDITION);
        result.updateMatrixWorld();
      }
      for (const hole of holes) {
        result = evaluator.evaluate(result, makeBrush(hole), SUBTRACTION);
        result.updateMatrixWorld();
      }

      result.geometry.setDrawRange(0, Infinity);

      const stlData = new STLExporter().parse(result, { binary: true });
      const file = new File([stlData], `custom-model-${Date.now()}.stl`, { type: "model/stl" });
      onExport(file);
    } catch {
      setExportError("Couldn't generate the model from these shapes. Try simplifying your design.");
    } finally {
      setExporting(false);
    }
  }

  const selectedShape = shapes.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Add shapes, mark some as &quot;holes&quot; to cut out, then drag the gizmo or type exact numbers to position
        them. Click a shape (in the list or the 3D view) to select it.
      </p>

      <div className="flex flex-wrap gap-2">
        {(["box", "sphere", "cylinder", "cone"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => addShape(kind)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + {KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="h-96 w-full overflow-hidden rounded-xl bg-slate-50" />

      <div className="flex gap-2">
        {(["translate", "rotate", "scale"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setTransformMode(mode)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              transformMode === mode
                ? "bg-violet-600 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {mode === "translate" ? "Move" : mode === "rotate" ? "Rotate" : "Scale"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {shapes.length === 0 && <p className="text-sm text-slate-500">No shapes yet — add one above.</p>}
        {shapes.map((shape) => (
          <div
            key={shape.id}
            onClick={() => setSelectedId(shape.id)}
            className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
              selectedId === shape.id ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="font-medium text-slate-800">{KIND_LABELS[shape.kind]}</span>
            <label className="flex items-center gap-1 text-xs text-slate-600" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={shape.isHole} onChange={() => toggleHole(shape.id)} />
              Hole
            </label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteShape(shape.id);
              }}
              className="text-rose-600 hover:text-rose-800"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {selectedShape && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3">
          <p className="font-medium text-slate-800">{KIND_LABELS[selectedShape.kind]} settings</p>
          <Vec3Field
            label="Position (mm)"
            values={selectedShape.position}
            step={1}
            onChange={(axis, v) => updateVec("position", axis, v)}
          />
          <Vec3Field
            label="Rotation (degrees)"
            values={selectedShape.rotationDeg}
            step={1}
            onChange={(axis, v) => updateVec("rotationDeg", axis, v)}
          />
          <Vec3Field
            label="Size (mm)"
            values={selectedShape.size}
            step={1}
            onChange={(axis, v) => updateVec("size", axis, Math.max(0.1, v))}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary self-start disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Generating…" : "Use This Model"}
        </button>
        {exportError && <p className="text-sm text-rose-600">{exportError}</p>}
      </div>
    </div>
  );
}
