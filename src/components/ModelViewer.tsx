"use client";

import { useEffect, useRef, useState } from "react";

export function ModelViewer({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    let cleanup = () => {};

    async function init() {
      const container = containerRef.current;
      if (!container) return;

      const ext = fileName.toLowerCase().split(".").pop();
      if (ext !== "stl" && ext !== "obj" && ext !== "3mf") {
        setError("Unsupported file type for preview.");
        return;
      }

      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      let loaded: import("three").BufferGeometry | import("three").Group | import("three").Object3D;
      if (ext === "stl") {
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
        loaded = await new STLLoader().loadAsync(fileUrl);
      } else if (ext === "obj") {
        const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
        loaded = await new OBJLoader().loadAsync(fileUrl);
      } else {
        const { ThreeMFLoader } = await import("three/examples/jsm/loaders/3MFLoader.js");
        loaded = await new ThreeMFLoader().loadAsync(fileUrl);
      }

      if (disposed || !containerRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf1f5f9);

      const camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        10000
      );

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.replaceChildren(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(5, 10, 7.5);
      scene.add(dirLight);

      const material = new THREE.MeshStandardMaterial({ color: 0x7c3aed });
      let object: import("three").Object3D;
      if (loaded instanceof THREE.BufferGeometry) {
        object = new THREE.Mesh(loaded, material);
      } else {
        object = loaded;
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && !child.material) {
            child.material = material;
          }
        });
      }
      scene.add(object);

      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const distance = maxDim * 2.2;
      camera.position.set(distance, distance, distance);
      camera.lookAt(0, 0, 0);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      function animate() {
        if (disposed) return;
        controls.update();
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      }
      animate();

      cleanup = () => {
        controls.dispose();
        renderer.dispose();
      };
    }

    init().catch(() => {
      if (!disposed) setError("Couldn't load a preview for this file.");
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cleanup();
    };
  }, [fileUrl, fileName]);

  if (error) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-xl bg-slate-50">
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  return <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-xl bg-slate-50" />;
}
