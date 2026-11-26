import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose } from 'lucide-react';
import { t } from '@/i18n';
import type { RoomInfo } from './rooms';
import type { Floor } from './types';
import { CountBadge, Switch } from './wsUi';
import { iconBtn } from './wsClasses';

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
  /** Extra line under a room name. */
  roomMeta?: (room: RoomInfo) => ReactNode;
  /** Control beside the room row: the designer in charge. */
  roomAction?: (room: RoomInfo) => ReactNode;
}

/** Row of the tree: the selected room gets the olive soft fill and a 2px bar on its left edge. */
const row = (on: boolean) => `relative flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-brand ${on
  ? 'bg-brand-soft font-semibold text-brand before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-brand'
  : 'text-ink-2 hover:bg-muted hover:text-ink'}`;

/** Floors → Rooms. Clicking a room zooms the 2D/3D view to it; clicking it again clears the selection. */
export function FloorRoomTree({ floors, floorId, onFloor, rooms, roomKey, onRoom, floorCounts, roomCounts, showFurniture, onShowFurniture, onCollapse, roomMeta, roomAction }: Props) {
  const sorted = [...floors].sort((a, b) => a.level - b.level);
  const multi = sorted.length > 1;

  const roomList = (
    <ul className={`space-y-0.5 ${multi ? 'ml-3 border-l border-line pl-2' : ''}`}>
      {!rooms.length && <li className="px-2 py-1.5 text-xs text-subtext">{t('ws.noRooms')}</li>}
      {rooms.map((r) => {
        const on = r.key === roomKey;
        return (
          <li key={r.key} className="flex items-center gap-1">
            <button type="button" aria-pressed={on} onClick={() => onRoom(on ? null : r.key)}
              className={row(on)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate" title={r.name}>{r.name}</span>
                {roomMeta?.(r)}
              </span>
              <span className={`shrink-0 text-[11px] tabular-nums ${on ? 'text-brand' : 'text-subtext'}`}>{t('ws.area', { n: r.area })}</span>
              <CountBadge n={roomCounts[r.key]} />
            </button>
            {roomAction?.(r)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <h2 className="text-[13px] font-semibold text-ink">{multi ? t('ws.floorsRooms') : t('ws.rooms')}</h2>
        {onCollapse && (
          <button type="button" onClick={onCollapse} aria-label={t('ws.collapse')} title={t('ws.collapse')}
            className={`${iconBtn} -mr-1.5 hidden lg:inline-flex`}>
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
                    className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${open ? 'text-ink' : 'text-ink-2 hover:bg-muted hover:text-ink'}`}>
                    {open ? <ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0 text-subtext" /> : <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-subtext" />}
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <CountBadge n={floorCounts[f.id]} />
                  </button>
                  {open && <div className="mt-0.5">{roomList}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <Switch checked={showFurniture} onChange={onShowFurniture} className="justify-between gap-3 text-[13px] text-ink-2">
          {t('ws.showFurniture')}
        </Switch>
      </div>
    </div>
  );
}
