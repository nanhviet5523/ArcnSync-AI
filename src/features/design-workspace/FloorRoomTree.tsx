import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose } from 'lucide-react';
import { t } from '@/i18n';
import type { RoomInfo } from './rooms';
import type { Floor } from './types';

interface Props {
  floors: Floor[];
  floorId: string;
  onFloor: (id: string) => void;
  /** Rooms of the current floor. */
  rooms: RoomInfo[];
  roomKey: string | null;
  onRoom: (key: string | null) => void;
  /** Open comments per floor id and per room key, shown as badges. */
  floorCounts: Record<string, number>;
  roomCounts: Record<string, number>;
  showFurniture: boolean;
  onShowFurniture: (v: boolean) => void;
  onCollapse?: () => void;
  /** Extra line under a room name, e.g. the designer in charge of it (multi-designer, later). */
  roomMeta?: (room: RoomInfo) => ReactNode;
}

const Badge = ({ n }: { n?: number }) => (n ? <span className="min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[11px] font-semibold leading-[18px] text-white">{n}</span> : null);

/** Floors → Rooms. Clicking a room zooms the 2D/3D view to it; clicking it again clears the selection. */
export function FloorRoomTree({ floors, floorId, onFloor, rooms, roomKey, onRoom, floorCounts, roomCounts, showFurniture, onShowFurniture, onCollapse, roomMeta }: Props) {
  const sorted = [...floors].sort((a, b) => a.level - b.level);
  const multi = sorted.length > 1;

  const roomList = (
    <ul className={`space-y-0.5 ${multi ? 'ml-3 border-l border-line pl-2' : ''}`}>
      {!rooms.length && <li className="px-2 py-1.5 text-xs text-slate-500">{t('ws.noRooms')}</li>}
      {rooms.map((r) => {
        const on = r.key === roomKey;
        return (
          <li key={r.key}>
            <button type="button" aria-pressed={on} onClick={() => onRoom(on ? null : r.key)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-brand ${on ? 'bg-brand-soft font-semibold text-brand' : 'text-slate-700 hover:bg-slate-50'}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.name}</span>
                {roomMeta?.(r)}
              </span>
              <span className={`shrink-0 text-[11px] tabular-nums ${on ? 'text-brand' : 'text-slate-400'}`}>{t('ws.area', { n: r.area })}</span>
              <Badge n={roomCounts[r.key]} />
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <h2 className="text-[13px] font-semibold text-slate-900">{multi ? t('ws.floorsRooms') : t('ws.rooms')}</h2>
        {onCollapse && (
          <button type="button" onClick={onCollapse} aria-label={t('ws.collapse')} title={t('ws.collapse')}
            className="hidden rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:block">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav aria-label={t('ws.floorsRooms')} className="min-h-0 flex-1 overflow-y-auto p-2">
        {!multi ? roomList : (
          <ul className="space-y-1">
            {sorted.map((f) => {
              const open = f.id === floorId;
              return (
                <li key={f.id}>
                  <button type="button" aria-expanded={open} onClick={() => onFloor(f.id)}
                    className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${open ? 'text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <Badge n={floorCounts[f.id]} />
                  </button>
                  {open && <div className="mt-0.5">{roomList}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-[13px] text-slate-700">
          {t('ws.showFurniture')}
          <input type="checkbox" role="switch" checked={showFurniture} onChange={(e) => onShowFurniture(e.target.checked)}
            className="peer sr-only" />
          <span aria-hidden className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      </div>
    </div>
  );
}
