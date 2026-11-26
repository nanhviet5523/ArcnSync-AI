import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Button, ErrorState } from '@/components/ui';
import { errorText, t } from '@/i18n';
import { STAGE_BG } from '@/features/design-workspace/view';
import { handoverApi } from './handoverApi';

function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      for (const value of Object.values(mat)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      mat.dispose();
    }
  });
}

function frameModel(root: THREE.Object3D, camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) {
    camera.position.set(3, 2, 3);
    controls.target.set(0, 0, 0);
    controls.update();
    return;
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.5);
  const fovRad = (camera.fov * Math.PI) / 180;
  const dist = (maxDim / (2 * Math.tan(fovRad / 2))) * 1.45;
  controls.target.copy(center);
  camera.position.set(center.x + dist * 0.65, center.y + dist * 0.45, center.z + dist * 0.85);
  camera.near = Math.max(maxDim / 1000, 0.01);
  camera.far = Math.max(maxDim * 50, 200);
  camera.updateProjectionMatrix();
  controls.minDistance = maxDim * 0.2;
  controls.maxDistance = maxDim * 8;
  controls.update();
}

/**
 * Standalone Three.js GLB previewer for handover 3D models.
 * Fetches the .glb via the authenticated preview route into an object URL, loads it with GLTFLoader,
 * revokes the object URL once loaded/unmounted, and disposes WebGL resources on unmount.
 */
export function GlbPreviewCanvas({ assetId }: { assetId: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError('');
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let alive = true;
    const ac = new AbortController();
    let objectUrl: string | null = null;
    let modelRoot: THREE.Object3D | null = null;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth, Math.max(el.clientHeight, 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(STAGE_BG);

    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / Math.max(el.clientHeight, 1), 0.05, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    scene.add(new THREE.HemisphereLight('#ffffff', '#c7c2b8', 1.4));
    const keyLight = new THREE.DirectionalLight('#fffaf2', 1.4);
    keyLight.position.set(8, 14, 10);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#dce8ff', 0.6);
    fillLight.position.set(-8, 6, -8);
    scene.add(fillLight);

    const ro = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    void (async () => {
      try {
        const blob = await handoverApi.previewBlob(assetId, ac.signal);
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        const gltf = await new GLTFLoader().loadAsync(objectUrl);
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
        if (!alive) {
          disposeObject(gltf.scene);
          return;
        }
        modelRoot = gltf.scene;
        scene.add(modelRoot);
        frameModel(modelRoot, camera, controls);
        resetRef.current = () => { if (modelRoot) frameModel(modelRoot, camera, controls); };
        setLoading(false);
      } catch (e) {
        if (!alive || ac.signal.aborted) return;
        setError(errorText(e));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
      resetRef.current = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      if (modelRoot) disposeObject(modelRoot);
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [assetId, attempt]);

  return (
    <div className="space-y-2">
      <div className="relative h-[58vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-line bg-stage">
        <div ref={mountRef} className="h-full w-full touch-none overscroll-contain" />
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stage/85 text-sm text-slate-600">
            <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
            <span>{t('handover.loadingModel')}</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/95 p-6">
            <div className="w-full max-w-md">
              <ErrorState message={error} onRetry={retry} />
            </div>
          </div>
        )}
        {!loading && !error && (
          <div className="absolute right-3 top-3">
            <Button size="sm" onClick={() => resetRef.current?.()}>
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              {t('handover.resetView')}
            </Button>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">{t('handover.modelControlsHint')}</p>
    </div>
  );
}
