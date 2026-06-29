// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ══════════════════════════════ TYPES ══════════════════════════════════════ */
type ShapeType = "box"|"sphere"|"cylinder"|"cone"|"torus"|"plane"|"ring"|"torusKnot"|"capsule";
type TransformMode = "translate"|"rotate"|"scale";
type ViewMode = "solid"|"wireframe"|"xray";
interface Mat { color:string; roughness:number; metalness:number; opacity:number; wire:boolean; }
type ShapeParams =
  | {type:"box";width:number;height:number;depth:number}
  | {type:"sphere";radius:number;wSegs:number;hSegs:number}
  | {type:"cylinder";rTop:number;rBot:number;height:number;segs:number}
  | {type:"cone";radius:number;height:number;segs:number}
  | {type:"torus";radius:number;tube:number;rSegs:number;tSegs:number}
  | {type:"plane";width:number;height:number}
  | {type:"ring";inner:number;outer:number;segs:number}
  | {type:"torusKnot";radius:number;tube:number;p:number;q:number}
  | {type:"capsule";radius:number;length:number};
interface Shape {
  id:string; name:string; mat:Mat; params:ShapeParams;
  pos:{x:number;y:number;z:number}; rot:{x:number;y:number;z:number}; scl:{x:number;y:number;z:number};
  visible:boolean; locked:boolean;
}

/* ══════════════════════════ CONSTANTS ══════════════════════════════════════ */
const COLORS=["#4472c4","#ed7d31","#a9d18e","#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#c77dff","#f72585","#4cc9f0"];
let _ctr=0;
const uid=()=>`s${++_ctr}`;

/* ════════════════════════════ GEOMETRY ════════════════════════════════════ */
function makeGeo(T:any,p:ShapeParams):any {
  switch(p.type){
    case "box":       return new T.BoxGeometry(p.width,p.height,p.depth);
    case "sphere":    return new T.SphereGeometry(p.radius,p.wSegs,p.hSegs);
    case "cylinder":  return new T.CylinderGeometry(p.rTop,p.rBot,p.height,p.segs);
    case "cone":      return new T.ConeGeometry(p.radius,p.height,p.segs);
    case "torus":     return new T.TorusGeometry(p.radius,p.tube,p.rSegs,p.tSegs);
    case "plane":     return new T.PlaneGeometry(p.width,p.height);
    case "ring":      return new T.RingGeometry(p.inner,p.outer,p.segs);
    case "torusKnot": return new T.TorusKnotGeometry(p.radius,p.tube,100,16,p.p,p.q);
    case "capsule":   return new T.CapsuleGeometry(p.radius,p.length,8,16);
  }
}
function defParams(t:ShapeType):ShapeParams {
  switch(t){
    case "box":       return {type:"box",width:1,height:1,depth:1};
    case "sphere":    return {type:"sphere",radius:0.6,wSegs:32,hSegs:16};
    case "cylinder":  return {type:"cylinder",rTop:0.4,rBot:0.4,height:1,segs:32};
    case "cone":      return {type:"cone",radius:0.5,height:1,segs:32};
    case "torus":     return {type:"torus",radius:0.5,tube:0.18,rSegs:16,tSegs:100};
    case "plane":     return {type:"plane",width:2,height:2};
    case "ring":      return {type:"ring",inner:0.3,outer:0.6,segs:32};
    case "torusKnot": return {type:"torusKnot",radius:0.4,tube:0.12,p:2,q:3};
    case "capsule":   return {type:"capsule",radius:0.3,length:0.8};
  }
}
function defMat(i:number=0):Mat{return{color:COLORS[i%COLORS.length],roughness:0.5,metalness:0.0,opacity:1,wire:false};}
function r3(v:{x:number;y:number;z:number}){return{x:+v.x.toFixed(3),y:+v.y.toFixed(3),z:+v.z.toFixed(3)};}

/* ══════════════════════ BLENDER-STYLE UI COMPONENTS ═══════════════════════ */

function BNum({label,value,onChange,step=0.1,min}:{label:string;value:number;onChange:(v:number)=>void;step?:number;min?:number}){
  return(
    <div className="bl-row">
      <span className="bl-lbl">{label}</span>
      <input type="number" step={step} min={min} value={+value.toFixed(4)} className="bl-inp"
        onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))onChange(min!==undefined?Math.max(min,v):v);}}/>
    </div>
  );
}

function BSlider({label,value,min,max,step=0.01,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void}){
  return(
    <div className="bl-row">
      <span className="bl-lbl">{label}</span>
      <div style={{flex:1,display:"flex",alignItems:"center",gap:4}}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(parseFloat(e.target.value))} className="bl-slider"/>
        <span className="bl-slider-val">{value.toFixed(2)}</span>
      </div>
    </div>
  );
}

function BSection({label,children,open:initOpen=true}:{label:string;children:React.ReactNode;open?:boolean}){
  const[open,setOpen]=useState(initOpen);
  return(
    <div className="bl-sec">
      <button className="bl-sec-hdr" onClick={()=>setOpen(v=>!v)}>
        <span style={{marginRight:4,fontSize:8,transform:open?"rotate(90deg)":"rotate(0)",display:"inline-block",transition:"transform 0.15s"}}>▶</span>
        {label}
      </button>
      {open&&<div className="bl-sec-body">{children}</div>}
    </div>
  );
}

function ShapeParamsEditor({params,onChange}:{params:ShapeParams;onChange:(p:ShapeParams)=>void}){
  return(
    <div>
      {params.type==="box"&&(<>
        <BNum label="Width"  value={params.width}  min={0.01} onChange={v=>onChange({...params,width:v})}/>
        <BNum label="Height" value={params.height} min={0.01} onChange={v=>onChange({...params,height:v})}/>
        <BNum label="Depth"  value={params.depth}  min={0.01} onChange={v=>onChange({...params,depth:v})}/>
      </>)}
      {params.type==="sphere"&&(<>
        <BNum label="Radius"  value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="W Segs"  value={params.wSegs}  min={3} step={1} onChange={v=>onChange({...params,wSegs:Math.round(v)})}/>
        <BNum label="H Segs"  value={params.hSegs}  min={2} step={1} onChange={v=>onChange({...params,hSegs:Math.round(v)})}/>
      </>)}
      {params.type==="cylinder"&&(<>
        <BNum label="Radius Top" value={params.rTop}   min={0}    onChange={v=>onChange({...params,rTop:v})}/>
        <BNum label="Radius Bot" value={params.rBot}   min={0}    onChange={v=>onChange({...params,rBot:v})}/>
        <BNum label="Height"     value={params.height} min={0.01} onChange={v=>onChange({...params,height:v})}/>
        <BNum label="Segments"   value={params.segs}   min={3} step={1} onChange={v=>onChange({...params,segs:Math.round(v)})}/>
      </>)}
      {params.type==="cone"&&(<>
        <BNum label="Radius"   value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="Height"   value={params.height} min={0.01} onChange={v=>onChange({...params,height:v})}/>
        <BNum label="Segments" value={params.segs}   min={3} step={1} onChange={v=>onChange({...params,segs:Math.round(v)})}/>
      </>)}
      {params.type==="torus"&&(<>
        <BNum label="Radius"   value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="Tube"     value={params.tube}   min={0.01} onChange={v=>onChange({...params,tube:v})}/>
        <BNum label="R Segs"   value={params.rSegs}  min={3} step={1} onChange={v=>onChange({...params,rSegs:Math.round(v)})}/>
        <BNum label="T Segs"   value={params.tSegs}  min={3} step={1} onChange={v=>onChange({...params,tSegs:Math.round(v)})}/>
      </>)}
      {params.type==="plane"&&(<>
        <BNum label="Width"  value={params.width}  min={0.01} onChange={v=>onChange({...params,width:v})}/>
        <BNum label="Height" value={params.height} min={0.01} onChange={v=>onChange({...params,height:v})}/>
      </>)}
      {params.type==="ring"&&(<>
        <BNum label="Inner R"  value={params.inner} min={0.01} onChange={v=>onChange({...params,inner:v})}/>
        <BNum label="Outer R"  value={params.outer} min={0.01} onChange={v=>onChange({...params,outer:v})}/>
        <BNum label="Segments" value={params.segs}  min={3} step={1} onChange={v=>onChange({...params,segs:Math.round(v)})}/>
      </>)}
      {params.type==="torusKnot"&&(<>
        <BNum label="Radius" value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="Tube"   value={params.tube}   min={0.01} onChange={v=>onChange({...params,tube:v})}/>
        <BNum label="P"      value={params.p}      min={1} step={1} onChange={v=>onChange({...params,p:Math.round(v)})}/>
        <BNum label="Q"      value={params.q}      min={1} step={1} onChange={v=>onChange({...params,q:Math.round(v)})}/>
      </>)}
      {params.type==="capsule"&&(<>
        <BNum label="Radius" value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="Length" value={params.length} min={0.01} onChange={v=>onChange({...params,length:v})}/>
      </>)}
    </div>
  );
}

/* ═══════════════════════════ MAIN COMPONENT ════════════════════════════════ */

export function CadEditor({userEmail}:{userEmail:string}){
  const router=useRouter();
  const containerRef=useRef<HTMLDivElement>(null);
  const THREERef=useRef<any>(null); const sceneRef=useRef<any>(null);
  const rendRef=useRef<any>(null);  const rafRef=useRef(0);
  const meshMapRef=useRef<Map<string,any>>(new Map());
  const gridRef=useRef<any>(null);  const tcRef=useRef<any>(null);
  const camRef=useRef<any>(null);   const orbitRef=useRef<any>(null);

  const[shapes,setShapes]=useState<Shape[]>([]);
  const[selectedIds,setSelectedIds]=useState<Set<string>>(new Set());
  const[mode,setMode]=useState<TransformMode>("translate");
  const[viewMode,setViewMode]=useState<ViewMode>("solid");
  const[snapEnabled,setSnapEnabled]=useState(false);
  const[snapSize,setSnapSize]=useState(0.25);
  const[showGrid,setShowGrid]=useState(true);
  const[npTab,setNpTab]=useState<"item"|"material"|"object"|"scene">("item");
  const[history,setHistory]=useState<Shape[][]>([[]]);
  const[histIdx,setHistIdx]=useState(0);
  const[bbInfo,setBbInfo]=useState<{w:number;h:number;d:number}|null>(null);
  const[localSpace,setLocalSpace]=useState(true);
  const[isExporting,setIsExporting]=useState(false);
  const[arrayModal,setArrayModal]=useState(false);
  const[arrayAxis,setArrayAxis]=useState<"x"|"y"|"z">("x");
  const[arrayCount,setArrayCount]=useState(3);
  const[arraySpacing,setArraySpacing]=useState(2);
  const[openMenu,setOpenMenu]=useState<string|null>(null);

  const selectedIdsRef=useRef<Set<string>>(new Set());
  const shapesRef=useRef<Shape[]>([]);
  const historyRef=useRef<Shape[][]>([[]]);
  const histIdxRef=useRef(0);
  const snapRef=useRef(false);
  const snapSzRef=useRef(0.25);
  const viewModeRef=useRef<ViewMode>("solid");

  useEffect(()=>{selectedIdsRef.current=selectedIds;},[selectedIds]);
  useEffect(()=>{shapesRef.current=shapes;},[shapes]);
  useEffect(()=>{historyRef.current=history;},[history]);
  useEffect(()=>{histIdxRef.current=histIdx;},[histIdx]);
  useEffect(()=>{snapRef.current=snapEnabled;},[snapEnabled]);
  useEffect(()=>{snapSzRef.current=snapSize;},[snapSize]);
  useEffect(()=>{viewModeRef.current=viewMode;},[viewMode]);
  useEffect(()=>{tcRef.current?.setMode(mode);},[mode]);
  useEffect(()=>{tcRef.current?.setSpace(localSpace?"local":"world");},[localSpace]);
  useEffect(()=>{if(gridRef.current)gridRef.current.visible=showGrid;},[showGrid]);
  useEffect(()=>{
    for(const[id,mesh]of meshMapRef.current){
      const s=shapesRef.current.find(x=>x.id===id);
      applyView(mesh,viewMode,s?.mat);
    }
  },[viewMode]);

  useEffect(()=>{
    if(!containerRef.current)return;
    let disposed=false; let onDown:any,onUp:any,ro:ResizeObserver;
    (async()=>{
      const T=await import("three");
      const{OrbitControls}=await import("three/examples/jsm/controls/OrbitControls.js");
      const{TransformControls}=await import("three/examples/jsm/controls/TransformControls.js");
      if(disposed||!containerRef.current)return;
      THREERef.current=T;
      const scene=new T.Scene();
      scene.background=new T.Color(0x3d3d3d);
      sceneRef.current=scene;
      const amb=new T.AmbientLight(0xffffff,0.6); scene.add(amb);
      const sun=new T.DirectionalLight(0xffffff,1.1); sun.position.set(10,16,8);
      sun.castShadow=true; sun.shadow.mapSize.setScalar(2048);
      sun.shadow.camera.near=0.1; sun.shadow.camera.far=100;
      sun.shadow.camera.left=-15; sun.shadow.camera.right=15;
      sun.shadow.camera.top=15; sun.shadow.camera.bottom=-15;
      scene.add(sun);
      (()=>{const _dl=new T.DirectionalLight(0xaabbff,0.2);_dl.position.set(-6,4,-8);scene.add(_dl);})();
      const grid=new T.GridHelper(40,40,0x555555,0x444444); scene.add(grid); gridRef.current=grid;
      const mkLine=(pts:number[][],col:number)=>{
        const geo=new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(p[0],p[1],p[2])));
        return new T.Line(geo,new T.LineBasicMaterial({color:col,depthTest:false}));
      };
      scene.add(mkLine([[-20,0.001,0],[20,0.001,0]],0xff3333));
      scene.add(mkLine([[0,0.001,-20],[0,0.001,20]],0x3333ff));
      const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.ShadowMaterial({opacity:0.2}));
      floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; floor.userData.isHelper=true; scene.add(floor);
      const w=containerRef.current.clientWidth; const h=containerRef.current.clientHeight;
      const ren=new T.WebGLRenderer({antialias:true});
      ren.setPixelRatio(Math.min(devicePixelRatio,2)); ren.shadowMap.enabled=true; ren.setSize(w,h);
      containerRef.current.replaceChildren(ren.domElement); rendRef.current=ren;
      const cam=new T.PerspectiveCamera(50,w/h,0.01,1000);
      cam.position.set(7,5,7); cam.lookAt(0,0,0); camRef.current=cam;
      const orbit=new OrbitControls(cam,ren.domElement);
      orbit.enableDamping=true; orbit.dampingFactor=0.06; orbitRef.current=orbit;
      const tc=new TransformControls(cam,ren.domElement);
      tc.setMode("translate"); tc.setSize(0.8);
      tc.addEventListener("dragging-changed",(e:any)=>{
        orbit.enabled=!e.value;
        if(!e.value){
          const id=[...selectedIdsRef.current][0]; if(!id)return;
          const mesh=meshMapRef.current.get(id); if(!mesh)return;
          if(snapRef.current){const sz=snapSzRef.current;
            mesh.position.x=Math.round(mesh.position.x/sz)*sz;
            mesh.position.y=Math.round(mesh.position.y/sz)*sz;
            mesh.position.z=Math.round(mesh.position.z/sz)*sz;}
          pushHistoryRef.current(shapesRef.current);
        }
      });
      tc.addEventListener("change",()=>{
        const T2=THREERef.current; const id=[...selectedIdsRef.current][0];
        if(!id||!T2)return; const mesh=meshMapRef.current.get(id); if(!mesh)return;
        setShapes(prev=>prev.map(s=>s.id!==id?s:{...s,
          pos:r3(mesh.position),
          rot:{x:+T2.MathUtils.radToDeg(mesh.rotation.x).toFixed(2),y:+T2.MathUtils.radToDeg(mesh.rotation.y).toFixed(2),z:+T2.MathUtils.radToDeg(mesh.rotation.z).toFixed(2)},
          scl:r3(mesh.scale)}));
        updateBBRef.current(mesh);
      });
      scene.add(tc as any); tcRef.current=tc;
      const ray=new T.Raycaster(); const ptr=new T.Vector2(); let pdX=0,pdY=0;
      onDown=(e:PointerEvent)=>{pdX=e.clientX;pdY=e.clientY;};
      onUp=(e:PointerEvent)=>{
        if(e.button!==0)return;
        if(Math.hypot(e.clientX-pdX,e.clientY-pdY)>6)return;
        const rect=ren.domElement.getBoundingClientRect();
        ptr.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
        ray.setFromCamera(ptr,cam);
        if(tc.object){const h=ray.intersectObject(tc as any,true);if(h.length>0)return;}
        const hits=ray.intersectObjects([...meshMapRef.current.values()],false);
        if(hits.length>0){
          const hit=hits[0].object;
          const entry=[...meshMapRef.current.entries()].find(([,m])=>m===hit);
          if(!entry)return; const[id]=entry;
          const shape=shapesRef.current.find(s=>s.id===id);
          if(shape?.locked)return;
          if(e.shiftKey){
            const ns=new Set(selectedIdsRef.current);
            ns.has(id)?ns.delete(id):ns.add(id); setSelectedIds(ns);
            const lastId=[...ns].at(-1);
            if(lastId){const m=meshMapRef.current.get(lastId);if(m)tc.attach(m);}else tc.detach();
          }else{setSelectedIds(new Set([id]));tc.attach(hit);updateBBRef.current(hit);}
        }else if(!e.shiftKey){tc.detach();setSelectedIds(new Set());setBbInfo(null);}
      };
      ren.domElement.addEventListener("pointerdown",onDown);
      ren.domElement.addEventListener("pointerup",onUp);
      ro=new ResizeObserver(()=>{
        if(disposed||!containerRef.current)return;
        const nw=containerRef.current.clientWidth; const nh=containerRef.current.clientHeight;
        cam.aspect=nw/nh; cam.updateProjectionMatrix(); ren.setSize(nw,nh);
      });
      ro.observe(containerRef.current);
      const loop=()=>{if(disposed)return;rafRef.current=requestAnimationFrame(loop);orbit.update();ren.render(scene,cam);};
      loop();
    })();
    return()=>{disposed=true;cancelAnimationFrame(rafRef.current);
      rendRef.current?.domElement.removeEventListener("pointerdown",onDown);
      rendRef.current?.domElement.removeEventListener("pointerup",onUp);
      ro?.disconnect();tcRef.current?.dispose();orbitRef.current?.dispose();rendRef.current?.dispose();};
  },[]);

  function applyView(mesh:any,vm:ViewMode,mat?:Mat){
    if(!mesh?.material)return;
    const m=mesh.material;
    m.wireframe=vm==="wireframe"||!!mat?.wire;
    m.transparent=vm==="xray"||(mat?.opacity??1)<1;
    m.opacity=vm==="xray"?0.3:(mat?.opacity??1);
    m.depthWrite=vm!=="xray"; m.needsUpdate=true;
  }

  const updateBBRef=useRef((mesh:any)=>{
    const T=THREERef.current;
    if(!T||!mesh){setBbInfo(null);return;}
    const bb=new T.Box3().setFromObject(mesh);
    const sz=new T.Vector3(); bb.getSize(sz);
    setBbInfo({w:+sz.x.toFixed(3),h:+sz.y.toFixed(3),d:+sz.z.toFixed(3)});
  });

  const pushHistoryRef=useRef((ns:Shape[])=>{
    const h=historyRef.current.slice(0,histIdxRef.current+1);
    const next=[...h,ns.map(s=>({...s}))];
    if(next.length>52)next.shift();
    historyRef.current=next; histIdxRef.current=next.length-1;
    setHistory([...next]); setHistIdx(next.length-1);
  });

  const restoreShapes=useCallback((target:Shape[])=>{
    const T=THREERef.current; if(!T||!sceneRef.current)return;
    for(const[,mesh]of meshMapRef.current){
      sceneRef.current.remove(mesh); mesh.geometry?.dispose();
      (Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach((m:any)=>m?.dispose());
    }
    meshMapRef.current.clear(); tcRef.current?.detach();
    target.forEach(s=>{
      const geo=makeGeo(T,s.params);
      const tMat=new T.MeshStandardMaterial({color:s.mat.color,roughness:s.mat.roughness,metalness:s.mat.metalness,opacity:s.mat.opacity,transparent:s.mat.opacity<1,wireframe:s.mat.wire});
      const mesh=new T.Mesh(geo,tMat);
      mesh.castShadow=true; mesh.receiveShadow=true;
      mesh.position.set(s.pos.x,s.pos.y,s.pos.z);
      mesh.rotation.set(T.MathUtils.degToRad(s.rot.x),T.MathUtils.degToRad(s.rot.y),T.MathUtils.degToRad(s.rot.z));
      mesh.scale.set(s.scl.x,s.scl.y,s.scl.z); mesh.visible=s.visible;
      sceneRef.current.add(mesh); meshMapRef.current.set(s.id,mesh);
    });
    setShapes(target.map(s=>({...s}))); setSelectedIds(new Set()); setBbInfo(null);
  },[]);

  const addShape=useCallback((type:ShapeType)=>{
    const T=THREERef.current; if(!T||!sceneRef.current)return;
    const id=uid(); const count=meshMapRef.current.size;
    const mat=defMat(count); const params=defParams(type);
    const tMat=new T.MeshStandardMaterial({color:mat.color,roughness:mat.roughness,metalness:mat.metalness});
    const mesh=new T.Mesh(makeGeo(T,params),tMat);
    mesh.castShadow=true; mesh.receiveShadow=true;
    const off=count*0.4; mesh.position.set(off%3,0,Math.floor(off/3)*0.5);
    const bb=new T.Box3().setFromObject(mesh); mesh.position.y-=bb.min.y;
    sceneRef.current.add(mesh); meshMapRef.current.set(id,mesh);
    const shape:Shape={id,name:`${type.charAt(0).toUpperCase()}${type.slice(1)} ${_ctr}`,mat,params,
      pos:r3(mesh.position),rot:{x:0,y:0,z:0},scl:{x:1,y:1,z:1},visible:true,locked:false};
    const next=[...shapesRef.current,shape];
    setShapes(next); setSelectedIds(new Set([id]));
    tcRef.current?.attach(mesh); updateBBRef.current(mesh); pushHistoryRef.current(next);
    setOpenMenu(null);
  },[]);

  const deleteSelected=useCallback(()=>{
    const ids=selectedIdsRef.current; if(!ids.size)return;
    ids.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      sceneRef.current?.remove(mesh); mesh.geometry?.dispose();
      (Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach((m:any)=>m?.dispose());
      meshMapRef.current.delete(id);
    });
    tcRef.current?.detach();
    const next=shapesRef.current.filter(s=>!ids.has(s.id));
    setShapes(next); setSelectedIds(new Set()); setBbInfo(null); pushHistoryRef.current(next);
  },[]);

  const duplicateSelected=useCallback(()=>{
    const ids=selectedIdsRef.current; if(!ids.size||!sceneRef.current)return;
    const T=THREERef.current; if(!T)return;
    const next=[...shapesRef.current]; const newIds=new Set<string>();
    ids.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      const orig=shapesRef.current.find(s=>s.id===id); if(!orig)return;
      const nid=uid(); const nm=mesh.clone(); nm.position.x+=1.5;
      sceneRef.current.add(nm); meshMapRef.current.set(nid,nm);
      next.push({...orig,id:nid,name:orig.name+" copy",pos:{...orig.pos,x:+(orig.pos.x+1.5).toFixed(3)}});
      newIds.add(nid);
    });
    tcRef.current?.detach();
    const lastId=[...newIds].at(-1);
    if(lastId){const m=meshMapRef.current.get(lastId);if(m)tcRef.current?.attach(m);}
    setShapes(next); setSelectedIds(newIds); pushHistoryRef.current(next);
  },[]);

  const updateMat=useCallback((id:string,patch:Partial<Mat>)=>{
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    const m=mesh.material;
    setShapes(prev=>prev.map(s=>{
      if(s.id!==id)return s;
      const nm={...s.mat,...patch};
      if(patch.color!==undefined)m.color.set(patch.color);
      if(patch.roughness!==undefined)m.roughness=patch.roughness;
      if(patch.metalness!==undefined)m.metalness=patch.metalness;
      if(patch.opacity!==undefined){m.opacity=patch.opacity;m.transparent=patch.opacity<1||viewModeRef.current==="xray";m.needsUpdate=true;}
      if(patch.wire!==undefined){m.wireframe=patch.wire;m.needsUpdate=true;}
      return{...s,mat:nm};
    }));
  },[]);

  const updateParams=useCallback((id:string,params:ShapeParams)=>{
    const T=THREERef.current; const mesh=meshMapRef.current.get(id);
    if(!T||!mesh)return;
    mesh.geometry.dispose(); mesh.geometry=makeGeo(T,params);
    setShapes(prev=>prev.map(s=>s.id===id?{...s,params}:s));
    updateBBRef.current(mesh);
  },[]);

  const setPos=useCallback((id:string,axis:"x"|"y"|"z",val:number)=>{
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    mesh.position[axis]=val;
    setShapes(prev=>prev.map(s=>s.id===id?{...s,pos:{...s.pos,[axis]:val}}:s));
    updateBBRef.current(mesh);
  },[]);
  const setRot=useCallback((id:string,axis:"x"|"y"|"z",deg:number)=>{
    const T=THREERef.current; if(!T)return;
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    mesh.rotation[axis]=T.MathUtils.degToRad(deg);
    setShapes(prev=>prev.map(s=>s.id===id?{...s,rot:{...s.rot,[axis]:deg}}:s));
  },[]);
  const setScl=useCallback((id:string,axis:"x"|"y"|"z",val:number)=>{
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    mesh.scale[axis]=val;
    setShapes(prev=>prev.map(s=>s.id===id?{...s,scl:{...s.scl,[axis]:val}}:s));
    updateBBRef.current(mesh);
  },[]);
  const toggleVisible=useCallback((id:string)=>{
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    setShapes(prev=>prev.map(s=>{if(s.id!==id)return s;mesh.visible=!s.visible;return{...s,visible:!s.visible};}));
  },[]);
  const toggleLock=useCallback((id:string)=>{
    setShapes(prev=>prev.map(s=>{
      if(s.id!==id)return s;
      if(!s.locked&&selectedIdsRef.current.has(id)){
        setSelectedIds(p=>{const n=new Set(p);n.delete(id);return n;});tcRef.current?.detach();}
      return{...s,locked:!s.locked};
    }));
  },[]);
  const renameShape=useCallback((id:string,name:string)=>{
    setShapes(prev=>prev.map(s=>s.id===id?{...s,name}:s));
  },[]);
  const undo=useCallback(()=>{
    const idx=histIdxRef.current; if(idx<=0)return;
    const ni=idx-1; restoreShapes(historyRef.current[ni]); histIdxRef.current=ni; setHistIdx(ni);
  },[restoreShapes]);
  const redo=useCallback(()=>{
    const idx=histIdxRef.current; const h=historyRef.current;
    if(idx>=h.length-1)return;
    const ni=idx+1; restoreShapes(h[ni]); histIdxRef.current=ni; setHistIdx(ni);
  },[restoreShapes]);
  const selectAll=useCallback(()=>{
    const ids=new Set(shapesRef.current.filter(s=>!s.locked).map(s=>s.id)); setSelectedIds(ids);
    const lastId=[...ids].at(-1);
    if(lastId){const m=meshMapRef.current.get(lastId);if(m)tcRef.current?.attach(m);}
  },[]);
  const centerSelected=useCallback(()=>{
    selectedIdsRef.current.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      mesh.position.set(0,mesh.position.y,0);
      setShapes(prev=>prev.map(s=>s.id===id?{...s,pos:{x:0,y:s.pos.y,z:0}}:s));
    });
    pushHistoryRef.current(shapesRef.current);
  },[]);
  const mirrorSelected=useCallback((axis:"x"|"y"|"z")=>{
    selectedIdsRef.current.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      mesh.scale[axis]*=-1;
      setShapes(prev=>prev.map(s=>s.id===id?{...s,scl:{...s.scl,[axis]:s.scl[axis]*-1}}:s));
    });
    pushHistoryRef.current(shapesRef.current);
  },[]);
  const flattenToGround=useCallback(()=>{
    const T=THREERef.current; if(!T)return;
    selectedIdsRef.current.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      const bb=new T.Box3().setFromObject(mesh); mesh.position.y-=bb.min.y;
      setShapes(prev=>prev.map(s=>s.id===id?{...s,pos:{...s.pos,y:+mesh.position.y.toFixed(3)}}:s));
    });
    pushHistoryRef.current(shapesRef.current);
  },[]);
  const applyArray=useCallback(()=>{
    const ids=selectedIdsRef.current; if(!ids.size||!sceneRef.current)return;
    const T=THREERef.current; if(!T)return;
    const next=[...shapesRef.current];
    ids.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      const orig=shapesRef.current.find(s=>s.id===id); if(!orig)return;
      for(let i=1;i<arrayCount;i++){
        const nid=uid(); const nm=mesh.clone();
        nm.position.copy(mesh.position); nm.position[arrayAxis]+=arraySpacing*i;
        sceneRef.current.add(nm); meshMapRef.current.set(nid,nm);
        next.push({...orig,id:nid,name:`${orig.name}[${i}]`,pos:{...orig.pos,[arrayAxis]:+(orig.pos[arrayAxis]+arraySpacing*i).toFixed(3)}});
      }
    });
    setShapes(next); setArrayModal(false); pushHistoryRef.current(next);
  },[arrayAxis,arrayCount,arraySpacing]);

  const importSTL=useCallback(async(file:File)=>{
    const T=THREERef.current; if(!T||!sceneRef.current)return;
    const{STLLoader}=await import("three/examples/jsm/loaders/STLLoader.js");
    const geo=new STLLoader().parse(await file.arrayBuffer());
    geo.computeVertexNormals(); geo.center();
    const tMat=new T.MeshStandardMaterial({color:"#8888aa",roughness:0.5,metalness:0.0});
    const mesh=new T.Mesh(geo,tMat); mesh.castShadow=true; mesh.receiveShadow=true;
    const bb=new T.Box3().setFromObject(mesh); mesh.position.y=-bb.min.y;
    sceneRef.current.add(mesh); const id=uid(); meshMapRef.current.set(id,mesh);
    const shape:Shape={id,name:file.name.replace(/\.stl$/i,""),
      mat:{color:"#8888aa",roughness:0.5,metalness:0.0,opacity:1,wire:false},
      params:{type:"box",width:1,height:1,depth:1},
      pos:r3(mesh.position),rot:{x:0,y:0,z:0},scl:{x:1,y:1,z:1},visible:true,locked:false};
    const next=[...shapesRef.current,shape];
    setShapes(next); setSelectedIds(new Set([id]));
    tcRef.current?.attach(mesh); updateBBRef.current(mesh); pushHistoryRef.current(next);
  },[]);

  const exportSTL=useCallback(async()=>{
    if(meshMapRef.current.size===0)return; setIsExporting(true);
    const T=THREERef.current;
    const{STLExporter}=await import("three/examples/jsm/exporters/STLExporter.js");
    const tmp=new T.Scene();
    for(const mesh of meshMapRef.current.values())tmp.add(mesh.clone());
    const result=new STLExporter().parse(tmp,{binary:true}) as DataView;
    const url=URL.createObjectURL(new Blob([result.buffer],{type:"model/stl"}));
    Object.assign(document.createElement("a"),{href:url,download:"model.stl"}).click();
    URL.revokeObjectURL(url); setIsExporting(false);
  },[]);

  const exportOBJ=useCallback(async()=>{
    if(meshMapRef.current.size===0)return; setIsExporting(true);
    const T=THREERef.current;
    const{OBJExporter}=await import("three/examples/jsm/exporters/OBJExporter.js");
    const tmp=new T.Scene();
    for(const mesh of meshMapRef.current.values())tmp.add(mesh.clone());
    const result=new OBJExporter().parse(tmp);
    const url=URL.createObjectURL(new Blob([result],{type:"text/plain"}));
    Object.assign(document.createElement("a"),{href:url,download:"model.obj"}).click();
    URL.revokeObjectURL(url); setIsExporting(false);
  },[]);

  const submitPrint=useCallback(async()=>{
    if(meshMapRef.current.size===0)return; setIsExporting(true);
    const T=THREERef.current;
    const{STLExporter}=await import("three/examples/jsm/exporters/STLExporter.js");
    const tmp=new T.Scene();
    for(const mesh of meshMapRef.current.values())tmp.add(mesh.clone());
    const result=new STLExporter().parse(tmp,{binary:true}) as DataView;
    const bytes=new Uint8Array(result.buffer);
    let str=""; for(let i=0;i<bytes.length;i++)str+=String.fromCharCode(bytes[i]);
    try{sessionStorage.setItem("cad_stl",btoa(str));sessionStorage.setItem("cad_filename","cad-model.stl");}catch{}
    setIsExporting(false); router.push("/custom-print");
  },[router]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement)?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA")return;
      if(e.key==="g"||e.key==="G")setMode("translate");
      if(e.key==="r"||e.key==="R")setMode("rotate");
      if(e.key==="s"||e.key==="S")setMode("scale");
      if(e.key==="f"||e.key==="F")flattenToGround();
      if(e.key==="Delete"||e.key==="Backspace")deleteSelected();
      if((e.ctrlKey||e.metaKey)&&(e.key==="d"||e.key==="D")){e.preventDefault();duplicateSelected();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="z"||e.key==="Z")){e.preventDefault();e.shiftKey?redo():undo();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="y"||e.key==="Y")){e.preventDefault();redo();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="a"||e.key==="A")){e.preventDefault();selectAll();}
      if(e.key==="Escape"){tcRef.current?.detach();setSelectedIds(new Set());setBbInfo(null);}
      if(openMenu)setOpenMenu(null);
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[deleteSelected,duplicateSelected,undo,redo,selectAll,flattenToGround,openMenu]);

  const primary=shapes.find(s=>selectedIds.has(s.id))||null;
  const isEmpty=shapes.length===0;
  const SHAPES:[ShapeType,string,string][]=[
    ["box","☐","Box"],["sphere","○","Sphere"],["cylinder","⌭","Cylinder"],
    ["cone","△","Cone"],["torus","◎","Torus"],["plane","▭","Plane"],
    ["ring","⊙","Ring"],["torusKnot","✦","Torus Knot"],["capsule","⊓","Capsule"],
  ];

  return(
    <div className="bl-root" onClick={()=>openMenu&&setOpenMenu(null)}>

      {/* ═══ TOP MENU BAR ═══ */}
      <div className="bl-menubar">
        <div className="bl-mode-pill">Object Mode</div>
        <div className="bl-menubar-divider"/>

        {/* File menu */}
        <div className="bl-menu-item" onClick={e=>e.stopPropagation()}>
          <button className="bl-menu-btn" onClick={()=>setOpenMenu(openMenu==="file"?null:"file")}>File</button>
          {openMenu==="file"&&(
            <div className="bl-dropdown">
              <label className="bl-dd-item cursor-pointer">
                📂 Import STL…
                <input type="file" accept=".stl" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)importSTL(f);e.target.value="";setOpenMenu(null);}}/>
              </label>
              <div className="bl-dd-sep"/>
              <button className="bl-dd-item" onClick={()=>{exportSTL();setOpenMenu(null);}}>⬇ Export STL</button>
              <button className="bl-dd-item" onClick={()=>{exportOBJ();setOpenMenu(null);}}>⬇ Export OBJ</button>
            </div>
          )}
        </div>

        {/* Edit menu */}
        <div className="bl-menu-item" onClick={e=>e.stopPropagation()}>
          <button className="bl-menu-btn" onClick={()=>setOpenMenu(openMenu==="edit"?null:"edit")}>Edit</button>
          {openMenu==="edit"&&(
            <div className="bl-dropdown">
              <button className="bl-dd-item" disabled={histIdx<=0} onClick={()=>{undo();setOpenMenu(null);}}>↩ Undo  <span className="bl-dd-key">⌘Z</span></button>
              <button className="bl-dd-item" disabled={histIdx>=history.length-1} onClick={()=>{redo();setOpenMenu(null);}}>↪ Redo  <span className="bl-dd-key">⌘Y</span></button>
              <div className="bl-dd-sep"/>
              <button className="bl-dd-item" onClick={()=>{selectAll();setOpenMenu(null);}}>Select All  <span className="bl-dd-key">⌘A</span></button>
            </div>
          )}
        </div>

        {/* Add menu */}
        <div className="bl-menu-item" onClick={e=>e.stopPropagation()}>
          <button className="bl-menu-btn" onClick={()=>setOpenMenu(openMenu==="add"?null:"add")}>Add</button>
          {openMenu==="add"&&(
            <div className="bl-dropdown">
              <div className="bl-dd-category">Mesh</div>
              {SHAPES.map(([type,,label])=>(
                <button key={type} className="bl-dd-item" onClick={()=>addShape(type)}>{label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Object menu */}
        <div className="bl-menu-item" onClick={e=>e.stopPropagation()}>
          <button className="bl-menu-btn" onClick={()=>setOpenMenu(openMenu==="object"?null:"object")}>Object</button>
          {openMenu==="object"&&(
            <div className="bl-dropdown">
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{duplicateSelected();setOpenMenu(null);}}>⊕ Duplicate  <span className="bl-dd-key">⌘D</span></button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{deleteSelected();setOpenMenu(null);}}>✕ Delete  <span className="bl-dd-key">Del</span></button>
              <div className="bl-dd-sep"/>
              <div className="bl-dd-category">Mirror</div>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{mirrorSelected("x");setOpenMenu(null);}}>Mirror X</button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{mirrorSelected("y");setOpenMenu(null);}}>Mirror Y</button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{mirrorSelected("z");setOpenMenu(null);}}>Mirror Z</button>
              <div className="bl-dd-sep"/>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{centerSelected();setOpenMenu(null);}}>⊙ Center</button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{flattenToGround();setOpenMenu(null);}}>⬇ To Ground</button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{setArrayModal(true);setOpenMenu(null);}}>⁝ Array…</button>
            </div>
          )}
        </div>

        <div className="bl-menubar-divider"/>

        {/* View mode toggles (shading) */}
        <div className="bl-shading-group">
          {(["solid","wireframe","xray"] as const).map(vm=>(
            <button key={vm} onClick={()=>setViewMode(vm)}
              className={`bl-shade-btn ${viewMode===vm?"bl-shade-active":""}`}
              title={vm}>
              {vm==="solid"?"◼":vm==="wireframe"?"⊡":"◻"}
            </button>
          ))}
        </div>

        {/* Snap */}
        <button onClick={()=>setSnapEnabled(v=>!v)}
          className={`bl-snap-btn ${snapEnabled?"bl-snap-on":""}`} title="Snap to grid (toggle)">
          🧲
        </button>
        {snapEnabled&&(
          <select value={snapSize} onChange={e=>setSnapSize(parseFloat(e.target.value))} className="bl-snap-sel">
            {[0.1,0.25,0.5,1,2].map(v=><option key={v} value={v}>{v}u</option>)}
          </select>
        )}

        <div className="bl-menubar-spacer"/>

        {/* Print button */}
        <button onClick={submitPrint} disabled={isEmpty||isExporting} className="bl-print-btn">
          🖨 Request Print Quote
        </button>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div className="bl-main">

        {/* ─── LEFT TOOLBAR (T-panel) ─── */}
        <div className="bl-toolbar">
          <div className="bl-tool-group">
            <button onClick={()=>setMode("translate")} className={`bl-tool ${mode==="translate"?"bl-tool-on":""}`} title="Move (G)">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M9 1l2 3H10v4h4V7l3 2-3 2v-1H10v4h1l-2 3-2-3h1v-4H4v1L1 9l3-2v1h4V4H7L9 1z"/>
              </svg>
              <span>Move</span>
            </button>
            <button onClick={()=>setMode("rotate")} className={`bl-tool ${mode==="rotate"?"bl-tool-on":""}`} title="Rotate (R)">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4.5 4.5A6 6 0 0 1 15 9" strokeLinecap="round"/>
                <path d="M13 9l2-2.5L13 4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 13.5A6 6 0 0 1 3 9" strokeLinecap="round"/>
                <path d="M5 9L3 11.5 5 14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Rotate</span>
            </button>
            <button onClick={()=>setMode("scale")} className={`bl-tool ${mode==="scale"?"bl-tool-on":""}`} title="Scale (S)">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect x="7" y="7" width="4" height="4" opacity="0.8"/>
                <path d="M2 2h5v1.5H3.5V7H2V2zM11 2h5v5h-1.5V3.5H11V2zM2 11h1.5v3.5H7V16H2v-5zM14.5 11H16v5h-5v-1.5h3.5V11z" opacity="0.6"/>
              </svg>
              <span>Scale</span>
            </button>
          </div>
          <div className="bl-tool-sep"/>
          <div className="bl-tool-group">
            <button onClick={()=>setLocalSpace(v=>!v)} className={`bl-tool ${localSpace?"bl-tool-on":""}`} title="Transform space">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="9" r="6"/>
                <path d="M9 3v12M3 9h12" opacity="0.5"/>
              </svg>
              <span>{localSpace?"Local":"World"}</span>
            </button>
          </div>
          <div className="bl-tool-sep"/>
          <div className="bl-tool-group">
            <button onClick={()=>setShowGrid(v=>!v)} className={`bl-tool ${showGrid?"bl-tool-on":""}`} title="Toggle grid">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M2 6h14M2 12h14M6 2v14M12 2v14" opacity="0.7"/>
              </svg>
              <span>Grid</span>
            </button>
          </div>
          <div className="bl-tool-sep"/>
          <div className="bl-tool-group">
            <button onClick={undo} disabled={histIdx<=0} className="bl-tool" title="Undo ⌘Z">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9a6 6 0 0 1 6-6h4" strokeLinecap="round"/>
                <path d="M6 6L3 9l3 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Undo</span>
            </button>
            <button onClick={redo} disabled={histIdx>=history.length-1} className="bl-tool" title="Redo ⌘Y">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 9a6 6 0 0 0-6-6H5" strokeLinecap="round"/>
                <path d="M12 6l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Redo</span>
            </button>
          </div>
        </div>

        {/* ─── VIEWPORT ─── */}
        <div className="bl-vp-wrap">
          <div ref={containerRef} className="bl-vp"/>

          {/* Corner overlays */}
          <div className="bl-vp-tl">Perspective</div>
          <div className="bl-vp-bl">{viewMode==="solid"?"Solid":viewMode==="wireframe"?"Wireframe":"X-Ray"}</div>

          {/* Axis gizmo */}
          <div className="bl-gizmo">
            <svg width="64" height="64" viewBox="-32 -32 64 64">
              <line x1="0" y1="0" x2="22" y2="0" stroke="#ff3333" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="26" cy="0" r="8" fill="#cc2222"/>
              <text x="26" y="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">X</text>
              <line x1="0" y1="0" x2="0" y2="-22" stroke="#33cc33" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="0" cy="-26" r="8" fill="#228822"/>
              <text x="0" y="-22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Y</text>
              <line x1="0" y1="0" x2="-16" y2="16" stroke="#3366ff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
              <circle cx="-19" cy="19" r="8" fill="#2244bb"/>
              <text x="-19" y="23" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Z</text>
            </svg>
          </div>

          {/* Viewport shading switcher (top-right corner, like Blender) */}
          <div className="bl-vp-shading">
            {(["solid","wireframe","xray"] as const).map(vm=>(
              <button key={vm} onClick={()=>setViewMode(vm)}
                className={`bl-vp-shade ${viewMode===vm?"bl-vp-shade-on":""}`} title={vm}>
                {vm==="solid"?"◼":vm==="wireframe"?"⊡":"◻"}
              </button>
            ))}
          </div>

          {isEmpty&&(
            <div className="bl-vp-empty">
              <div style={{fontSize:48,marginBottom:12}}>🪐</div>
              <div className="bl-vp-empty-title">No objects in scene</div>
              <div className="bl-vp-empty-sub">Use Add menu or press Shift+A</div>
              <div className="bl-vp-shortcuts">
                <div className="bl-shortcut-row"><span>G</span><span>Move</span></div>
                <div className="bl-shortcut-row"><span>R</span><span>Rotate</span></div>
                <div className="bl-shortcut-row"><span>S</span><span>Scale</span></div>
                <div className="bl-shortcut-row"><span>F</span><span>To Ground</span></div>
                <div className="bl-shortcut-row"><span>Del</span><span>Delete</span></div>
                <div className="bl-shortcut-row"><span>⌘D</span><span>Duplicate</span></div>
                <div className="bl-shortcut-row"><span>⌘Z</span><span>Undo</span></div>
                <div className="bl-shortcut-row"><span>⌘A</span><span>Select All</span></div>
              </div>
            </div>
          )}
          {bbInfo&&(
            <div className="bl-bb-info">
              <span>W: {bbInfo.w}</span>
              <span>H: {bbInfo.h}</span>
              <span>D: {bbInfo.d}</span>
            </div>
          )}
          {selectedIds.size>1&&(
            <div className="bl-multi-sel">{selectedIds.size} objects selected</div>
          )}
        </div>

        {/* ─── N-PANEL ─── */}
        <div className="bl-npanel">
          {/* Side tabs */}
          <div className="bl-nptabs">
            {(["item","material","object","scene"] as const).map(tab=>(
              <button key={tab} className={`bl-nptab ${npTab===tab?"bl-nptab-on":""}`} onClick={()=>setNpTab(tab)}>
                {tab==="item"?"Item":tab==="material"?"Mat":tab==="object"?"Obj":"Scene"}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="bl-npcontent">

            {/* ITEM TAB */}
            {npTab==="item"&&(
              !primary?(
                <div className="bl-np-empty">Nothing selected</div>
              ):(
                <>
                  <BSection label="Transform">
                    <div className="bl-xyz-group">
                      <div className="bl-xyz-label" style={{color:"#ff6b6b"}}>X</div>
                      <div className="bl-xyz-label" style={{color:"#6bcb77"}}>Y</div>
                      <div className="bl-xyz-label" style={{color:"#4d96ff"}}>Z</div>
                    </div>
                    <div className="bl-xyz-row">
                      <span className="bl-row-lbl">Location</span>
                      <input type="number" step={0.1} value={+primary.pos.x.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setPos(primary.id,"x",v);}} className="bl-xyz-inp bl-x"/>
                      <input type="number" step={0.1} value={+primary.pos.y.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setPos(primary.id,"y",v);}} className="bl-xyz-inp bl-y"/>
                      <input type="number" step={0.1} value={+primary.pos.z.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setPos(primary.id,"z",v);}} className="bl-xyz-inp bl-z"/>
                    </div>
                    <div className="bl-xyz-row">
                      <span className="bl-row-lbl">Rotation</span>
                      <input type="number" step={1} value={+primary.rot.x.toFixed(2)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setRot(primary.id,"x",v);}} className="bl-xyz-inp bl-x"/>
                      <input type="number" step={1} value={+primary.rot.y.toFixed(2)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setRot(primary.id,"y",v);}} className="bl-xyz-inp bl-y"/>
                      <input type="number" step={1} value={+primary.rot.z.toFixed(2)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setRot(primary.id,"z",v);}} className="bl-xyz-inp bl-z"/>
                    </div>
                    <div className="bl-xyz-row">
                      <span className="bl-row-lbl">Scale</span>
                      <input type="number" step={0.1} min={0.001} value={+primary.scl.x.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setScl(primary.id,"x",v);}} className="bl-xyz-inp bl-x"/>
                      <input type="number" step={0.1} min={0.001} value={+primary.scl.y.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setScl(primary.id,"y",v);}} className="bl-xyz-inp bl-y"/>
                      <input type="number" step={0.1} min={0.001} value={+primary.scl.z.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setScl(primary.id,"z",v);}} className="bl-xyz-inp bl-z"/>
                    </div>
                  </BSection>
                  {bbInfo&&(
                    <BSection label="Dimensions" open={false}>
                      <div className="bl-dim-row"><span className="bl-dim-lbl" style={{color:"#ff6b6b"}}>W</span><span className="bl-dim-val">{bbInfo.w}</span></div>
                      <div className="bl-dim-row"><span className="bl-dim-lbl" style={{color:"#6bcb77"}}>H</span><span className="bl-dim-val">{bbInfo.h}</span></div>
                      <div className="bl-dim-row"><span className="bl-dim-lbl" style={{color:"#4d96ff"}}>D</span><span className="bl-dim-val">{bbInfo.d}</span></div>
                    </BSection>
                  )}
                </>
              )
            )}

            {/* MATERIAL TAB */}
            {npTab==="material"&&(
              !primary?<div className="bl-np-empty">Nothing selected</div>:(
                <>
                  <BSection label="Surface">
                    <div className="bl-color-row">
                      <span className="bl-lbl">Base Color</span>
                      <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                        <input type="color" value={primary.mat.color}
                          onChange={e=>updateMat(primary.id,{color:e.target.value})}
                          style={{width:32,height:24,border:"1px solid #111",borderRadius:3,cursor:"pointer",padding:1,background:"transparent"}}/>
                        <span style={{fontSize:10,fontFamily:"monospace",color:"#8a8a8a"}}>{primary.mat.color.toUpperCase()}</span>
                      </div>
                    </div>
                    <BSlider label="Roughness" value={primary.mat.roughness} min={0} max={1} onChange={v=>updateMat(primary.id,{roughness:v})}/>
                    <BSlider label="Metallic"  value={primary.mat.metalness} min={0} max={1} onChange={v=>updateMat(primary.id,{metalness:v})}/>
                    <BSlider label="Alpha"     value={primary.mat.opacity}   min={0} max={1} onChange={v=>updateMat(primary.id,{opacity:v})}/>
                  </BSection>
                  <BSection label="Viewport Display" open={false}>
                    <label className="bl-check-row">
                      <input type="checkbox" checked={primary.mat.wire} onChange={e=>updateMat(primary.id,{wire:e.target.checked})} className="bl-check"/>
                      <span>Wireframe</span>
                    </label>
                  </BSection>
                  <BSection label="Color Presets" open={false}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"4px 0"}}>
                      {COLORS.map(c=>(
                        <button key={c} onClick={()=>updateMat(primary.id,{color:c})}
                          style={{width:22,height:22,background:c,border:primary.mat.color===c?"2px solid #fff":"1px solid #111",borderRadius:3,cursor:"pointer",transition:"transform 0.1s"}}
                          onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.2)")}
                          onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
                      ))}
                    </div>
                  </BSection>
                </>
              )
            )}

            {/* OBJECT TAB */}
            {npTab==="object"&&(
              !primary?<div className="bl-np-empty">Nothing selected</div>:(
                <>
                  <BSection label="Object Properties">
                    <div className="bl-row">
                      <span className="bl-lbl">Name</span>
                      <input type="text" value={primary.name} onChange={e=>renameShape(primary.id,e.target.value)} className="bl-inp"/>
                    </div>
                    <label className="bl-check-row">
                      <input type="checkbox" checked={primary.visible} onChange={()=>toggleVisible(primary.id)} className="bl-check"/>
                      <span>Visible in viewport</span>
                    </label>
                    <label className="bl-check-row">
                      <input type="checkbox" checked={primary.locked} onChange={()=>toggleLock(primary.id)} className="bl-check"/>
                      <span>Lock transforms</span>
                    </label>
                  </BSection>
                  <BSection label={`${primary.params.type.charAt(0).toUpperCase()+primary.params.type.slice(1)} Parameters`}>
                    <ShapeParamsEditor params={primary.params} onChange={p=>updateParams(primary.id,p)}/>
                  </BSection>
                  <BSection label="Operations" open={false}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
                      <button onClick={()=>mirrorSelected("x")} className="bl-op-btn">Mirror X</button>
                      <button onClick={()=>mirrorSelected("y")} className="bl-op-btn">Mirror Y</button>
                      <button onClick={()=>mirrorSelected("z")} className="bl-op-btn">Mirror Z</button>
                      <button onClick={centerSelected}  className="bl-op-btn">Center</button>
                      <button onClick={flattenToGround} className="bl-op-btn" style={{gridColumn:"1/-1"}}>Flatten to Ground</button>
                      <button onClick={()=>setArrayModal(true)} className="bl-op-btn" style={{gridColumn:"1/-1"}}>Array Modifier…</button>
                    </div>
                  </BSection>
                </>
              )
            )}

            {/* SCENE TAB */}
            {npTab==="scene"&&(
              <>
                <BSection label="Outliner">
                  {isEmpty?<div className="bl-np-empty">Empty scene</div>:(
                    <ul style={{listStyle:"none",padding:0,margin:0}}>
                      {shapes.map(s=>(
                        <li key={s.id}
                          onClick={e=>{
                            if(s.locked)return;
                            const ns=e.shiftKey?new Set(selectedIds):new Set<string>();
                            ns.has(s.id)?ns.delete(s.id):ns.add(s.id); setSelectedIds(ns);
                            const lastId=[...ns].at(-1);
                            if(lastId){const m=meshMapRef.current.get(lastId);if(m){tcRef.current?.attach(m);updateBBRef.current(m);}}else tcRef.current?.detach();
                          }}
                          style={{
                            display:"flex",alignItems:"center",gap:6,
                            padding:"3px 6px",borderRadius:3,cursor:"pointer",
                            background:selectedIds.has(s.id)?"#214278":"transparent",
                            marginBottom:1,
                          }}>
                          <span style={{width:8,height:8,borderRadius:2,background:s.mat.color,flexShrink:0,border:"1px solid rgba(0,0,0,0.3)"}}/>
                          <span style={{flex:1,fontSize:11,color:selectedIds.has(s.id)?"#fff":"#c8c8c8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
                          <button onClick={e=>{e.stopPropagation();toggleVisible(s.id);}}
                            style={{fontSize:9,background:"none",border:"none",cursor:"pointer",color:"#6a6a6a",padding:0}}>
                            {s.visible?"👁":"🚫"}
                          </button>
                          <button onClick={e=>{e.stopPropagation();toggleLock(s.id);}}
                            style={{fontSize:9,background:"none",border:"none",cursor:"pointer",color:"#6a6a6a",padding:0}}>
                            {s.locked?"🔒":"🔓"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </BSection>
                <BSection label="Viewport Settings" open={false}>
                  <label className="bl-check-row">
                    <input type="checkbox" checked={showGrid} onChange={()=>setShowGrid(v=>!v)} className="bl-check"/>
                    <span>Show Grid</span>
                  </label>
                  <label className="bl-check-row">
                    <input type="checkbox" checked={snapEnabled} onChange={()=>setSnapEnabled(v=>!v)} className="bl-check"/>
                    <span>Snap to Grid</span>
                  </label>
                  {snapEnabled&&(
                    <div className="bl-row">
                      <span className="bl-lbl">Snap Size</span>
                      <select value={snapSize} onChange={e=>setSnapSize(parseFloat(e.target.value))} className="bl-inp">
                        {[0.1,0.25,0.5,1,2].map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  )}
                </BSection>
                <BSection label="Quick Add" open={false}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
                    {SHAPES.map(([type,,label])=>(
                      <button key={type} onClick={()=>addShape(type)} className="bl-op-btn">{label}</button>
                    ))}
                  </div>
                </BSection>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ STATUS BAR ═══ */}
      <div className="bl-statusbar">
        <span>Verts: {shapes.length*100}</span>
        <span className="bl-sb-sep">|</span>
        <span>Objects: {shapes.length}</span>
        <span className="bl-sb-sep">|</span>
        <span style={{color:selectedIds.size?"#4772b3":"inherit"}}>{selectedIds.size} selected</span>
        <span className="bl-sb-sep">|</span>
        <span style={{textTransform:"capitalize"}}>{mode}</span>
        <span className="bl-sb-spacer"/>
        <span>Hist: {histIdx}/{history.length-1}</span>
      </div>

      {/* ═══ ARRAY MODAL ═══ */}
      {arrayModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={()=>setArrayModal(false)}>
          <div style={{background:"#2b2b2b",border:"1px solid #444",borderRadius:6,padding:20,minWidth:280}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:16,color:"#e0e0e0",borderBottom:"1px solid #444",paddingBottom:8}}>Array Modifier</div>
            <div className="bl-row" style={{marginBottom:10}}>
              <span className="bl-lbl">Axis</span>
              <div style={{display:"flex",gap:6,flex:1}}>
                {(["x","y","z"] as const).map(a=>(
                  <button key={a} onClick={()=>setArrayAxis(a)}
                    style={{flex:1,padding:"4px 0",background:arrayAxis===a?"#4772b3":"#3d3d3d",border:"1px solid #555",borderRadius:3,color:"#e0e0e0",cursor:"pointer",fontWeight:arrayAxis===a?700:400,textTransform:"uppercase",fontSize:11}}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="bl-row" style={{marginBottom:10}}>
              <span className="bl-lbl">Count</span>
              <input type="number" value={arrayCount} min={2} max={20} onChange={e=>setArrayCount(parseInt(e.target.value)||2)} className="bl-inp" style={{width:60}}/>
            </div>
            <div className="bl-row" style={{marginBottom:16}}>
              <span className="bl-lbl">Spacing</span>
              <input type="number" value={arraySpacing} step={0.1} onChange={e=>setArraySpacing(parseFloat(e.target.value)||1)} className="bl-inp" style={{width:60}}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setArrayModal(false)} style={{padding:"5px 14px",background:"#3d3d3d",border:"1px solid #555",borderRadius:3,color:"#c8c8c8",cursor:"pointer",fontSize:11}}>Cancel</button>
              <button onClick={()=>{applyArray();setArrayModal(false);}} style={{padding:"5px 14px",background:"#4772b3",border:"none",borderRadius:3,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:11}}>Apply</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;}
        .bl-wrap{display:flex;flex-direction:column;height:100%;background:#1d1d1d;font-family:'Inter',system-ui,sans-serif;color:#c8c8c8;font-size:11px;user-select:none;}
        .bl-menubar{display:flex;align-items:center;height:28px;background:#3d3d3d;border-bottom:1px solid #111;flex-shrink:0;gap:0;}
        .bl-logo{padding:0 10px;font-weight:800;font-size:12px;color:#fff;letter-spacing:0.5px;opacity:0.9;}
        .bl-menu-btn{position:relative;padding:0 10px;height:100%;background:none;border:none;color:#c8c8c8;cursor:pointer;font-size:11px;display:flex;align-items:center;}
        .bl-menu-btn:hover{background:#555;}
        .bl-menu-btn.active{background:#4772b3;color:#fff;}
        .bl-dropdown{position:absolute;top:28px;left:0;background:#2b2b2b;border:1px solid #111;min-width:180px;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,0.6);}
        .bl-dd-item{display:flex;align-items:center;justify-content:space-between;padding:5px 12px;cursor:pointer;white-space:nowrap;gap:20px;}
        .bl-dd-item:hover{background:#4772b3;color:#fff;}
        .bl-dd-item kbd{font-size:9px;opacity:0.6;font-family:monospace;}
        .bl-dd-sep{height:1px;background:#3d3d3d;margin:2px 0;}
        .bl-main{display:flex;flex:1;overflow:hidden;}
        .bl-toolbar{display:flex;flex-direction:column;width:36px;background:#3d3d3d;border-right:1px solid #111;flex-shrink:0;padding:3px 0;gap:2px;align-items:center;}
        .bl-tool-btn{width:28px;height:28px;background:none;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#999;transition:background 0.15s,color 0.15s;}
        .bl-tool-btn:hover{background:#555;color:#fff;}
        .bl-tool-btn.active{background:#4772b3;color:#fff;}
        .bl-tool-sep{width:24px;height:1px;background:#555;margin:3px 0;}
        .bl-viewport{position:relative;flex:1;background:#3d3d3d;overflow:hidden;}
        .bl-canvas{width:100%;height:100%;}
        .bl-overlay-tl{position:absolute;top:8px;left:8px;font-size:10px;color:#aaa;pointer-events:none;text-shadow:0 1px 3px #000;}
        .bl-overlay-bl{position:absolute;bottom:8px;left:8px;font-size:10px;color:#aaa;pointer-events:none;text-shadow:0 1px 3px #000;display:flex;flex-direction:column;gap:2px;}
        .bl-shading-sw{position:absolute;top:8px;right:50px;display:flex;gap:2px;}
        .bl-shd-btn{padding:2px 7px;background:rgba(30,30,30,0.8);border:1px solid #555;border-radius:3px;color:#aaa;cursor:pointer;font-size:10px;transition:all 0.15s;}
        .bl-shd-btn:hover{background:#555;color:#fff;}
        .bl-shd-btn.active{background:#4772b3;border-color:#4772b3;color:#fff;}
        .bl-bbinfo{position:absolute;bottom:8px;right:8px;background:rgba(20,20,20,0.85);border:1px solid #333;border-radius:4px;padding:6px 10px;font-size:10px;color:#aaa;pointer-events:none;line-height:1.7;}
        .bl-empty-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;gap:8px;}
        .bl-empty-title{font-size:18px;color:#555;font-weight:600;}
        .bl-shortcuts{display:grid;grid-template-columns:auto auto;gap:2px 16px;margin-top:8px;}
        .bl-sc-key{background:#333;border:1px solid #555;border-radius:3px;padding:1px 6px;font-family:monospace;font-size:10px;color:#aaa;}
        .bl-sc-lbl{font-size:10px;color:#555;}
        .bl-npanel{display:flex;background:#2b2b2b;border-left:1px solid #111;flex-shrink:0;width:220px;}
        .bl-np-tabs{display:flex;flex-direction:column;width:24px;background:#3d3d3d;border-right:1px solid #111;}
        .bl-np-tab{writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);padding:12px 4px;cursor:pointer;font-size:10px;font-weight:600;letter-spacing:0.5px;color:#888;border-left:2px solid transparent;transition:all 0.15s;text-transform:uppercase;}
        .bl-np-tab:hover{color:#ddd;background:#444;}
        .bl-np-tab.active{color:#fff;background:#4772b3;border-left-color:#76a8e0;}
        .bl-np-content{flex:1;overflow-y:auto;padding:4px;scrollbar-width:thin;scrollbar-color:#555 #2b2b2b;}
        .bl-np-empty{padding:20px;text-align:center;color:#555;font-size:11px;}
        .bl-section{margin-bottom:2px;}
        .bl-sec-hdr{display:flex;align-items:center;gap:6px;padding:5px 6px;background:#3d3d3d;border-radius:3px;cursor:pointer;font-weight:600;color:#c8c8c8;font-size:11px;user-select:none;}
        .bl-sec-hdr:hover{background:#444;}
        .bl-sec-body{padding:4px 2px;}
        .bl-row{display:flex;align-items:center;gap:6px;padding:2px 4px;min-height:22px;}
        .bl-lbl{flex-shrink:0;width:64px;color:#8a8a8a;font-size:10px;}
        .bl-inp{flex:1;background:#1d1d1d;border:1px solid #3a3a3a;border-radius:3px;padding:2px 6px;color:#e0e0e0;font-size:11px;height:22px;outline:none;}
        .bl-inp:focus{border-color:#4772b3;box-shadow:0 0 0 1px #4772b3;}
        .bl-num{background:#1d1d1d;border:1px solid #3a3a3a;border-radius:3px;padding:2px 4px;color:#e0e0e0;font-size:10px;height:22px;width:60px;text-align:right;outline:none;}
        .bl-num:focus{border-color:#4772b3;}
        .bl-xyz-row{display:flex;align-items:center;gap:4px;padding:2px 4px;}
        .bl-xyz-lbl{width:60px;flex-shrink:0;color:#8a8a8a;font-size:10px;}
        .bl-xyz-x{background:#3d1d1d;border:1px solid #6a2a2a;}
        .bl-xyz-y{background:#1d3d1d;border:1px solid #2a6a2a;}
        .bl-xyz-z{background:#1d1d3d;border:1px solid #2a2a6a;}
        .bl-xyz-x,.bl-xyz-y,.bl-xyz-z{flex:1;border-radius:3px;padding:2px 4px;color:#e0e0e0;font-size:10px;height:22px;text-align:right;outline:none;}
        .bl-xyz-x:focus,.bl-xyz-y:focus,.bl-xyz-z:focus{box-shadow:0 0 0 1px #4772b3;}
        .bl-dim-row{display:flex;align-items:center;gap:4px;padding:2px 4px;}
        .bl-dim-lbl{width:60px;flex-shrink:0;color:#8a8a8a;font-size:10px;}
        .bl-dim-v{flex:1;border-radius:3px;padding:2px 4px;color:#aaa;font-size:10px;height:22px;text-align:right;background:#252525;border:1px solid #333;}
        .bl-slider-row{display:flex;align-items:center;gap:6px;padding:2px 4px;}
        .bl-slider-lbl{flex-shrink:0;width:64px;color:#8a8a8a;font-size:10px;}
        .bl-slider{flex:1;accent-color:#4772b3;cursor:pointer;height:3px;}
        .bl-slider-val{width:36px;text-align:right;color:#c8c8c8;font-size:10px;font-family:monospace;}
        .bl-check-row{display:flex;align-items:center;gap:8px;padding:3px 8px;cursor:pointer;}
        .bl-check{accent-color:#4772b3;}
        .bl-color-row{display:flex;align-items:center;gap:6px;padding:2px 4px;min-height:26px;}
        .bl-op-btn{padding:3px 6px;background:#3d3d3d;border:1px solid #555;border-radius:3px;color:#c8c8c8;cursor:pointer;font-size:10px;transition:background 0.15s;}
        .bl-op-btn:hover{background:#4772b3;border-color:#4772b3;color:#fff;}
        .bl-statusbar{display:flex;align-items:center;height:22px;background:#3d3d3d;border-top:1px solid #111;flex-shrink:0;padding:0 10px;gap:0;font-size:10px;color:#777;}
        .bl-sb-sep{margin:0 8px;color:#555;}
        .bl-sb-spacer{flex:1;}
        .bl-menu-spacer{flex:1;}
        @media (max-width:900px){.bl-npanel{width:200px;}}
      
        /* DOM class aliases */
        .bl-root{display:flex;flex-direction:column;height:100%;background:#1d1d1d;font-family:'Inter',system-ui,sans-serif;color:#c8c8c8;font-size:11px;user-select:none;}
        .bl-vp-wrap{position:relative;flex:1 1 0%;overflow:hidden;background:#3d3d3d;}
        .bl-vp{width:100%;height:100%;}
        .bl-nptabs{display:flex;flex-direction:column;width:24px;background:#3d3d3d;border-right:1px solid #111;}
        .bl-nptab{writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);padding:12px 4px;cursor:pointer;font-size:10px;font-weight:600;letter-spacing:0.5px;color:#888;border-left:2px solid transparent;transition:all 0.15s;text-transform:uppercase;}
        .bl-nptab:hover{color:#ddd;background:#444;}
        .bl-nptab-on{color:#fff;background:#4772b3;border-left-color:#76a8e0;}
        .bl-npcontent{flex:1;overflow-y:auto;padding:4px;scrollbar-width:thin;scrollbar-color:#555 #2b2b2b;}
        .bl-tool{width:28px;height:28px;background:none;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#999;transition:background 0.15s,color 0.15s;}
        .bl-tool:hover{background:#555;color:#fff;}
        .bl-tool-on{background:#4772b3 !important;color:#fff !important;}
        .bl-tool-group{display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px 0;}
        .bl-vp-tl{position:absolute;top:8px;left:8px;font-size:10px;color:#aaa;pointer-events:none;text-shadow:0 1px 3px #000;}
        .bl-vp-bl{position:absolute;bottom:8px;left:8px;font-size:10px;color:#aaa;pointer-events:none;text-shadow:0 1px 3px #000;display:flex;flex-direction:column;gap:2px;}
        .bl-vp-shading{position:absolute;top:8px;right:50px;display:flex;gap:2px;}
        .bl-shade-btn{padding:2px 7px;background:rgba(30,30,30,0.8);border:1px solid #555;border-radius:3px;color:#aaa;cursor:pointer;font-size:10px;transition:all 0.15s;}
        .bl-shade-btn:hover{background:#555;color:#fff;}
        .bl-shade-active{background:#4772b3 !important;border-color:#4772b3 !important;color:#fff !important;}
        .bl-shading-group{display:flex;gap:2px;align-items:center;}
        .bl-vp-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;gap:8px;}
        .bl-vp-empty-title{font-size:18px;color:#555;font-weight:600;}
        .bl-vp-empty-sub{font-size:11px;color:#555;}
        .bl-vp-shortcuts{display:grid;grid-template-columns:auto auto;gap:2px 16px;margin-top:8px;}
        .bl-shortcut-row{display:contents;}
        .bl-gizmo{position:absolute;top:8px;right:8px;pointer-events:none;}
        .bl-mode-pill{padding:0 10px;font-size:11px;font-weight:700;color:#c8c8c8;display:flex;align-items:center;height:100%;}
        .bl-menu-item{position:relative;padding:0 10px;height:100%;background:none;border:none;color:#c8c8c8;cursor:pointer;font-size:11px;display:flex;align-items:center;}
        .bl-menu-item:hover{background:#555;}
        .bl-menu-item.active{background:#4772b3;color:#fff;}
        .bl-menubar-divider{width:1px;height:16px;background:#555;margin:0 4px;flex-shrink:0;}
        .bl-menubar-spacer{flex:1;}
        .bl-snap-btn{padding:2px 7px;background:rgba(30,30,30,0.8);border:1px solid #555;border-radius:3px;color:#aaa;cursor:pointer;font-size:10px;}
        .bl-snap-btn:hover{background:#555;color:#fff;}
        .bl-print-btn{padding:3px 12px;background:#4772b3;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:11px;font-weight:600;height:24px;}
        .bl-print-btn:hover{background:#5882c3;}
        .bl-vp-shade{padding:2px 7px;background:rgba(30,30,30,0.8);border:1px solid #555;border-radius:3px;color:#aaa;cursor:pointer;font-size:10px;}
        .bl-vp-shade-on{background:#4772b3 !important;border-color:#4772b3 !important;color:#fff !important;}
      `}</style>
    </div>
  );
}

// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ══════════════════════════════ TYPES ══════════════════════════════════════ */
type ShapeType = "box"|"sphere"|"cylinder"|"cone"|"torus"|"plane"|"ring"|"torusKnot"|"capsule";
type TransformMode = "translate"|"rotate"|"scale";
type ViewMode = "solid"|"wireframe"|"xray";
interface Mat { color:string; roughness:number; metalness:number; opacity:number; wire:boolean; }
type ShapeParams =
  | {type:"box";width:number;height:number;depth:number}
  | {type:"sphere";radius:number;wSegs:number;hSegs:number}
  | {type:"cylinder";rTop:number;rBot:number;height:number;segs:number}
  | {type:"cone";radius:number;height:number;segs:number}
  | {type:"torus";radius:number;tube:number;rSegs:number;tSegs:number}
  | {type:"plane";width:number;height:number}
  | {type:"ring";inner:number;outer:number;segs:number}
  | {type:"torusKnot";radius:number;tube:number;p:number;q:number}
  | {type:"capsule";radius:number;length:number};
interface Shape {
  id:string; name:string; mat:Mat; params:ShapeParams;
  pos:{x:number;y:number;z:number}; rot:{x:number;y:number;z:number}; scl:{x:number;y:number;z:number};
  visible:boolean; locked:boolean;
}

/* ══════════════════════════ CONSTANTS ══════════════════════════════════════ */
const COLORS=["#4472c4","#ed7d31","#a9d18e","#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#c77dff","#f72585","#4cc9f0"];
let _ctr=0;
const uid=()=>`s${++_ctr}`;

/* ════════════════════════════ GEOMETRY ════════════════════════════════════ */
function makeGeo(T:any,p:ShapeParams):any {
  switch(p.type){
    case "box":       return new T.BoxGeometry(p.width,p.height,p.depth);
    case "sphere":    return new T.SphereGeometry(p.radius,p.wSegs,p.hSegs);
    case "cylinder":  return new T.CylinderGeometry(p.rTop,p.rBot,p.height,p.segs);
    case "cone":      return new T.ConeGeometry(p.radius,p.height,p.segs);
    case "torus":     return new T.TorusGeometry(p.radius,p.tube,p.rSegs,p.tSegs);
    case "plane":     return new T.PlaneGeometry(p.width,p.height);
    case "ring":      return new T.RingGeometry(p.inner,p.outer,p.segs);
    case "torusKnot": return new T.TorusKnotGeometry(p.radius,p.tube,100,16,p.p,p.q);
    case "capsule":   return new T.CapsuleGeometry(p.radius,p.length,8,16);
  }
}
function defParams(t:ShapeType):ShapeParams {
  switch(t){
    case "box":       return {type:"box",width:1,height:1,depth:1};
    case "sphere":    return {type:"sphere",radius:0.6,wSegs:32,hSegs:16};
    case "cylinder":  return {type:"cylinder",rTop:0.4,rBot:0.4,height:1,segs:32};
    case "cone":      return {type:"cone",radius:0.5,height:1,segs:32};
    case "torus":     return {type:"torus",radius:0.5,tube:0.18,rSegs:16,tSegs:100};
    case "plane":     return {type:"plane",width:2,height:2};
    case "ring":      return {type:"ring",inner:0.3,outer:0.6,segs:32};
    case "torusKnot": return {type:"torusKnot",radius:0.4,tube:0.12,p:2,q:3};
    case "capsule":   return {type:"capsule",radius:0.3,length:0.8};
  }
}
function defMat(i:number=0):Mat{return{color:COLORS[i%COLORS.length],roughness:0.5,metalness:0.0,opacity:1,wire:false};}
function r3(v:{x:number;y:number;z:number}){return{x:+v.x.toFixed(3),y:+v.y.toFixed(3),z:+v.z.toFixed(3)};}

/* ══════════════════════ BLENDER-STYLE UI COMPONENTS ═══════════════════════ */

function BNum({label,value,onChange,step=0.1,min}:{label:string;value:number;onChange:(v:number)=>void;step?:number;min?:number}){
  return(
    <div className="bl-row">
      <span className="bl-lbl">{label}</span>
      <input type="number" step={step} min={min} value={+value.toFixed(4)} className="bl-inp"
        onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))onChange(min!==undefined?Math.max(min,v):v);}}/>
    </div>
  );
}

function BSlider({label,value,min,max,step=0.01,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void}){
  return(
    <div className="bl-row">
      <span className="bl-lbl">{label}</span>
      <div style={{flex:1,display:"flex",alignItems:"center",gap:4}}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(parseFloat(e.target.value))} className="bl-slider"/>
        <span className="bl-slider-val">{value.toFixed(2)}</span>
      </div>
    </div>
  );
}

function BSection({label,children,open:initOpen=true}:{label:string;children:React.ReactNode;open?:boolean}){
  const[open,setOpen]=useState(initOpen);
  return(
    <div className="bl-sec">
      <button className="bl-sec-hdr" onClick={()=>setOpen(v=>!v)}>
        <span style={{marginRight:4,fontSize:8,transform:open?"rotate(90deg)":"rotate(0)",display:"inline-block",transition:"transform 0.15s"}}>▶</span>
        {label}
      </button>
      {open&&<div className="bl-sec-body">{children}</div>}
    </div>
  );
}

function ShapeParamsEditor({params,onChange}:{params:ShapeParams;onChange:(p:ShapeParams)=>void}){
  return(
    <div>
      {params.type==="box"&&(<>
        <BNum label="Width"  value={params.width}  min={0.01} onChange={v=>onChange({...params,width:v})}/>
        <BNum label="Height" value={params.height} min={0.01} onChange={v=>onChange({...params,height:v})}/>
        <BNum label="Depth"  value={params.depth}  min={0.01} onChange={v=>onChange({...params,depth:v})}/>
      </>)}
      {params.type==="sphere"&&(<>
        <BNum label="Radius"  value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="W Segs"  value={params.wSegs}  min={3} step={1} onChange={v=>onChange({...params,wSegs:Math.round(v)})}/>
        <BNum label="H Segs"  value={params.hSegs}  min={2} step={1} onChange={v=>onChange({...params,hSegs:Math.round(v)})}/>
      </>)}
      {params.type==="cylinder"&&(<>
        <BNum label="Radius Top" value={params.rTop}   min={0}    onChange={v=>onChange({...params,rTop:v})}/>
        <BNum label="Radius Bot" value={params.rBot}   min={0}    onChange={v=>onChange({...params,rBot:v})}/>
        <BNum label="Height"     value={params.height} min={0.01} onChange={v=>onChange({...params,height:v})}/>
        <BNum label="Segments"   value={params.segs}   min={3} step={1} onChange={v=>onChange({...params,segs:Math.round(v)})}/>
      </>)}
      {params.type==="cone"&&(<>
        <BNum label="Radius"   value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="Height"   value={params.height} min={0.01} onChange={v=>onChange({...params,height:v})}/>
        <BNum label="Segments" value={params.segs}   min={3} step={1} onChange={v=>onChange({...params,segs:Math.round(v)})}/>
      </>)}
      {params.type==="torus"&&(<>
        <BNum label="Radius"   value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="Tube"     value={params.tube}   min={0.01} onChange={v=>onChange({...params,tube:v})}/>
        <BNum label="R Segs"   value={params.rSegs}  min={3} step={1} onChange={v=>onChange({...params,rSegs:Math.round(v)})}/>
        <BNum label="T Segs"   value={params.tSegs}  min={3} step={1} onChange={v=>onChange({...params,tSegs:Math.round(v)})}/>
      </>)}
      {params.type==="plane"&&(<>
        <BNum label="Width"  value={params.width}  min={0.01} onChange={v=>onChange({...params,width:v})}/>
        <BNum label="Height" value={params.height} min={0.01} onChange={v=>onChange({...params,height:v})}/>
      </>)}
      {params.type==="ring"&&(<>
        <BNum label="Inner R"  value={params.inner} min={0.01} onChange={v=>onChange({...params,inner:v})}/>
        <BNum label="Outer R"  value={params.outer} min={0.01} onChange={v=>onChange({...params,outer:v})}/>
        <BNum label="Segments" value={params.segs}  min={3} step={1} onChange={v=>onChange({...params,segs:Math.round(v)})}/>
      </>)}
      {params.type==="torusKnot"&&(<>
        <BNum label="Radius" value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="Tube"   value={params.tube}   min={0.01} onChange={v=>onChange({...params,tube:v})}/>
        <BNum label="P"      value={params.p}      min={1} step={1} onChange={v=>onChange({...params,p:Math.round(v)})}/>
        <BNum label="Q"      value={params.q}      min={1} step={1} onChange={v=>onChange({...params,q:Math.round(v)})}/>
      </>)}
      {params.type==="capsule"&&(<>
        <BNum label="Radius" value={params.radius} min={0.01} onChange={v=>onChange({...params,radius:v})}/>
        <BNum label="Length" value={params.length} min={0.01} onChange={v=>onChange({...params,length:v})}/>
      </>)}
    </div>
  );
}

/* ═══════════════════════════ MAIN COMPONENT ════════════════════════════════ */

export function CadEditor({userEmail}:{userEmail:string}){
  const router=useRouter();
  const containerRef=useRef<HTMLDivElement>(null);
  const THREERef=useRef<any>(null); const sceneRef=useRef<any>(null);
  const rendRef=useRef<any>(null);  const rafRef=useRef(0);
  const meshMapRef=useRef<Map<string,any>>(new Map());
  const gridRef=useRef<any>(null);  const tcRef=useRef<any>(null);
  const camRef=useRef<any>(null);   const orbitRef=useRef<any>(null);

  const[shapes,setShapes]=useState<Shape[]>([]);
  const[selectedIds,setSelectedIds]=useState<Set<string>>(new Set());
  const[mode,setMode]=useState<TransformMode>("translate");
  const[viewMode,setViewMode]=useState<ViewMode>("solid");
  const[snapEnabled,setSnapEnabled]=useState(false);
  const[snapSize,setSnapSize]=useState(0.25);
  const[showGrid,setShowGrid]=useState(true);
  const[npTab,setNpTab]=useState<"item"|"material"|"object"|"scene">("item");
  const[history,setHistory]=useState<Shape[][]>([[]]);
  const[histIdx,setHistIdx]=useState(0);
  const[bbInfo,setBbInfo]=useState<{w:number;h:number;d:number}|null>(null);
  const[localSpace,setLocalSpace]=useState(true);
  const[isExporting,setIsExporting]=useState(false);
  const[arrayModal,setArrayModal]=useState(false);
  const[arrayAxis,setArrayAxis]=useState<"x"|"y"|"z">("x");
  const[arrayCount,setArrayCount]=useState(3);
  const[arraySpacing,setArraySpacing]=useState(2);
  const[openMenu,setOpenMenu]=useState<string|null>(null);

  const selectedIdsRef=useRef<Set<string>>(new Set());
  const shapesRef=useRef<Shape[]>([]);
  const historyRef=useRef<Shape[][]>([[]]);
  const histIdxRef=useRef(0);
  const snapRef=useRef(false);
  const snapSzRef=useRef(0.25);
  const viewModeRef=useRef<ViewMode>("solid");

  useEffect(()=>{selectedIdsRef.current=selectedIds;},[selectedIds]);
  useEffect(()=>{shapesRef.current=shapes;},[shapes]);
  useEffect(()=>{historyRef.current=history;},[history]);
  useEffect(()=>{histIdxRef.current=histIdx;},[histIdx]);
  useEffect(()=>{snapRef.current=snapEnabled;},[snapEnabled]);
  useEffect(()=>{snapSzRef.current=snapSize;},[snapSize]);
  useEffect(()=>{viewModeRef.current=viewMode;},[viewMode]);
  useEffect(()=>{tcRef.current?.setMode(mode);},[mode]);
  useEffect(()=>{tcRef.current?.setSpace(localSpace?"local":"world");},[localSpace]);
  useEffect(()=>{if(gridRef.current)gridRef.current.visible=showGrid;},[showGrid]);
  useEffect(()=>{
    for(const[id,mesh]of meshMapRef.current){
      const s=shapesRef.current.find(x=>x.id===id);
      applyView(mesh,viewMode,s?.mat);
    }
  },[viewMode]);

  useEffect(()=>{
    if(!containerRef.current)return;
    let disposed=false; let onDown:any,onUp:any,ro:ResizeObserver;
    (async()=>{
      const T=await import("three");
      const{OrbitControls}=await import("three/examples/jsm/controls/OrbitControls.js");
      const{TransformControls}=await import("three/examples/jsm/controls/TransformControls.js");
      if(disposed||!containerRef.current)return;
      THREERef.current=T;
      const scene=new T.Scene();
      scene.background=new T.Color(0x3d3d3d);
      sceneRef.current=scene;
      const amb=new T.AmbientLight(0xffffff,0.6); scene.add(amb);
      const sun=new T.DirectionalLight(0xffffff,1.1); sun.position.set(10,16,8);
      sun.castShadow=true; sun.shadow.mapSize.setScalar(2048);
      sun.shadow.camera.near=0.1; sun.shadow.camera.far=100;
      sun.shadow.camera.left=-15; sun.shadow.camera.right=15;
      sun.shadow.camera.top=15; sun.shadow.camera.bottom=-15;
      scene.add(sun);
      (()=>{const _dl=new T.DirectionalLight(0xaabbff,0.2);_dl.position.set(-6,4,-8);scene.add(_dl);})();
      const grid=new T.GridHelper(40,40,0x555555,0x444444); scene.add(grid); gridRef.current=grid;
      const mkLine=(pts:number[][],col:number)=>{
        const geo=new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(p[0],p[1],p[2])));
        return new T.Line(geo,new T.LineBasicMaterial({color:col,depthTest:false}));
      };
      scene.add(mkLine([[-20,0.001,0],[20,0.001,0]],0xff3333));
      scene.add(mkLine([[0,0.001,-20],[0,0.001,20]],0x3333ff));
      const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.ShadowMaterial({opacity:0.2}));
      floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; floor.userData.isHelper=true; scene.add(floor);
      const w=containerRef.current.clientWidth; const h=containerRef.current.clientHeight;
      const ren=new T.WebGLRenderer({antialias:true});
      ren.setPixelRatio(Math.min(devicePixelRatio,2)); ren.shadowMap.enabled=true; ren.setSize(w,h);
      containerRef.current.replaceChildren(ren.domElement); rendRef.current=ren;
      const cam=new T.PerspectiveCamera(50,w/h,0.01,1000);
      cam.position.set(7,5,7); cam.lookAt(0,0,0); camRef.current=cam;
      const orbit=new OrbitControls(cam,ren.domElement);
      orbit.enableDamping=true; orbit.dampingFactor=0.06; orbitRef.current=orbit;
      const tc=new TransformControls(cam,ren.domElement);
      tc.setMode("translate"); tc.setSize(0.8);
      tc.addEventListener("dragging-changed",(e:any)=>{
        orbit.enabled=!e.value;
        if(!e.value){
          const id=[...selectedIdsRef.current][0]; if(!id)return;
          const mesh=meshMapRef.current.get(id); if(!mesh)return;
          if(snapRef.current){const sz=snapSzRef.current;
            mesh.position.x=Math.round(mesh.position.x/sz)*sz;
            mesh.position.y=Math.round(mesh.position.y/sz)*sz;
            mesh.position.z=Math.round(mesh.position.z/sz)*sz;}
          pushHistoryRef.current(shapesRef.current);
        }
      });
      tc.addEventListener("change",()=>{
        const T2=THREERef.current; const id=[...selectedIdsRef.current][0];
        if(!id||!T2)return; const mesh=meshMapRef.current.get(id); if(!mesh)return;
        setShapes(prev=>prev.map(s=>s.id!==id?s:{...s,
          pos:r3(mesh.position),
          rot:{x:+T2.MathUtils.radToDeg(mesh.rotation.x).toFixed(2),y:+T2.MathUtils.radToDeg(mesh.rotation.y).toFixed(2),z:+T2.MathUtils.radToDeg(mesh.rotation.z).toFixed(2)},
          scl:r3(mesh.scale)}));
        updateBBRef.current(mesh);
      });
      scene.add(tc as any); tcRef.current=tc;
      const ray=new T.Raycaster(); const ptr=new T.Vector2(); let pdX=0,pdY=0;
      onDown=(e:PointerEvent)=>{pdX=e.clientX;pdY=e.clientY;};
      onUp=(e:PointerEvent)=>{
        if(e.button!==0)return;
        if(Math.hypot(e.clientX-pdX,e.clientY-pdY)>6)return;
        const rect=ren.domElement.getBoundingClientRect();
        ptr.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
        ray.setFromCamera(ptr,cam);
        if(tc.object){const h=ray.intersectObject(tc as any,true);if(h.length>0)return;}
        const hits=ray.intersectObjects([...meshMapRef.current.values()],false);
        if(hits.length>0){
          const hit=hits[0].object;
          const entry=[...meshMapRef.current.entries()].find(([,m])=>m===hit);
          if(!entry)return; const[id]=entry;
          const shape=shapesRef.current.find(s=>s.id===id);
          if(shape?.locked)return;
          if(e.shiftKey){
            const ns=new Set(selectedIdsRef.current);
            ns.has(id)?ns.delete(id):ns.add(id); setSelectedIds(ns);
            const lastId=[...ns].at(-1);
            if(lastId){const m=meshMapRef.current.get(lastId);if(m)tc.attach(m);}else tc.detach();
          }else{setSelectedIds(new Set([id]));tc.attach(hit);updateBBRef.current(hit);}
        }else if(!e.shiftKey){tc.detach();setSelectedIds(new Set());setBbInfo(null);}
      };
      ren.domElement.addEventListener("pointerdown",onDown);
      ren.domElement.addEventListener("pointerup",onUp);
      ro=new ResizeObserver(()=>{
        if(disposed||!containerRef.current)return;
        const nw=containerRef.current.clientWidth; const nh=containerRef.current.clientHeight;
        cam.aspect=nw/nh; cam.updateProjectionMatrix(); ren.setSize(nw,nh);
      });
      ro.observe(containerRef.current);
      const loop=()=>{if(disposed)return;rafRef.current=requestAnimationFrame(loop);orbit.update();ren.render(scene,cam);};
      loop();
    })();
    return()=>{disposed=true;cancelAnimationFrame(rafRef.current);
      rendRef.current?.domElement.removeEventListener("pointerdown",onDown);
      rendRef.current?.domElement.removeEventListener("pointerup",onUp);
      ro?.disconnect();tcRef.current?.dispose();orbitRef.current?.dispose();rendRef.current?.dispose();};
  },[]);

  function applyView(mesh:any,vm:ViewMode,mat?:Mat){
    if(!mesh?.material)return;
    const m=mesh.material;
    m.wireframe=vm==="wireframe"||!!mat?.wire;
    m.transparent=vm==="xray"||(mat?.opacity??1)<1;
    m.opacity=vm==="xray"?0.3:(mat?.opacity??1);
    m.depthWrite=vm!=="xray"; m.needsUpdate=true;
  }

  const updateBBRef=useRef((mesh:any)=>{
    const T=THREERef.current;
    if(!T||!mesh){setBbInfo(null);return;}
    const bb=new T.Box3().setFromObject(mesh);
    const sz=new T.Vector3(); bb.getSize(sz);
    setBbInfo({w:+sz.x.toFixed(3),h:+sz.y.toFixed(3),d:+sz.z.toFixed(3)});
  });

  const pushHistoryRef=useRef((ns:Shape[])=>{
    const h=historyRef.current.slice(0,histIdxRef.current+1);
    const next=[...h,ns.map(s=>({...s}))];
    if(next.length>52)next.shift();
    historyRef.current=next; histIdxRef.current=next.length-1;
    setHistory([...next]); setHistIdx(next.length-1);
  });

  const restoreShapes=useCallback((target:Shape[])=>{
    const T=THREERef.current; if(!T||!sceneRef.current)return;
    for(const[,mesh]of meshMapRef.current){
      sceneRef.current.remove(mesh); mesh.geometry?.dispose();
      (Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach((m:any)=>m?.dispose());
    }
    meshMapRef.current.clear(); tcRef.current?.detach();
    target.forEach(s=>{
      const geo=makeGeo(T,s.params);
      const tMat=new T.MeshStandardMaterial({color:s.mat.color,roughness:s.mat.roughness,metalness:s.mat.metalness,opacity:s.mat.opacity,transparent:s.mat.opacity<1,wireframe:s.mat.wire});
      const mesh=new T.Mesh(geo,tMat);
      mesh.castShadow=true; mesh.receiveShadow=true;
      mesh.position.set(s.pos.x,s.pos.y,s.pos.z);
      mesh.rotation.set(T.MathUtils.degToRad(s.rot.x),T.MathUtils.degToRad(s.rot.y),T.MathUtils.degToRad(s.rot.z));
      mesh.scale.set(s.scl.x,s.scl.y,s.scl.z); mesh.visible=s.visible;
      sceneRef.current.add(mesh); meshMapRef.current.set(s.id,mesh);
    });
    setShapes(target.map(s=>({...s}))); setSelectedIds(new Set()); setBbInfo(null);
  },[]);

  const addShape=useCallback((type:ShapeType)=>{
    const T=THREERef.current; if(!T||!sceneRef.current)return;
    const id=uid(); const count=meshMapRef.current.size;
    const mat=defMat(count); const params=defParams(type);
    const tMat=new T.MeshStandardMaterial({color:mat.color,roughness:mat.roughness,metalness:mat.metalness});
    const mesh=new T.Mesh(makeGeo(T,params),tMat);
    mesh.castShadow=true; mesh.receiveShadow=true;
    const off=count*0.4; mesh.position.set(off%3,0,Math.floor(off/3)*0.5);
    const bb=new T.Box3().setFromObject(mesh); mesh.position.y-=bb.min.y;
    sceneRef.current.add(mesh); meshMapRef.current.set(id,mesh);
    const shape:Shape={id,name:`${type.charAt(0).toUpperCase()}${type.slice(1)} ${_ctr}`,mat,params,
      pos:r3(mesh.position),rot:{x:0,y:0,z:0},scl:{x:1,y:1,z:1},visible:true,locked:false};
    const next=[...shapesRef.current,shape];
    setShapes(next); setSelectedIds(new Set([id]));
    tcRef.current?.attach(mesh); updateBBRef.current(mesh); pushHistoryRef.current(next);
    setOpenMenu(null);
  },[]);

  const deleteSelected=useCallback(()=>{
    const ids=selectedIdsRef.current; if(!ids.size)return;
    ids.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      sceneRef.current?.remove(mesh); mesh.geometry?.dispose();
      (Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach((m:any)=>m?.dispose());
      meshMapRef.current.delete(id);
    });
    tcRef.current?.detach();
    const next=shapesRef.current.filter(s=>!ids.has(s.id));
    setShapes(next); setSelectedIds(new Set()); setBbInfo(null); pushHistoryRef.current(next);
  },[]);

  const duplicateSelected=useCallback(()=>{
    const ids=selectedIdsRef.current; if(!ids.size||!sceneRef.current)return;
    const T=THREERef.current; if(!T)return;
    const next=[...shapesRef.current]; const newIds=new Set<string>();
    ids.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      const orig=shapesRef.current.find(s=>s.id===id); if(!orig)return;
      const nid=uid(); const nm=mesh.clone(); nm.position.x+=1.5;
      sceneRef.current.add(nm); meshMapRef.current.set(nid,nm);
      next.push({...orig,id:nid,name:orig.name+" copy",pos:{...orig.pos,x:+(orig.pos.x+1.5).toFixed(3)}});
      newIds.add(nid);
    });
    tcRef.current?.detach();
    const lastId=[...newIds].at(-1);
    if(lastId){const m=meshMapRef.current.get(lastId);if(m)tcRef.current?.attach(m);}
    setShapes(next); setSelectedIds(newIds); pushHistoryRef.current(next);
  },[]);

  const updateMat=useCallback((id:string,patch:Partial<Mat>)=>{
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    const m=mesh.material;
    setShapes(prev=>prev.map(s=>{
      if(s.id!==id)return s;
      const nm={...s.mat,...patch};
      if(patch.color!==undefined)m.color.set(patch.color);
      if(patch.roughness!==undefined)m.roughness=patch.roughness;
      if(patch.metalness!==undefined)m.metalness=patch.metalness;
      if(patch.opacity!==undefined){m.opacity=patch.opacity;m.transparent=patch.opacity<1||viewModeRef.current==="xray";m.needsUpdate=true;}
      if(patch.wire!==undefined){m.wireframe=patch.wire;m.needsUpdate=true;}
      return{...s,mat:nm};
    }));
  },[]);

  const updateParams=useCallback((id:string,params:ShapeParams)=>{
    const T=THREERef.current; const mesh=meshMapRef.current.get(id);
    if(!T||!mesh)return;
    mesh.geometry.dispose(); mesh.geometry=makeGeo(T,params);
    setShapes(prev=>prev.map(s=>s.id===id?{...s,params}:s));
    updateBBRef.current(mesh);
  },[]);

  const setPos=useCallback((id:string,axis:"x"|"y"|"z",val:number)=>{
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    mesh.position[axis]=val;
    setShapes(prev=>prev.map(s=>s.id===id?{...s,pos:{...s.pos,[axis]:val}}:s));
    updateBBRef.current(mesh);
  },[]);
  const setRot=useCallback((id:string,axis:"x"|"y"|"z",deg:number)=>{
    const T=THREERef.current; if(!T)return;
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    mesh.rotation[axis]=T.MathUtils.degToRad(deg);
    setShapes(prev=>prev.map(s=>s.id===id?{...s,rot:{...s.rot,[axis]:deg}}:s));
  },[]);
  const setScl=useCallback((id:string,axis:"x"|"y"|"z",val:number)=>{
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    mesh.scale[axis]=val;
    setShapes(prev=>prev.map(s=>s.id===id?{...s,scl:{...s.scl,[axis]:val}}:s));
    updateBBRef.current(mesh);
  },[]);
  const toggleVisible=useCallback((id:string)=>{
    const mesh=meshMapRef.current.get(id); if(!mesh)return;
    setShapes(prev=>prev.map(s=>{if(s.id!==id)return s;mesh.visible=!s.visible;return{...s,visible:!s.visible};}));
  },[]);
  const toggleLock=useCallback((id:string)=>{
    setShapes(prev=>prev.map(s=>{
      if(s.id!==id)return s;
      if(!s.locked&&selectedIdsRef.current.has(id)){
        setSelectedIds(p=>{const n=new Set(p);n.delete(id);return n;});tcRef.current?.detach();}
      return{...s,locked:!s.locked};
    }));
  },[]);
  const renameShape=useCallback((id:string,name:string)=>{
    setShapes(prev=>prev.map(s=>s.id===id?{...s,name}:s));
  },[]);
  const undo=useCallback(()=>{
    const idx=histIdxRef.current; if(idx<=0)return;
    const ni=idx-1; restoreShapes(historyRef.current[ni]); histIdxRef.current=ni; setHistIdx(ni);
  },[restoreShapes]);
  const redo=useCallback(()=>{
    const idx=histIdxRef.current; const h=historyRef.current;
    if(idx>=h.length-1)return;
    const ni=idx+1; restoreShapes(h[ni]); histIdxRef.current=ni; setHistIdx(ni);
  },[restoreShapes]);
  const selectAll=useCallback(()=>{
    const ids=new Set(shapesRef.current.filter(s=>!s.locked).map(s=>s.id)); setSelectedIds(ids);
    const lastId=[...ids].at(-1);
    if(lastId){const m=meshMapRef.current.get(lastId);if(m)tcRef.current?.attach(m);}
  },[]);
  const centerSelected=useCallback(()=>{
    selectedIdsRef.current.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      mesh.position.set(0,mesh.position.y,0);
      setShapes(prev=>prev.map(s=>s.id===id?{...s,pos:{x:0,y:s.pos.y,z:0}}:s));
    });
    pushHistoryRef.current(shapesRef.current);
  },[]);
  const mirrorSelected=useCallback((axis:"x"|"y"|"z")=>{
    selectedIdsRef.current.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      mesh.scale[axis]*=-1;
      setShapes(prev=>prev.map(s=>s.id===id?{...s,scl:{...s.scl,[axis]:s.scl[axis]*-1}}:s));
    });
    pushHistoryRef.current(shapesRef.current);
  },[]);
  const flattenToGround=useCallback(()=>{
    const T=THREERef.current; if(!T)return;
    selectedIdsRef.current.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      const bb=new T.Box3().setFromObject(mesh); mesh.position.y-=bb.min.y;
      setShapes(prev=>prev.map(s=>s.id===id?{...s,pos:{...s.pos,y:+mesh.position.y.toFixed(3)}}:s));
    });
    pushHistoryRef.current(shapesRef.current);
  },[]);
  const applyArray=useCallback(()=>{
    const ids=selectedIdsRef.current; if(!ids.size||!sceneRef.current)return;
    const T=THREERef.current; if(!T)return;
    const next=[...shapesRef.current];
    ids.forEach(id=>{
      const mesh=meshMapRef.current.get(id); if(!mesh)return;
      const orig=shapesRef.current.find(s=>s.id===id); if(!orig)return;
      for(let i=1;i<arrayCount;i++){
        const nid=uid(); const nm=mesh.clone();
        nm.position.copy(mesh.position); nm.position[arrayAxis]+=arraySpacing*i;
        sceneRef.current.add(nm); meshMapRef.current.set(nid,nm);
        next.push({...orig,id:nid,name:`${orig.name}[${i}]`,pos:{...orig.pos,[arrayAxis]:+(orig.pos[arrayAxis]+arraySpacing*i).toFixed(3)}});
      }
    });
    setShapes(next); setArrayModal(false); pushHistoryRef.current(next);
  },[arrayAxis,arrayCount,arraySpacing]);

  const importSTL=useCallback(async(file:File)=>{
    const T=THREERef.current; if(!T||!sceneRef.current)return;
    const{STLLoader}=await import("three/examples/jsm/loaders/STLLoader.js");
    const geo=new STLLoader().parse(await file.arrayBuffer());
    geo.computeVertexNormals(); geo.center();
    const tMat=new T.MeshStandardMaterial({color:"#8888aa",roughness:0.5,metalness:0.0});
    const mesh=new T.Mesh(geo,tMat); mesh.castShadow=true; mesh.receiveShadow=true;
    const bb=new T.Box3().setFromObject(mesh); mesh.position.y=-bb.min.y;
    sceneRef.current.add(mesh); const id=uid(); meshMapRef.current.set(id,mesh);
    const shape:Shape={id,name:file.name.replace(/\.stl$/i,""),
      mat:{color:"#8888aa",roughness:0.5,metalness:0.0,opacity:1,wire:false},
      params:{type:"box",width:1,height:1,depth:1},
      pos:r3(mesh.position),rot:{x:0,y:0,z:0},scl:{x:1,y:1,z:1},visible:true,locked:false};
    const next=[...shapesRef.current,shape];
    setShapes(next); setSelectedIds(new Set([id]));
    tcRef.current?.attach(mesh); updateBBRef.current(mesh); pushHistoryRef.current(next);
  },[]);

  const exportSTL=useCallback(async()=>{
    if(meshMapRef.current.size===0)return; setIsExporting(true);
    const T=THREERef.current;
    const{STLExporter}=await import("three/examples/jsm/exporters/STLExporter.js");
    const tmp=new T.Scene();
    for(const mesh of meshMapRef.current.values())tmp.add(mesh.clone());
    const result=new STLExporter().parse(tmp,{binary:true}) as DataView;
    const url=URL.createObjectURL(new Blob([result.buffer],{type:"model/stl"}));
    Object.assign(document.createElement("a"),{href:url,download:"model.stl"}).click();
    URL.revokeObjectURL(url); setIsExporting(false);
  },[]);

  const exportOBJ=useCallback(async()=>{
    if(meshMapRef.current.size===0)return; setIsExporting(true);
    const T=THREERef.current;
    const{OBJExporter}=await import("three/examples/jsm/exporters/OBJExporter.js");
    const tmp=new T.Scene();
    for(const mesh of meshMapRef.current.values())tmp.add(mesh.clone());
    const result=new OBJExporter().parse(tmp);
    const url=URL.createObjectURL(new Blob([result],{type:"text/plain"}));
    Object.assign(document.createElement("a"),{href:url,download:"model.obj"}).click();
    URL.revokeObjectURL(url); setIsExporting(false);
  },[]);

  const submitPrint=useCallback(async()=>{
    if(meshMapRef.current.size===0)return; setIsExporting(true);
    const T=THREERef.current;
    const{STLExporter}=await import("three/examples/jsm/exporters/STLExporter.js");
    const tmp=new T.Scene();
    for(const mesh of meshMapRef.current.values())tmp.add(mesh.clone());
    const result=new STLExporter().parse(tmp,{binary:true}) as DataView;
    const bytes=new Uint8Array(result.buffer);
    let str=""; for(let i=0;i<bytes.length;i++)str+=String.fromCharCode(bytes[i]);
    try{sessionStorage.setItem("cad_stl",btoa(str));sessionStorage.setItem("cad_filename","cad-model.stl");}catch{}
    setIsExporting(false); router.push("/custom-print");
  },[router]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement)?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA")return;
      if(e.key==="g"||e.key==="G")setMode("translate");
      if(e.key==="r"||e.key==="R")setMode("rotate");
      if(e.key==="s"||e.key==="S")setMode("scale");
      if(e.key==="f"||e.key==="F")flattenToGround();
      if(e.key==="Delete"||e.key==="Backspace")deleteSelected();
      if((e.ctrlKey||e.metaKey)&&(e.key==="d"||e.key==="D")){e.preventDefault();duplicateSelected();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="z"||e.key==="Z")){e.preventDefault();e.shiftKey?redo():undo();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="y"||e.key==="Y")){e.preventDefault();redo();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="a"||e.key==="A")){e.preventDefault();selectAll();}
      if(e.key==="Escape"){tcRef.current?.detach();setSelectedIds(new Set());setBbInfo(null);}
      if(openMenu)setOpenMenu(null);
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[deleteSelected,duplicateSelected,undo,redo,selectAll,flattenToGround,openMenu]);

  const primary=shapes.find(s=>selectedIds.has(s.id))||null;
  const isEmpty=shapes.length===0;
  const SHAPES:[ShapeType,string,string][]=[
    ["box","☐","Box"],["sphere","○","Sphere"],["cylinder","⌭","Cylinder"],
    ["cone","△","Cone"],["torus","◎","Torus"],["plane","▭","Plane"],
    ["ring","⊙","Ring"],["torusKnot","✦","Torus Knot"],["capsule","⊓","Capsule"],
  ];

  return(
    <div className="bl-root" onClick={()=>openMenu&&setOpenMenu(null)}>

      {/* ═══ TOP MENU BAR ═══ */}
      <div className="bl-menubar">
        <div className="bl-mode-pill">Object Mode</div>
        <div className="bl-menubar-divider"/>

        {/* File menu */}
        <div className="bl-menu-item" onClick={e=>e.stopPropagation()}>
          <button className="bl-menu-btn" onClick={()=>setOpenMenu(openMenu==="file"?null:"file")}>File</button>
          {openMenu==="file"&&(
            <div className="bl-dropdown">
              <label className="bl-dd-item cursor-pointer">
                📂 Import STL…
                <input type="file" accept=".stl" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)importSTL(f);e.target.value="";setOpenMenu(null);}}/>
              </label>
              <div className="bl-dd-sep"/>
              <button className="bl-dd-item" onClick={()=>{exportSTL();setOpenMenu(null);}}>⬇ Export STL</button>
              <button className="bl-dd-item" onClick={()=>{exportOBJ();setOpenMenu(null);}}>⬇ Export OBJ</button>
            </div>
          )}
        </div>

        {/* Edit menu */}
        <div className="bl-menu-item" onClick={e=>e.stopPropagation()}>
          <button className="bl-menu-btn" onClick={()=>setOpenMenu(openMenu==="edit"?null:"edit")}>Edit</button>
          {openMenu==="edit"&&(
            <div className="bl-dropdown">
              <button className="bl-dd-item" disabled={histIdx<=0} onClick={()=>{undo();setOpenMenu(null);}}>↩ Undo  <span className="bl-dd-key">⌘Z</span></button>
              <button className="bl-dd-item" disabled={histIdx>=history.length-1} onClick={()=>{redo();setOpenMenu(null);}}>↪ Redo  <span className="bl-dd-key">⌘Y</span></button>
              <div className="bl-dd-sep"/>
              <button className="bl-dd-item" onClick={()=>{selectAll();setOpenMenu(null);}}>Select All  <span className="bl-dd-key">⌘A</span></button>
            </div>
          )}
        </div>

        {/* Add menu */}
        <div className="bl-menu-item" onClick={e=>e.stopPropagation()}>
          <button className="bl-menu-btn" onClick={()=>setOpenMenu(openMenu==="add"?null:"add")}>Add</button>
          {openMenu==="add"&&(
            <div className="bl-dropdown">
              <div className="bl-dd-category">Mesh</div>
              {SHAPES.map(([type,,label])=>(
                <button key={type} className="bl-dd-item" onClick={()=>addShape(type)}>{label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Object menu */}
        <div className="bl-menu-item" onClick={e=>e.stopPropagation()}>
          <button className="bl-menu-btn" onClick={()=>setOpenMenu(openMenu==="object"?null:"object")}>Object</button>
          {openMenu==="object"&&(
            <div className="bl-dropdown">
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{duplicateSelected();setOpenMenu(null);}}>⊕ Duplicate  <span className="bl-dd-key">⌘D</span></button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{deleteSelected();setOpenMenu(null);}}>✕ Delete  <span className="bl-dd-key">Del</span></button>
              <div className="bl-dd-sep"/>
              <div className="bl-dd-category">Mirror</div>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{mirrorSelected("x");setOpenMenu(null);}}>Mirror X</button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{mirrorSelected("y");setOpenMenu(null);}}>Mirror Y</button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{mirrorSelected("z");setOpenMenu(null);}}>Mirror Z</button>
              <div className="bl-dd-sep"/>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{centerSelected();setOpenMenu(null);}}>⊙ Center</button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{flattenToGround();setOpenMenu(null);}}>⬇ To Ground</button>
              <button className="bl-dd-item" disabled={!selectedIds.size} onClick={()=>{setArrayModal(true);setOpenMenu(null);}}>⁝ Array…</button>
            </div>
          )}
        </div>

        <div className="bl-menubar-divider"/>

        {/* View mode toggles (shading) */}
        <div className="bl-shading-group">
          {(["solid","wireframe","xray"] as const).map(vm=>(
            <button key={vm} onClick={()=>setViewMode(vm)}
              className={`bl-shade-btn ${viewMode===vm?"bl-shade-active":""}`}
              title={vm}>
              {vm==="solid"?"◼":vm==="wireframe"?"⊡":"◻"}
            </button>
          ))}
        </div>

        {/* Snap */}
        <button onClick={()=>setSnapEnabled(v=>!v)}
          className={`bl-snap-btn ${snapEnabled?"bl-snap-on":""}`} title="Snap to grid (toggle)">
          🧲
        </button>
        {snapEnabled&&(
          <select value={snapSize} onChange={e=>setSnapSize(parseFloat(e.target.value))} className="bl-snap-sel">
            {[0.1,0.25,0.5,1,2].map(v=><option key={v} value={v}>{v}u</option>)}
          </select>
        )}

        <div className="bl-menubar-spacer"/>

        {/* Print button */}
        <button onClick={submitPrint} disabled={isEmpty||isExporting} className="bl-print-btn">
          🖨 Request Print Quote
        </button>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div className="bl-main">

        {/* ─── LEFT TOOLBAR (T-panel) ─── */}
        <div className="bl-toolbar">
          <div className="bl-tool-group">
            <button onClick={()=>setMode("translate")} className={`bl-tool ${mode==="translate"?"bl-tool-on":""}`} title="Move (G)">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M9 1l2 3H10v4h4V7l3 2-3 2v-1H10v4h1l-2 3-2-3h1v-4H4v1L1 9l3-2v1h4V4H7L9 1z"/>
              </svg>
              <span>Move</span>
            </button>
            <button onClick={()=>setMode("rotate")} className={`bl-tool ${mode==="rotate"?"bl-tool-on":""}`} title="Rotate (R)">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4.5 4.5A6 6 0 0 1 15 9" strokeLinecap="round"/>
                <path d="M13 9l2-2.5L13 4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 13.5A6 6 0 0 1 3 9" strokeLinecap="round"/>
                <path d="M5 9L3 11.5 5 14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Rotate</span>
            </button>
            <button onClick={()=>setMode("scale")} className={`bl-tool ${mode==="scale"?"bl-tool-on":""}`} title="Scale (S)">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect x="7" y="7" width="4" height="4" opacity="0.8"/>
                <path d="M2 2h5v1.5H3.5V7H2V2zM11 2h5v5h-1.5V3.5H11V2zM2 11h1.5v3.5H7V16H2v-5zM14.5 11H16v5h-5v-1.5h3.5V11z" opacity="0.6"/>
              </svg>
              <span>Scale</span>
            </button>
          </div>
          <div className="bl-tool-sep"/>
          <div className="bl-tool-group">
            <button onClick={()=>setLocalSpace(v=>!v)} className={`bl-tool ${localSpace?"bl-tool-on":""}`} title="Transform space">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="9" r="6"/>
                <path d="M9 3v12M3 9h12" opacity="0.5"/>
              </svg>
              <span>{localSpace?"Local":"World"}</span>
            </button>
          </div>
          <div className="bl-tool-sep"/>
          <div className="bl-tool-group">
            <button onClick={()=>setShowGrid(v=>!v)} className={`bl-tool ${showGrid?"bl-tool-on":""}`} title="Toggle grid">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M2 6h14M2 12h14M6 2v14M12 2v14" opacity="0.7"/>
              </svg>
              <span>Grid</span>
            </button>
          </div>
          <div className="bl-tool-sep"/>
          <div className="bl-tool-group">
            <button onClick={undo} disabled={histIdx<=0} className="bl-tool" title="Undo ⌘Z">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9a6 6 0 0 1 6-6h4" strokeLinecap="round"/>
                <path d="M6 6L3 9l3 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Undo</span>
            </button>
            <button onClick={redo} disabled={histIdx>=history.length-1} className="bl-tool" title="Redo ⌘Y">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 9a6 6 0 0 0-6-6H5" strokeLinecap="round"/>
                <path d="M12 6l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Redo</span>
            </button>
          </div>
        </div>

        {/* ─── VIEWPORT ─── */}
        <div className="bl-vp-wrap">
          <div ref={containerRef} className="bl-vp"/>

          {/* Corner overlays */}
          <div className="bl-vp-tl">Perspective</div>
          <div className="bl-vp-bl">{viewMode==="solid"?"Solid":viewMode==="wireframe"?"Wireframe":"X-Ray"}</div>

          {/* Axis gizmo */}
          <div className="bl-gizmo">
            <svg width="64" height="64" viewBox="-32 -32 64 64">
              <line x1="0" y1="0" x2="22" y2="0" stroke="#ff3333" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="26" cy="0" r="8" fill="#cc2222"/>
              <text x="26" y="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">X</text>
              <line x1="0" y1="0" x2="0" y2="-22" stroke="#33cc33" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="0" cy="-26" r="8" fill="#228822"/>
              <text x="0" y="-22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Y</text>
              <line x1="0" y1="0" x2="-16" y2="16" stroke="#3366ff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
              <circle cx="-19" cy="19" r="8" fill="#2244bb"/>
              <text x="-19" y="23" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Z</text>
            </svg>
          </div>

          {/* Viewport shading switcher (top-right corner, like Blender) */}
          <div className="bl-vp-shading">
            {(["solid","wireframe","xray"] as const).map(vm=>(
              <button key={vm} onClick={()=>setViewMode(vm)}
                className={`bl-vp-shade ${viewMode===vm?"bl-vp-shade-on":""}`} title={vm}>
                {vm==="solid"?"◼":vm==="wireframe"?"⊡":"◻"}
              </button>
            ))}
          </div>

          {isEmpty&&(
            <div className="bl-vp-empty">
              <div style={{fontSize:48,marginBottom:12}}>🪐</div>
              <div className="bl-vp-empty-title">No objects in scene</div>
              <div className="bl-vp-empty-sub">Use Add menu or press Shift+A</div>
              <div className="bl-vp-shortcuts">
                <div className="bl-shortcut-row"><span>G</span><span>Move</span></div>
                <div className="bl-shortcut-row"><span>R</span><span>Rotate</span></div>
                <div className="bl-shortcut-row"><span>S</span><span>Scale</span></div>
                <div className="bl-shortcut-row"><span>F</span><span>To Ground</span></div>
                <div className="bl-shortcut-row"><span>Del</span><span>Delete</span></div>
                <div className="bl-shortcut-row"><span>⌘D</span><span>Duplicate</span></div>
                <div className="bl-shortcut-row"><span>⌘Z</span><span>Undo</span></div>
                <div className="bl-shortcut-row"><span>⌘A</span><span>Select All</span></div>
              </div>
            </div>
          )}
          {bbInfo&&(
            <div className="bl-bb-info">
              <span>W: {bbInfo.w}</span>
              <span>H: {bbInfo.h}</span>
              <span>D: {bbInfo.d}</span>
            </div>
          )}
          {selectedIds.size>1&&(
            <div className="bl-multi-sel">{selectedIds.size} objects selected</div>
          )}
        </div>

        {/* ─── N-PANEL ─── */}
        <div className="bl-npanel">
          {/* Side tabs */}
          <div className="bl-nptabs">
            {(["item","material","object","scene"] as const).map(tab=>(
              <button key={tab} className={`bl-nptab ${npTab===tab?"bl-nptab-on":""}`} onClick={()=>setNpTab(tab)}>
                {tab==="item"?"Item":tab==="material"?"Mat":tab==="object"?"Obj":"Scene"}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="bl-npcontent">

            {/* ITEM TAB */}
            {npTab==="item"&&(
              !primary?(
                <div className="bl-np-empty">Nothing selected</div>
              ):(
                <>
                  <BSection label="Transform">
                    <div className="bl-xyz-group">
                      <div className="bl-xyz-label" style={{color:"#ff6b6b"}}>X</div>
                      <div className="bl-xyz-label" style={{color:"#6bcb77"}}>Y</div>
                      <div className="bl-xyz-label" style={{color:"#4d96ff"}}>Z</div>
                    </div>
                    <div className="bl-xyz-row">
                      <span className="bl-row-lbl">Location</span>
                      <input type="number" step={0.1} value={+primary.pos.x.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setPos(primary.id,"x",v);}} className="bl-xyz-inp bl-x"/>
                      <input type="number" step={0.1} value={+primary.pos.y.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setPos(primary.id,"y",v);}} className="bl-xyz-inp bl-y"/>
                      <input type="number" step={0.1} value={+primary.pos.z.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setPos(primary.id,"z",v);}} className="bl-xyz-inp bl-z"/>
                    </div>
                    <div className="bl-xyz-row">
                      <span className="bl-row-lbl">Rotation</span>
                      <input type="number" step={1} value={+primary.rot.x.toFixed(2)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setRot(primary.id,"x",v);}} className="bl-xyz-inp bl-x"/>
                      <input type="number" step={1} value={+primary.rot.y.toFixed(2)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setRot(primary.id,"y",v);}} className="bl-xyz-inp bl-y"/>
                      <input type="number" step={1} value={+primary.rot.z.toFixed(2)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setRot(primary.id,"z",v);}} className="bl-xyz-inp bl-z"/>
                    </div>
                    <div className="bl-xyz-row">
                      <span className="bl-row-lbl">Scale</span>
                      <input type="number" step={0.1} min={0.001} value={+primary.scl.x.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setScl(primary.id,"x",v);}} className="bl-xyz-inp bl-x"/>
                      <input type="number" step={0.1} min={0.001} value={+primary.scl.y.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setScl(primary.id,"y",v);}} className="bl-xyz-inp bl-y"/>
                      <input type="number" step={0.1} min={0.001} value={+primary.scl.z.toFixed(3)} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setScl(primary.id,"z",v);}} className="bl-xyz-inp bl-z"/>
                    </div>
                  </BSection>
                  {bbInfo&&(
                    <BSection label="Dimensions" open={false}>
                      <div className="bl-dim-row"><span className="bl-dim-lbl" style={{color:"#ff6b6b"}}>W</span><span className="bl-dim-val">{bbInfo.w}</span></div>
                      <div className="bl-dim-row"><span className="bl-dim-lbl" style={{color:"#6bcb77"}}>H</span><span className="bl-dim-val">{bbInfo.h}</span></div>
                      <div className="bl-dim-row"><span className="bl-dim-lbl" style={{color:"#4d96ff"}}>D</span><span className="bl-dim-val">{bbInfo.d}</span></div>
                    </BSection>
                  )}
                </>
              )
            )}

            {/* MATERIAL TAB */}
            {npTab==="material"&&(
              !primary?<div className="bl-np-empty">Nothing selected</div>:(
                <>
                  <BSection label="Surface">
                    <div className="bl-color-row">
                      <span className="bl-lbl">Base Color</span>
                      <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                        <input type="color" value={primary.mat.color}
                          onChange={e=>updateMat(primary.id,{color:e.target.value})}
                          style={{width:32,height:24,border:"1px solid #111",borderRadius:3,cursor:"pointer",padding:1,background:"transparent"}}/>
                        <span style={{fontSize:10,fontFamily:"monospace",color:"#8a8a8a"}}>{primary.mat.color.toUpperCase()}</span>
                      </div>
                    </div>
                    <BSlider label="Roughness" value={primary.mat.roughness} min={0} max={1} onChange={v=>updateMat(primary.id,{roughness:v})}/>
                    <BSlider label="Metallic"  value={primary.mat.metalness} min={0} max={1} onChange={v=>updateMat(primary.id,{metalness:v})}/>
                    <BSlider label="Alpha"     value={primary.mat.opacity}   min={0} max={1} onChange={v=>updateMat(primary.id,{opacity:v})}/>
                  </BSection>
                  <BSection label="Viewport Display" open={false}>
                    <label className="bl-check-row">
                      <input type="checkbox" checked={primary.mat.wire} onChange={e=>updateMat(primary.id,{wire:e.target.checked})} className="bl-check"/>
                      <span>Wireframe</span>
                    </label>
                  </BSection>
                  <BSection label="Color Presets" open={false}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"4px 0"}}>
                      {COLORS.map(c=>(
                        <button key={c} onClick={()=>updateMat(primary.id,{color:c})}
                          style={{width:22,height:22,background:c,border:primary.mat.color===c?"2px solid #fff":"1px solid #111",borderRadius:3,cursor:"pointer",transition:"transform 0.1s"}}
                          onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.2)")}
                          onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
                      ))}
                    </div>
                  </BSection>
                </>
              )
            )}

            {/* OBJECT TAB */}
            {npTab==="object"&&(
              !primary?<div className="bl-np-empty">Nothing selected</div>:(
                <>
                  <BSection label="Object Properties">
                    <div className="bl-row">
                      <span className="bl-lbl">Name</span>
                      <input type="text" value={primary.name} onChange={e=>renameShape(primary.id,e.target.value)} className="bl-inp"/>
                    </div>
                    <label className="bl-check-row">
                      <input type="checkbox" checked={primary.visible} onChange={()=>toggleVisible(primary.id)} className="bl-check"/>
                      <span>Visible in viewport</span>
                    </label>
                    <label className="bl-check-row">
                      <input type="checkbox" checked={primary.locked} onChange={()=>toggleLock(primary.id)} className="bl-check"/>
                      <span>Lock transforms</span>
                    </label>
                  </BSection>
                  <BSection label={`${primary.params.type.charAt(0).toUpperCase()+primary.params.type.slice(1)} Parameters`}>
                    <ShapeParamsEditor params={primary.params} onChange={p=>updateParams(primary.id,p)}/>
                  </BSection>
                  <BSection label="Operations" open={false}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
                      <button onClick={()=>mirrorSelected("x")} className="bl-op-btn">Mirror X</button>
                      <button onClick={()=>mirrorSelected("y")} className="bl-op-btn">Mirror Y</button>
                      <button onClick={()=>mirrorSelected("z")} className="bl-op-btn">Mirror Z</button>
                      <button onClick={centerSelected}  className="bl-op-btn">Center</button>
                      <button onClick={flattenToGround} className="bl-op-btn" style={{gridColumn:"1/-1"}}>Flatten to Ground</button>
                      <button onClick={()=>setArrayModal(true)} className="bl-op-btn" style={{gridColumn:"1/-1"}}>Array Modifier…</button>
                    </div>
                  </BSection>
                </>
              )
            )}

            {/* SCENE TAB */}
            {npTab==="scene"&&(
              <>
                <BSection label="Outliner">
                  {isEmpty?<div className="bl-np-empty">Empty scene</div>:(
                    <ul style={{listStyle:"none",padding:0,margin:0}}>
                      {shapes.map(s=>(
                        <li key={s.id}
                          onClick={e=>{
                            if(s.locked)return;
                            const ns=e.shiftKey?new Set(selectedIds):new Set<string>();
                            ns.has(s.id)?ns.delete(s.id):ns.add(s.id); setSelectedIds(ns);
                            const lastId=[...ns].at(-1);
                            if(lastId){const m=meshMapRef.current.get(lastId);if(m){tcRef.current?.attach(m);updateBBRef.current(m);}}else tcRef.current?.detach();
                          }}
                          style={{
                            display:"flex",alignItems:"center",gap:6,
                            padding:"3px 6px",borderRadius:3,cursor:"pointer",
                            background:selectedIds.has(s.id)?"#214278":"transparent",
                            marginBottom:1,
                          }}>
                          <span style={{width:8,height:8,borderRadius:2,background:s.mat.color,flexShrink:0,border:"1px solid rgba(0,0,0,0.3)"}}/>
                          <span style={{flex:1,fontSize:11,color:selectedIds.has(s.id)?"#fff":"#c8c8c8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
                          <button onClick={e=>{e.stopPropagation();toggleVisible(s.id);}}
                            style={{fontSize:9,background:"none",border:"none",cursor:"pointer",color:"#6a6a6a",padding:0}}>
                            {s.visible?"👁":"🚫"}
                          </button>
                          <button onClick={e=>{e.stopPropagation();toggleLock(s.id);}}
                            style={{fontSize:9,background:"none",border:"none",cursor:"pointer",color:"#6a6a6a",padding:0}}>
                            {s.locked?"🔒":"🔓"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </BSection>
                <BSection label="Viewport Settings" open={false}>
                  <label className="bl-check-row">
                    <input type="checkbox" checked={showGrid} onChange={()=>setShowGrid(v=>!v)} className="bl-check"/>
                    <span>Show Grid</span>
                  </label>
                  <label className="bl-check-row">
                    <input type="checkbox" checked={snapEnabled} onChange={()=>setSnapEnabled(v=>!v)} className="bl-check"/>
                    <span>Snap to Grid</span>
                  </label>
                  {snapEnabled&&(
                    <div className="bl-row">
                      <span className="bl-lbl">Snap Size</span>
                      <select value={snapSize} onChange={e=>setSnapSize(parseFloat(e.target.value))} className="bl-inp">
                        {[0.1,0.25,0.5,1,2].map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  )}
                </BSection>
                <BSection label="Quick Add" open={false}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
                    {SHAPES.map(([type,,label])=>(
                      <button key={type} onClick={()=>addShape(type)} className="bl-op-btn">{label}</button>
                    ))}
                  </div>
                </BSection>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ STATUS BAR ═══ */}
      <div className="bl-statusbar">
        <span>Verts: {shapes.length*100}</span>
        <span className="bl-sb-sep">|</span>
        <span>Objects: {shapes.length}</span>
        <span className="bl-sb-sep">|</span>
        <span style={{color:selectedIds.size?"#4772b3":"inherit"}}>{selectedIds.size} selected</span>
        <span className="bl-sb-sep">|</span>
        <span style={{textTransform:"capitalize"}}>{mode}</span>
        <span className="bl-sb-spacer"/>
        <span>Hist: {histIdx}/{history.length-1}</span>
      </div>

      {/* ═══ ARRAY MODAL ═══ */}
      {arrayModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={()=>setArrayModal(false)}>
          <div style={{background:"#2b2b2b",border:"1px solid #444",borderRadius:6,padding:20,minWidth:280}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:16,color:"#e0e0e0",borderBottom:"1px solid #444",paddingBottom:8}}>Array Modifier</div>
            <div className="bl-row" style={{marginBottom:10}}>
              <span className="bl-lbl">Axis</span>
              <div style={{display:"flex",gap:6,flex:1}}>
                {(["x","y","z"] as const).map(a=>(
                  <button key={a} onClick={()=>setArrayAxis(a)}
                    style={{flex:1,padding:"4px 0",background:arrayAxis===a?"#4772b3":"#3d3d3d",border:"1px solid #555",borderRadius:3,color:"#e0e0e0",cursor:"pointer",fontWeight:arrayAxis===a?700:400,textTransform:"uppercase",fontSize:11}}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="bl-row" style={{marginBottom:10}}>
              <span className="bl-lbl">Count</span>
              <input type="number" value={arrayCount} min={2} max={20} onChange={e=>setArrayCount(parseInt(e.target.value)||2)} className="bl-inp" style={{width:60}}/>
            </div>
            <div className="bl-row" style={{marginBottom:16}}>
              <span className="bl-lbl">Spacing</span>
              <input type="number" value={arraySpacing} step={0.1} onChange={e=>setArraySpacing(parseFloat(e.target.value)||1)} className="bl-inp" style={{width:60}}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setArrayModal(false)} style={{padding:"5px 14px",background:"#3d3d3d",border:"1px solid #555",borderRadius:3,color:"#c8c8c8",cursor:"pointer",fontSize:11}}>Cancel</button>
              <button onClick={()=>{applyArray();setArrayModal(false);}} style={{padding:"5px 14px",background:"#4772b3",border:"none",borderRadius:3,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:11}}>Apply</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;}
        .bl-wrap{display:flex;flex-direction:column;height:100%;background:#1d1d1d;font-family:'Inter',system-ui,sans-serif;color:#c8c8c8;font-size:11px;user-select:none;}
        .bl-menubar{display:flex;align-items:center;height:28px;background:#3d3d3d;border-bottom:1px solid #111;flex-shrink:0;gap:0;}
        .bl-logo{padding:0 10px;font-weight:800;font-size:12px;color:#fff;letter-spacing:0.5px;opacity:0.9;}
        .bl-menu-btn{position:relative;padding:0 10px;height:100%;background:none;border:none;color:#c8c8c8;cursor:pointer;font-size:11px;display:flex;align-items:center;}
        .bl-menu-btn:hover{background:#555;}
        .bl-menu-btn.active{background:#4772b3;color:#fff;}
        .bl-dropdown{position:absolute;top:28px;left:0;background:#2b2b2b;border:1px solid #111;min-width:180px;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,0.6);}
        .bl-dd-item{display:flex;align-items:center;justify-content:space-between;padding:5px 12px;cursor:pointer;white-space:nowrap;gap:20px;}
        .bl-dd-item:hover{background:#4772b3;color:#fff;}
        .bl-dd-item kbd{font-size:9px;opacity:0.6;font-family:monospace;}
        .bl-dd-sep{height:1px;background:#3d3d3d;margin:2px 0;}
        .bl-main{display:flex;flex:1;overflow:hidden;}
        .bl-toolbar{display:flex;flex-direction:column;width:36px;background:#3d3d3d;border-right:1px solid #111;flex-shrink:0;padding:3px 0;gap:2px;align-items:center;}
        .bl-tool-btn{width:28px;height:28px;background:none;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#999;transition:background 0.15s,color 0.15s;}
        .bl-tool-btn:hover{background:#555;color:#fff;}
        .bl-tool-btn.active{background:#4772b3;color:#fff;}
        .bl-tool-sep{width:24px;height:1px;background:#555;margin:3px 0;}
        .bl-viewport{position:relative;flex:1;background:#3d3d3d;overflow:hidden;}
        .bl-canvas{width:100%;height:100%;}
        .bl-overlay-tl{position:absolute;top:8px;left:8px;font-size:10px;color:#aaa;pointer-events:none;text-shadow:0 1px 3px #000;}
        .bl-overlay-bl{position:absolute;bottom:8px;left:8px;font-size:10px;color:#aaa;pointer-events:none;text-shadow:0 1px 3px #000;display:flex;flex-direction:column;gap:2px;}
        .bl-shading-sw{position:absolute;top:8px;right:50px;display:flex;gap:2px;}
        .bl-shd-btn{padding:2px 7px;background:rgba(30,30,30,0.8);border:1px solid #555;border-radius:3px;color:#aaa;cursor:pointer;font-size:10px;transition:all 0.15s;}
        .bl-shd-btn:hover{background:#555;color:#fff;}
        .bl-shd-btn.active{background:#4772b3;border-color:#4772b3;color:#fff;}
        .bl-bbinfo{position:absolute;bottom:8px;right:8px;background:rgba(20,20,20,0.85);border:1px solid #333;border-radius:4px;padding:6px 10px;font-size:10px;color:#aaa;pointer-events:none;line-height:1.7;}
        .bl-empty-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;gap:8px;}
        .bl-empty-title{font-size:18px;color:#555;font-weight:600;}
        .bl-shortcuts{display:grid;grid-template-columns:auto auto;gap:2px 16px;margin-top:8px;}
        .bl-sc-key{background:#333;border:1px solid #555;border-radius:3px;padding:1px 6px;font-family:monospace;font-size:10px;color:#aaa;}
        .bl-sc-lbl{font-size:10px;color:#555;}
        .bl-npanel{display:flex;background:#2b2b2b;border-left:1px solid #111;flex-shrink:0;width:220px;}
        .bl-np-tabs{display:flex;flex-direction:column;width:24px;background:#3d3d3d;border-right:1px solid #111;}
        .bl-np-tab{writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);padding:12px 4px;cursor:pointer;font-size:10px;font-weight:600;letter-spacing:0.5px;color:#888;border-left:2px solid transparent;transition:all 0.15s;text-transform:uppercase;}
        .bl-np-tab:hover{color:#ddd;background:#444;}
        .bl-np-tab.active{color:#fff;background:#4772b3;border-left-color:#76a8e0;}
        .bl-np-content{flex:1;overflow-y:auto;padding:4px;scrollbar-width:thin;scrollbar-color:#555 #2b2b2b;}
        .bl-np-empty{padding:20px;text-align:center;color:#555;font-size:11px;}
        .bl-section{margin-bottom:2px;}
        .bl-sec-hdr{display:flex;align-items:center;gap:6px;padding:5px 6px;background:#3d3d3d;border-radius:3px;cursor:pointer;font-weight:600;color:#c8c8c8;font-size:11px;user-select:none;}
        .bl-sec-hdr:hover{background:#444;}
        .bl-sec-body{padding:4px 2px;}
        .bl-row{display:flex;align-items:center;gap:6px;padding:2px 4px;min-height:22px;}
        .bl-lbl{flex-shrink:0;width:64px;color:#8a8a8a;font-size:10px;}
        .bl-inp{flex:1;background:#1d1d1d;border:1px solid #3a3a3a;border-radius:3px;padding:2px 6px;color:#e0e0e0;font-size:11px;height:22px;outline:none;}
        .bl-inp:focus{border-color:#4772b3;box-shadow:0 0 0 1px #4772b3;}
        .bl-num{background:#1d1d1d;border:1px solid #3a3a3a;border-radius:3px;padding:2px 4px;color:#e0e0e0;font-size:10px;height:22px;width:60px;text-align:right;outline:none;}
        .bl-num:focus{border-color:#4772b3;}
        .bl-xyz-row{display:flex;align-items:center;gap:4px;padding:2px 4px;}
        .bl-xyz-lbl{width:60px;flex-shrink:0;color:#8a8a8a;font-size:10px;}
        .bl-xyz-x{background:#3d1d1d;border:1px solid #6a2a2a;}
        .bl-xyz-y{background:#1d3d1d;border:1px solid #2a6a2a;}
        .bl-xyz-z{background:#1d1d3d;border:1px solid #2a2a6a;}
        .bl-xyz-x,.bl-xyz-y,.bl-xyz-z{flex:1;border-radius:3px;padding:2px 4px;color:#e0e0e0;font-size:10px;height:22px;text-align:right;outline:none;}
        .bl-xyz-x:focus,.bl-xyz-y:focus,.bl-xyz-z:focus{box-shadow:0 0 0 1px #4772b3;}
        .bl-dim-row{display:flex;align-items:center;gap:4px;padding:2px 4px;}
        .bl-dim-lbl{width:60px;flex-shrink:0;color:#8a8a8a;font-size:10px;}
        .bl-dim-v{flex:1;border-radius:3px;padding:2px 4px;color:#aaa;font-size:10px;height:22px;text-align:right;background:#252525;border:1px solid #333;}
        .bl-slider-row{display:flex;align-items:center;gap:6px;padding:2px 4px;}
        .bl-slider-lbl{flex-shrink:0;width:64px;color:#8a8a8a;font-size:10px;}
        .bl-slider{flex:1;accent-color:#4772b3;cursor:pointer;height:3px;}
        .bl-slider-val{width:36px;text-align:right;color:#c8c8c8;font-size:10px;font-family:monospace;}
        .bl-check-row{display:flex;align-items:center;gap:8px;padding:3px 8px;cursor:pointer;}
        .bl-check{accent-color:#4772b3;}
        .bl-color-row{display:flex;align-items:center;gap:6px;padding:2px 4px;min-height:26px;}
        .bl-op-btn{padding:3px 6px;background:#3d3d3d;border:1px solid #555;border-radius:3px;color:#c8c8c8;cursor:pointer;font-size:10px;transition:background 0.15s;}
        .bl-op-btn:hover{background:#4772b3;border-color:#4772b3;color:#fff;}
        .bl-statusbar{display:flex;align-items:center;height:22px;background:#3d3d3d;border-top:1px solid #111;flex-shrink:0;padding:0 10px;gap:0;font-size:10px;color:#777;}
        .bl-sb-sep{margin:0 8px;color:#555;}
        .bl-sb-spacer{flex:1;}
        .bl-menu-spacer{flex:1;}
        @media (max-width:900px){.bl-npanel{width:200px;}}
      `}</style>
    </div>
  );
}

