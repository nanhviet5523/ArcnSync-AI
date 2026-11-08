import { t } from '@/i18n';
import { StatusChip } from '@/components/ui';
import { elementName, formatVnd, isUnknownItem } from './logic';
import { itemPrice, roomSize, sumMoney } from './rooms';
import type { RoomInfo } from './rooms';
import type { DesignElement } from './types';

interface Props {
  /** null = whole floor */
  room: RoomInfo | null;
  floorName: string;
  /** Items of the room (or of the whole floor when room is null), draft applied. */
  items: DesignElement[];
  selectedId: string | null;
  onSelect: (e: DesignElement) => void;
  /** Show prices (only once products are being chosen). */
  priced: boolean;
}

const m = (v: number) => v.toFixed(1).replace(/\.0$/, '');

export function RoomPanel({ room, floorName, items, selectedId, onSelect, priced }: Props) {
  const size = room && roomSize(room);
  const subtotal = sumMoney(items.map(itemPrice));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <h3 className="text-[15px] font-semibold text-slate-900">{room ? room.name : t('ws.wholeFloor')}</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
          <dt className="text-slate-500">{t('ws.floor')}</dt><dd className="text-slate-800">{floorName}</dd>
          {room && <><dt className="text-slate-500">{t('ws.areaLabel')}</dt><dd className="tabular-nums text-slate-800">{t('ws.area', { n: room.area })}</dd></>}
          {size && <><dt className="text-slate-500">{t('ws.size')}</dt><dd className="tabular-nums text-slate-800">{t('ws.sizeM', { w: m(size.w), d: m(size.d) })}</dd></>}
        </dl>
        {!room && <p className="mt-2 text-xs text-slate-500">{t('ws.pickRoom')}</p>}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2">
        <h4 className="text-[13px] font-medium text-slate-700">{t('ws.itemsInRoom')}</h4>
        <span className="text-xs tabular-nums text-slate-500">{items.length}</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {!items.length && <li className="px-2 py-4 text-center text-sm text-slate-500">{t('ws.noItems')}</li>}
        {items.map((e) => {
          const on = e.id === selectedId;
          const price = itemPrice(e);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => onSelect(e)} aria-pressed={on}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-brand ${on ? 'bg-brand-soft' : 'hover:bg-slate-50'}`}>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${on ? 'font-semibold text-brand' : 'text-slate-800'}`}>{elementName(e)}</span>
                  <span className="block truncate text-xs text-slate-500">{e.category?.name ?? e.block_name}</span>
                </span>
                {isUnknownItem(e) ? <StatusChip kind="choice" value="UNIDENTIFIED" size="sm" />
                  : priced && (price ? <span className="shrink-0 text-xs tabular-nums text-slate-800">{formatVnd(price)}</span>
                    : <StatusChip kind="choice" value="NOT_CHOSEN" size="sm" />)}
              </button>
            </li>
          );
        })}
      </ul>
      {priced && (
        <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-3 text-sm">
          <span className="text-slate-600">{room ? t('ws.roomSubtotal') : t('ws.floorSubtotal')}</span>
          <span className="font-semibold tabular-nums text-slate-900">{formatVnd(subtotal)}</span>
        </div>
      )}
    </div>
  );
}
