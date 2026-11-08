import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { ApiError, fetchBlobUrl } from '@/services/authService';
import { t } from '@/i18n';
import { designApi } from './designApi';
import { STAGE_BG } from './view';
import type { ClickPoint } from './Plan2D';
import type { DesignElement, Opening, Pt, VersionFloor } from './types';

export type NavMode = 'orbit' | 'pan';

/** Commands for the floating canvas toolbar and the "⋯" menu. */
export interface Scene3DHandle {
  resetView(): void;
  /** Download .glb / save .png: only the project's designer (can('exportFiles')); the caller decides. */
  exportGlb(): void;
  savePng(): void;
}

interface Props {
  floors: VersionFloor[];
  elements: DesignElement[];
  /** One floor at a time. */
  floorId: string;
  selectedId: string | null;
  onPick: (e: DesignElement | null, at: ClickPoint) => void;
  fileName: string;
  navMode: NavMode;
  /** Selected room: camera moves to it and its floor is tinted. key changes → move again. */
  room?: { key: string; center: Pt; boundary: Pt[] | null } | null;
  onExportError?: () => void;
  ref?: Ref<Scene3DHandle>;
}

interface Ctx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  content: THREE.Group;
  helper: THREE.BoxHelper | null;
  roomMark: THREE.Mesh | null;
  models: Map<string, Promise<GLTF>>;
}

const WALL = new THREE.Color('#eeeae2');
const own = (m: THREE.Object3D) => { m.userData.own = true; return m; };
const box = (w: number, h: number, d: number, color: string | THREE.Color, opts: THREE.MeshStandardMaterialParameters = {}) =>
  own(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, ...opts })));

function disposeOwn(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!o.userData.own || !(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

// Cửa / cửa sổ khoét tường (port wallCuts.js của prototype). Outline CCW, hole CW: vật liệu tường luôn ở bên TRÁI mỗi cạnh.
type Loop = Pt[];
type Hit = { t: number; li: number; i: number; e: Pt; a: Pt };
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const along = (p: Pt, d: Pt, t: number): Pt => [p[0] + d[0] * t, p[1] + d[1] * t];
const signedArea = (l: Loop) => l.reduce((acc, a, i) => acc + cross(a, l[(i + 1) % l.length]), 0) / 2;
const inLoop = ([x, y]: Pt, loop: Loop) => {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, yi] = loop[i], [xj, yj] = loop[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const run = (loop: Loop, a: number, b: number) => {
  const n = loop.length, out: Loop = [];
  for (let k = 0, len = ((b - a) % n + n) % n; k <= len; k++) out.push(loop[(a + k) % n]);
  return out;
};
const frameOf = (o: Opening) => {
  const u: Pt = [Math.cos(o.rotation), Math.sin(o.rotation)];
  return { u, n: [-u[1], u[0]] as Pt, centre: along([o.x, o.y], u, o.width / 2) };
};

function cutWalls(walls: SceneWalls, openings: Opening[]) {
  const owner = new Map<Loop, number>();
  let loops: Loop[] = [];
  const add = (l: Loop, i: number) => { owner.set(l, i); loops.push(l); };
  walls.forEach((w, i) => {
    add(signedArea(w.outer) >= 0 ? w.outer : [...w.outer].reverse(), i);
    w.holes.forEach((h) => add(signedArea(h) <= 0 ? h : [...h].reverse(), i));
  });
  const cuts = new Map<Opening, { thickness: number; middle: Pt }>();
  for (const o of openings) {
    const { u, n, centre } = frameOf(o);
    const nearest = (dir: Pt) => {
      let best: Hit | null = null;
      loops.forEach((loop, li) => loop.forEach((a, i) => {
        if (owner.get(loop) !== o.wall_index) return;
        const e = sub(loop[(i + 1) % loop.length], a), denom = cross(dir, e);
        if (Math.abs(denom) < 1e-12) return;
        const ap = sub(a, centre), t = cross(ap, e) / denom, k = cross(ap, dir) / denom;
        if (t > 1e-6 && k >= -1e-9 && k <= 1 + 1e-9 && (!best || t < best.t)) best = { t, li, i, e, a };
      }));
      return best as Hit | null;
    };
    const back = nearest(n), fwd = nearest([-n[0], -n[1]]);
    const parallel = (h: Hit, sign: number) => Math.abs(cross(h.e, u)) / Math.hypot(...h.e) < 0.02 && Math.sign(dot(h.e, u)) === sign;
    if (!back || !fwd || !parallel(back, -1) || !parallel(fwd, 1) || back.t + fwd.t > 1.5) continue;
    const half = o.width / 2, pB = along(centre, n, back.t), pF = along(centre, n, -fwd.t);
    const A0 = along(pF, u, -half), A1 = along(pF, u, half), B0 = along(pB, u, -half), B1 = along(pB, u, half);
    const within = (h: Hit, p: Pt) => { const k = dot(sub(p, h.a), h.e) / dot(h.e, h.e); return k >= -1e-6 && k <= 1 + 1e-6; };
    if (![A0, A1].every((p) => within(fwd, p)) || ![B0, B1].every((p) => within(back, p))) continue;
    const Lf = loops[fwd.li], Lb = loops[back.li];
    const made = fwd.li === back.li
      ? [[A0, B0, ...run(Lf, back.i + 1, fwd.i)], [A1, ...run(Lf, fwd.i + 1, back.i), B1]]
      : [[A0, B0, ...run(Lb, back.i + 1, back.i), B1, A1, ...run(Lf, fwd.i + 1, fwd.i)]];
    const fresh = made
      .map((l) => l.filter((p, i) => Math.hypot(...sub(p, l[(i + 1) % l.length])) > 1e-7))
      .filter((l) => l.length >= 3 && Math.abs(signedArea(l)) > 1e-9);
    fresh.forEach((l) => owner.set(l, o.wall_index!));
    loops = [...loops.filter((l) => l !== Lf && l !== Lb), ...fresh];
    cuts.set(o, { thickness: back.t + fwd.t, middle: [(pB[0] + pF[0]) / 2, (pB[1] + pF[1]) / 2] });
  }
  const out = loops.filter((l) => signedArea(l) > 0).map((outer) => ({ outer, holes: [] as Loop[] }));
  for (const h of loops.filter((l) => signedArea(l) < 0)) {
    const host = out.filter((w) => inLoop(h[0], w.outer)).sort((a, b) => signedArea(a.outer) - signedArea(b.outer))[0];
    host?.holes.push(h);
  }
  return { walls: out, cuts };
}

function cutSegment([a, b]: [Pt, Pt], openings: Opening[]) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const spans = openings.map((o) => { const c = dot(sub(frameOf(o).centre, a), u); return [c - o.width / 2, c + o.width / 2]; }).sort((p, q) => p[0] - q[0]);
  const pieces: [Pt, Pt][] = [];
  let at = 0;
  for (const [st, en] of spans) {
    if (st - at > 1e-6) pieces.push([along(a, u, at), along(a, u, st)]);
    at = Math.max(at, en);
  }
  if (len - at > 1e-6) pieces.push([along(a, u, at), along(a, u, len)]);
  return pieces;
}
type SceneWalls = VersionFloor['scene_json']['walls'];

const mountY = (e: DesignElement, wallH: number, h: number) => {
  if (e.element_type === 'FURNITURE') return 0;
  const m = e.overrides?.mountHeight ?? (e.product?.specifications?.mountHeight as number | undefined);
  if (m != null) return m;
  return e.element_type === 'LIGHTING' ? wallH - h : 1.2;
};

type ModelIssue = 'blocked' | 'missing';
const loader = new GLTFLoader();
/** Món đã chọn mẫu: model qua API (cần token). Lỗi quyền thì báo, không âm thầm thay bằng model minh hoạ. */
function loadModel(models: Ctx['models'], e: DesignElement, report: (id: string, issue: ModelIssue) => void): Promise<GLTF> | null {
  const load = (key: string, get: () => Promise<GLTF>) => {
    if (!models.has(key)) models.set(key, get());
    return models.get(key)!;
  };
  const fallback = () => (e.default_model_url ? load(e.default_model_url, () => loader.loadAsync(e.default_model_url!)) : Promise.reject(new Error('no model')));
  if (!e.product) return e.default_model_url ? fallback() : null;
  const path = designApi.elementModelPath(e.id, e.product.id);
  return load(path, () => fetchBlobUrl(path).then((url) => loader.loadAsync(url))).catch((err) => {
    models.delete(path);
    if (err instanceof ApiError && err.code === 'PRODUCT_FILE_NOT_FOUND') { report(e.id, 'missing'); return fallback(); }
    report(e.id, 'blocked');
    throw err;
  });
}

function buildFloor(f: VersionFloor, els: DesignElement[], models: Ctx['models'], alive: () => boolean, report: (id: string, issue: ModelIssue) => void) {
  const g = new THREE.Group();
  const s = f.scene_json;
  const wallMat = new THREE.MeshStandardMaterial({ color: WALL });
  const H = s.wall_height;
  const wallBox = (w: number, h: number, d: number, [x, y]: Pt, y0: number, rot: number) => {
    const m = box(w, h, d, WALL);
    m.position.set(x, y0 + h / 2, -y);
    m.rotation.y = rot;
    g.add(m);
  };
  const { walls, cuts } = cutWalls(s.walls, s.openings.filter((o) => o.wall_kind === 'wall'));
  for (const w of walls) {
    const shape = new THREE.Shape(w.outer.map(([x, y]) => new THREE.Vector2(x, y)));
    w.holes.forEach((h) => shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    g.add(own(new THREE.Mesh(geo, wallMat)));
  }
  s.wall_segments.forEach((seg, si) => {
    for (const [a, b] of cutSegment(seg, s.openings.filter((o) => o.wall_kind === 'segment' && o.wall_index === si))) {
      wallBox(Math.hypot(b[0] - a[0], b[1] - a[1]), H, s.wall_thickness, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], 0, Math.atan2(b[1] - a[1], b[0] - a[0]));
    }
  });
  for (const o of s.openings) {
    const door = o.type === 'door';
    const sill = door ? 0 : 0.9, h = Math.min(door ? 2.1 : 1.2, H - sill);
    const cut = cuts.get(o) ?? (o.wall_kind === 'segment' ? { thickness: s.wall_thickness, middle: frameOf(o).centre } : null);
    const mid = cut?.middle ?? frameOf(o).centre;
    if (cut) {
      if (H - sill - h > 1e-3) wallBox(o.width, H - sill - h, cut.thickness, mid, sill + h, o.rotation);
      if (sill > 1e-3) wallBox(o.width, sill, cut.thickness, mid, 0, o.rotation);
    }
    const m = box(o.width, h, door ? 0.04 : 0.02, door ? '#8b5e3c' : '#9fd3f0', door ? {} : { transparent: true, opacity: 0.4, depthWrite: false });
    m.position.set(mid[0], sill + h / 2, -mid[1]);
    m.rotation.y = o.rotation;
    g.add(m);
  }
  const bb = new THREE.Box3().setFromObject(g);
  const size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const slab = box(size.x + 1, 0.05, size.z + 1, '#c9b79c');
  slab.position.set(c.x, -0.025, c.z);
  g.add(slab);

  let lights = 0;
  for (const e of els) {
    const w = e.width_mm / 1000, d = Math.max(e.depth_mm / 1000, 0.03);
    const h = (e.product?.height_mm ?? e.height_mm) / 1000;
    const item = new THREE.Group();
    item.userData.elementId = e.id;
    item.position.set(e.position.x, mountY(e, s.wall_height, h), -e.position.y);
    item.rotation.y = (e.position.rotation_deg * Math.PI) / 180;
    const off = e.overrides?.on === false;
    const color = e.product ? '#b8a48a' : e.category ? '#c8bba8' : '#9e9e9e';
    const ph = box(w, h, d, color, e.element_type === 'LIGHTING' && !off ? { emissive: '#ffe9a8', emissiveIntensity: 0.8 } : {});
    ph.position.y = h / 2;
    item.add(ph);
    if (e.element_type === 'LIGHTING' && !off && lights++ < 8) {
      const light = new THREE.PointLight('#fff1d6', 0.6, 4);
      light.position.y = -0.1;
      item.add(light);
    }
    const pending = loadModel(models, e, report);
    if (pending) {
      pending.then((gltf) => {
        if (!alive()) return;
        const model = gltf.scene.clone(true);
        const mb = new THREE.Box3().setFromObject(model);
        const ms = mb.getSize(new THREE.Vector3());
        model.scale.set(w / (ms.x || 1), h / (ms.y || 1), d / (ms.z || 1));
        const fit = new THREE.Box3().setFromObject(model);
        const fc = fit.getCenter(new THREE.Vector3());
        model.position.set(-fc.x, -fit.min.y, -fc.z);
        item.remove(ph);
        disposeOwn(ph);
        item.add(model);
      }).catch(() => undefined);
    }
    g.add(item);
  }
  return g;
}

export function Scene3D({ floors, elements, floorId, selectedId, onPick, fileName, navMode, room, onExportError, ref }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const pickRef = useRef(onPick);
  const fitKey = useRef('');
  const [issues, setIssues] = useState<Record<string, ModelIssue>>({});
  const blocked = elements.filter((e) => issues[e.id] === 'blocked').length;
  const missing = elements.filter((e) => issues[e.id] === 'missing').length;
  const elsRef = useRef(elements);
  useEffect(() => { pickRef.current = onPick; elsRef.current = elements; });

  const fitView = () => {
    const c = ctx.current;
    if (!c) return;
    const bb = new THREE.Box3().setFromObject(c.content);
    if (bb.isEmpty()) return;
    const size = bb.getSize(new THREE.Vector3()), center = bb.getCenter(new THREE.Vector3());
    const dist = Math.max(size.x, size.z) * 1.1;
    c.camera.position.set(center.x + dist * 0.35, center.y + dist * 1.2, center.z + dist * 0.85);
    c.controls.target.copy(center);
    c.controls.update();
  };

  useEffect(() => {
    const el = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(STAGE_BG);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(6, 14, 8);
    scene.add(sun);
    const content = new THREE.Group();
    scene.add(content);
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / Math.max(el.clientHeight, 1), 0.1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    ctx.current = { renderer, scene, camera, controls, content, helper: null, roomMark: null, models: new Map() };
    fitKey.current = '';

    let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
      const r = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      let o: THREE.Object3D | null = ray.intersectObject(content, true).find((h) => h.object !== ctx.current?.roomMark)?.object ?? null;
      while (o && !o.userData.elementId) o = o.parent;
      const id = o?.userData.elementId as string | undefined;
      pickRef.current(id ? elsRef.current.find((x) => x.id === id) ?? null : null, { clientX: e.clientX, clientY: e.clientY });
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / Math.max(el.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);
    renderer.setAnimationLoop(() => { controls.update(); ctx.current?.helper?.update(); renderer.render(scene, camera); });

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      disposeOwn(scene);
      ctx.current?.models.forEach((p) => p.then((g) => g.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }
      })).catch(() => undefined));
      renderer.dispose();
      renderer.forceContextLoss();
      el.removeChild(renderer.domElement);
      ctx.current = null;
    };
  }, []);

  // Orbit: left drag rotates. Pan: left drag pans, right drag rotates.
  useEffect(() => {
    const c = ctx.current!;
    c.controls.mouseButtons = navMode === 'pan'
      ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    c.controls.touches = navMode === 'pan'
      ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }
      : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  }, [navMode]);

  useEffect(() => {
    const c = ctx.current!;
    let alive = true;
    disposeOwn(c.content);
    c.content.clear();
    c.roomMark = null;
    const cur = floors.find((f) => f.id === floorId) ?? [...floors].sort((a, b) => a.level - b.level)[0];
    if (cur) {
      const g = buildFloor(cur, elements.filter((e) => e.floor_id === cur.id), c.models, () => alive, (id, issue) => alive && setIssues((m) => (m[id] === issue ? m : { ...m, [id]: issue })));
      c.content.add(g);
      if (fitKey.current !== cur.id) { fitView(); fitKey.current = cur.id; }
    }
    return () => { alive = false; };
  }, [floors, elements, floorId]);

  // Selected room: tint its floor and move the camera over it (only when the room changes).
  const roomKey = room?.key ?? null;
  const lastRoom = useRef<string | null>(null);
  useEffect(() => {
    const c = ctx.current!;
    if (c.roomMark) { c.content.remove(c.roomMark); disposeOwn(c.roomMark); c.roomMark = null; }
    if (!room) { lastRoom.current = null; return; }
    if (room.boundary) {
      const shape = new THREE.Shape(room.boundary.map(([x, y]) => new THREE.Vector2(x, y)));
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const mark = own(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#2563eb', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }))) as THREE.Mesh;
      mark.position.y = 0.012;
      mark.renderOrder = 2;
      c.content.add(mark);
      c.roomMark = mark;
    }
    if (lastRoom.current === room.key) return;
    lastRoom.current = room.key;
    const pts = room.boundary ?? [room.center];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 3);
    const target = new THREE.Vector3(room.center[0], 0.8, -room.center[1]);
    const dist = span * 1.25;
    c.controls.target.copy(target);
    c.camera.position.set(target.x + dist * 0.35, target.y + dist * 1.1, target.z + dist * 0.8);
    c.controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomKey, elements, floorId]);

  useEffect(() => {
    const c = ctx.current!;
    if (c.helper) { c.scene.remove(c.helper); c.helper.dispose(); c.helper = null; }
    let target: THREE.Object3D | undefined;
    c.content.traverse((o) => { if (o.userData.elementId === selectedId) target = o; });
    if (target) {
      c.helper = new THREE.BoxHelper(target, 0x2563eb);
      (c.helper.material as THREE.LineBasicMaterial).depthTest = false;
      c.helper.renderOrder = 999;
      c.scene.add(c.helper);
    }
  }, [selectedId, elements, floorId]);

  const download = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  useImperativeHandle(ref, () => ({
    resetView: fitView,
    exportGlb() {
      const c = ctx.current!;
      const mark = c.roomMark;
      if (mark) c.content.remove(mark);
      new GLTFExporter().parse(c.content, (res) => download(new Blob([res as ArrayBuffer], { type: 'model/gltf-binary' }), `${fileName}.glb`),
        () => onExportError?.(), { binary: true });
      if (mark) c.content.add(mark);
    },
    savePng() {
      const c = ctx.current!;
      c.renderer.render(c.scene, c.camera);
      c.renderer.domElement.toBlob((b) => b && download(b, `${fileName}.png`));
    },
  }));

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {(blocked > 0 || missing > 0) && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-xs space-y-1 text-xs">
          {blocked > 0 && <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-rose-700 shadow-card">{t('scene.blocked', { n: blocked })}</p>}
          {missing > 0 && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800 shadow-card">{t('scene.missing', { n: missing })}</p>}
        </div>
      )}
    </div>
  );
}
