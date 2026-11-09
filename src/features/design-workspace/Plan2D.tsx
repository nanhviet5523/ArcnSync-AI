import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, Ref } from 'react';
import { t } from '@/i18n';
import type { DesignElement, Pt, VersionFloor } from './types';
import { DIFF_COLORS, isUnknownItem } from './logic';
import type { DiffKind } from './logic';
import { clusterPins, frame, MAX_ZOOM, STAGE_BG, wheelFactor, zoomLevel, zoomViewAt } from './view';
import type { PinGroup, ViewBox } from './view';

export type { ViewBox };
/** Zoom buttons and shortcuts. k < 1 zooms in. */
export interface Plan2DHandle { zoomBy(k: number): void }
export interface ClickPoint { clientX: number; clientY: number }

export interface Layers { interior: boolean; furniture: boolean; wallItems: boolean; lights: boolean }
/** num = null: ghim tạm của comment đang viết */
export interface Pin { id: string; num: number | null; x: number; y: number; resolved: boolean; active: boolean }

interface Props {
  floor: VersionFloor;
  elements: DesignElement[];
  layers: Layers;
  selectedId?: string | null;
  /** at = pointer position in the viewport, for anchoring a popover where the user clicked. */
  onSelect?: (e: DesignElement | null, at?: ClickPoint) => void;
  pins?: Pin[];
  onPinClick?: (id: string) => void;
  onEmptyClick?: (p: { x: number; y: number }, at: ClickPoint) => void;
  /** màu Compare theo id món */
  highlight?: Record<string, DiffKind>;
  /** Toạ độ (mét, DXF) cần đưa vào giữa khung; key đổi thì khung cuộn tới. */
  focus?: { key: string; x: number; y: number } | null;
  /** Outline of the selected room (DXF metres), tinted on the plan. */
  room?: Pt[] | null;
  /** Outlines of rooms the viewer cannot edit, faded over their items. */
  dimmed?: Pt[][];
  /** Controlled view: pass both to drive zoom/pan from outside (reset, room zoom, synced compare). */
  view?: ViewBox | null;
  onViewChange?: (v: ViewBox | null) => void;
  /** false = static picture (thumbnails): no zoom, pan, clicks or pins. */
  interactive?: boolean;
  ref?: Ref<Plan2DHandle>;
}

const PAPER = '#ffffff';
const INK = '#2b3445';

const LAYER_OF: Record<DesignElement['element_type'], keyof Layers> = {
  FURNITURE: 'furniture', APPLIANCE: 'furniture', FINISH_MATERIAL: 'furniture', OTHER: 'furniture', DECOR: 'wallItems', LIGHTING: 'lights',
};
const ring = (l: Pt[]) => `M${l.map(([x, y]) => `${x},${-y}`).join('L')}Z`;
const deg = (r: number) => (-r * 180) / Math.PI;

export function Plan2D({ floor, elements, layers, selectedId, onSelect, pins = [], onPinClick, onEmptyClick, highlight, focus, room, dimmed, view: viewProp, onViewChange, interactive = true, ref }: Props) {
  const s = floor.scene_json;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const fit = useMemo(
    () => frame([...s.walls.flatMap((w) => w.outer), ...s.wall_segments.flat(), ...elements.map((e) => [e.position.x, e.position.y] as Pt)]),
    [s, elements],
  );
  const [inner, setInner] = useState<ViewBox | null>(null);
  const controlled = onViewChange !== undefined;
  const view = controlled ? viewProp ?? null : inner;
  const vb = view ?? fit;
  const setView = (v: ViewBox | null) => (controlled ? onViewChange!(v) : setInner(v));
  const vbRef = useRef(vb);
  const fitRef = useRef(fit);
  const setViewRef = useRef(setView);
  useEffect(() => { vbRef.current = vb; fitRef.current = fit; setViewRef.current = setView; });

  useImperativeHandle(ref, () => ({
    zoomBy(k) {
      const v = vbRef.current;
      const next = zoomViewAt(v, fitRef.current, k, { x: v.x + v.w / 2, y: v.y + v.h / 2 });
      vbRef.current = next;
      setViewRef.current(next);
    },
  }), []);

  // Native listener: React's onWheel is passive, so it could not stop a touchpad pinch from zooming the whole page.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !interactive) return;
    let frameId = 0, factor = 1, cx = 0, cy = 0;
    const flush = () => {
      frameId = 0;
      // viewBox default is xMidYMid meet: the drawing may be letterboxed inside the element
      const v = vbRef.current, r = svg.getBoundingClientRect();
      const sc = Math.min(r.width / v.w, r.height / v.h);
      const anchor = { x: v.x + (cx - r.left - (r.width - v.w * sc) / 2) / sc, y: v.y + (cy - r.top - (r.height - v.h * sc) / 2) / sc };
      const next = zoomViewAt(v, fitRef.current, factor, anchor);
      factor = 1;
      vbRef.current = next;
      setViewRef.current(next);
    };
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      factor *= wheelFactor(e);
      cx = e.clientX; cy = e.clientY;
      if (!frameId) frameId = requestAnimationFrame(flush);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => { svg.removeEventListener('wheel', onWheel); cancelAnimationFrame(frameId); };
  }, [interactive]);

  // Bấm thẻ comment: đưa ghim vào giữa khung (giữ mức zoom hiện tại)
  const focusKey = focus?.key ?? null;
  useEffect(() => {
    if (!focus) return;
    const cur = vbRef.current;
    setView({ ...cur, x: focus.x - cur.w / 2, y: -focus.y - cur.h / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const toPlan = (cx: number, cy: number) => {
    const p = new DOMPoint(cx, cy).matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const onDown = (e: PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || !(e.buttons & 1)) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    const v = vbRef.current;
    const r = svgRef.current!.getBoundingClientRect();
    const scale = 1 / Math.min(r.width / v.w, r.height / v.h);
    const next = { ...v, x: v.x - dx * scale, y: v.y - dy * scale };
    vbRef.current = next;
    setView(next);
    d.x = e.clientX; d.y = e.clientY;
  };
  const wasDrag = () => drag.current?.moved;
  const onBgClick = (e: MouseEvent) => {
    if (wasDrag()) return;
    const p = toPlan(e.clientX, e.clientY);
    if (onEmptyClick) onEmptyClick({ x: p.x, y: -p.y }, { clientX: e.clientX, clientY: e.clientY });
    else onSelect?.(null);
  };

  const shown = elements.filter((e) => layers[LAYER_OF[e.element_type]]);
  const unit = vb.w / 100;
  const maskFill = s.walls.length ? PAPER : STAGE_BG;

  /** Grouped pins: zoom in until they separate; pins on the exact same spot open the first one. */
  const openCluster = (g: PinGroup<Pin>) => {
    const spread = g.pins.some((p) => Math.hypot(p.x - g.x, p.y - g.y) > 1e-3);
    if (!spread || zoomLevel(vb, fit) >= MAX_ZOOM) { onPinClick?.(g.pins[0].id); return; }
    const next = zoomViewAt(vb, fit, 0.5, { x: g.x, y: -g.y });
    setView({ ...next, x: g.x - next.w / 2, y: -g.y - next.h / 2 });
  };

  const pin = (p: Pin) => (
    p.num === null ? (
      <g key={p.id} transform={`translate(${p.x} ${-p.y})`} className="pointer-events-none">
        <circle r={unit * 1.6} fill="#2563eb" fillOpacity={0.15} stroke="#2563eb" strokeWidth={unit * 0.25} strokeDasharray={`${unit * 0.6} ${unit * 0.4}`} />
        <circle r={unit * 0.45} fill="#2563eb" />
      </g>
    ) : (
      <g key={p.id} transform={`translate(${p.x} ${-p.y})`} className="cursor-pointer"
        onClick={(ev) => { ev.stopPropagation(); onPinClick?.(p.id); }}>
        {p.active && <circle r={unit * 2.6} fill="none" stroke="#2563eb" strokeWidth={unit * 0.35} opacity={0.5} />}
        <circle r={unit * (p.active ? 2 : 1.6)} fill={p.resolved ? '#16a34a' : p.active ? '#2563eb' : '#e11d48'} stroke="#fff" strokeWidth={unit * 0.3} />
        <text fontSize={unit * (p.active ? 2.2 : 1.8)} textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight={700}>{p.num}</text>
      </g>
    )
  );

  const item = (e: DesignElement) => {
    const w = e.width_mm / 1000, d = e.depth_mm / 1000;
    const hl = highlight?.[e.id];
    const sel = e.id === selectedId;
    const off = e.overrides?.on === false;
    const unknown = isUnknownItem(e);
    const stroke = sel ? '#2563eb' : hl ? DIFF_COLORS[hl] : unknown ? '#94a3b8' : '#6b7280';
    const fill = sel ? '#2563eb22' : hl ? `${DIFF_COLORS[hl]}33` : unknown ? '#e2e8f0' : e.element_type === 'FURNITURE' ? '#efe7d8' : '#ffffff';
    const common = { stroke, fill, vectorEffect: 'non-scaling-stroke' as const, strokeWidth: sel ? 2.5 : hl ? 2 : 1 };
    return (
      <g key={e.id} transform={`translate(${e.position.x} ${-e.position.y}) rotate(${-e.position.rotation_deg})`}
        className="cursor-pointer" opacity={off ? 0.45 : 1}
        onClick={(ev) => { ev.stopPropagation(); if (!wasDrag()) onSelect?.(e, { clientX: ev.clientX, clientY: ev.clientY }); }}>
        {e.element_type === 'LIGHTING' ? (
          <>
            <circle r={Math.max(w, 0.18) / 2} {...common} />
            <path d={`M${-w / 2.8},${-w / 2.8}L${w / 2.8},${w / 2.8}M${-w / 2.8},${w / 2.8}L${w / 2.8},${-w / 2.8}`} {...common} />
          </>
        ) : (
          <rect x={-w / 2} y={-d / 2} width={w} height={Math.max(d, 0.04)} rx={Math.min(w, d) * 0.06} {...common} />
        )}
      </g>
    );
  };

  return (
    <div className={`relative h-full w-full select-none overflow-hidden ${interactive ? '' : 'pointer-events-none'}`} style={{ background: STAGE_BG }}>
      <svg ref={svgRef} className="h-full w-full touch-none overscroll-contain" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        {...(interactive ? { onPointerDown: onDown, onPointerMove: onMove, onClick: onBgClick } : { 'aria-hidden': true })}>
        {/* paper under the floor so the drawing stands out from the warm grey stage */}
        {s.walls.map((w, i) => <path key={`p${i}`} fill={PAPER} d={ring(w.outer)} />)}
        {room && <path d={ring(room)} fill="#2563eb" fillOpacity={0.08} stroke="#2563eb" strokeWidth={2} vectorEffect="non-scaling-stroke" className="pointer-events-none" />}
        {s.walls.map((w, i) => (
          <path key={i} fillRule="evenodd" fill={INK} d={ring(w.outer) + w.holes.map(ring).join('')} />
        ))}
        {s.wall_segments.map(([[x1, y1], [x2, y2]], i) => (
          <line key={i} x1={x1} y1={-y1} x2={x2} y2={-y2} stroke={INK} strokeWidth={s.wall_thickness} />
        ))}
        {s.openings.map((o) => (
          <g key={`${o.handle ?? o.code}-${o.x}-${o.y}`} transform={`translate(${o.x} ${-o.y}) rotate(${deg(o.rotation)})`}>
            <rect y={-s.wall_thickness / 2 - 0.01} width={o.width} height={s.wall_thickness + 0.02} fill={maskFill} />
            {o.type === 'door'
              ? <path d={`M0,0L0,${-o.width}A${o.width},${o.width} 0 0 1 ${o.width},0`} fill="none" stroke="#94a3b8" vectorEffect="non-scaling-stroke" />
              : <path d={`M0,${-s.wall_thickness / 4}H${o.width}M0,${s.wall_thickness / 4}H${o.width}`} stroke="#0ea5e9" vectorEffect="non-scaling-stroke" />}
          </g>
        ))}
        {/* selected and highlighted items on top, so a lamp is not hidden under its table */}
        {[...shown.filter((e) => !(e.id === selectedId || highlight?.[e.id])), ...shown.filter((e) => e.id === selectedId || highlight?.[e.id])].map(item)}
        {dimmed?.map((b, i) => <path key={`dim${i}`} d={ring(b)} fill={STAGE_BG} fillOpacity={0.62} className="pointer-events-none" />)}
        {interactive && s.rooms.map((r) => (
          <text key={`${r.name}-${r.label[0]}-${r.label[1]}`} x={r.label[0]} y={-r.label[1]} textAnchor="middle" className="pointer-events-none"
            fontSize={0.2} fill="#64748b" fontWeight={600} stroke={PAPER} strokeWidth={0.05} paintOrder="stroke">
            {r.name}
          </text>
        ))}
        {interactive && clusterPins(pins, unit * 3).map((g) => (g.pins.length === 1 ? pin(g.pins[0]) : (
          // dark dot, so a count is not read as a pin number
          <g key={g.pins[0].id} transform={`translate(${g.x} ${-g.y})`} className="cursor-pointer" data-pin-cluster={g.pins.length}
            onClick={(ev) => { ev.stopPropagation(); openCluster(g); }}>
            <title>{t('ws.pinCluster', { n: g.pins.length })}</title>
            <circle r={unit * 1.9} fill={INK} stroke="#fff" strokeWidth={unit * 0.3} />
            <text fontSize={unit * 1.9} textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight={700}>{g.pins.length}</text>
          </g>
        )))}
      </svg>
    </div>
  );
}
