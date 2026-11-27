import { t } from '@/i18n';
import type { ReactNode } from 'react';
import { Avatar, Button, StatusChip } from '@/components/ui';
import { elementCategory, elementName, formatVnd, isUnknownItem } from './logic';
import { itemPrice, roomSize, sumMoney } from './rooms';
import type { RoomInfo } from './rooms';
import type { DesignElement, Role } from './types';

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
  role: Role;
  /** Designer in charge of the room, when there is one. */
  owner?: { id: string; name: string; label?: string } | null;
  /** Lead: "Change", which opens the assign menu. */
  ownerAction?: ReactNode;
  /** Lead on a room assigned to someone else. */
  onTakeOver?: () => void;
  /** The item's unsaved product came from an AI combo: a small "AI" tag. */
  aiTagged?: (elementId: string) => boolean;
}

const m = (v: number) => v.toFixed(1).replace(/\.0$/, '');

export function RoomPanel({ room, floorName, items, selectedId, onSelect, priced, role, owner, ownerAction, onTakeOver, aiTagged }: Props) {
  const size = room && roomSize(room);
  const subtotal = sumMoney(items.map(itemPrice));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <h3 className="text-[15px] font-semibold text-ink">{room ? room.name : t('ws.wholeFloor')}</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
          <dt className="text-subtext">{t('ws.floor')}</dt><dd className="text-ink">{floorName}</dd>
          {room && <><dt className="text-subtext">{t('ws.areaLabel')}</dt><dd className="tabular-nums text-ink">{t('ws.area', { n: room.area })}</dd></>}
          {size && <><dt className="text-subtext">{t('ws.size')}</dt><dd className="tabular-nums text-ink">{t('ws.sizeM', { w: m(size.w), d: m(size.d) })}</dd></>}
          {(owner || ownerAction) && (
            <>
              <dt className="text-subtext">{t('team.inCharge')}</dt>
              <dd className="flex min-w-0 items-center gap-1.5 text-ink">
                {owner && <Avatar id={owner.id} name={owner.name} label={owner.label} />}
                <span className="min-w-0 truncate">{owner?.name ?? t('team.unassigned')}</span>
                {ownerAction && <><span aria-hidden className="text-subtext-2">·</span>{ownerAction}</>}
              </dd>
            </>
          )}
        </dl>
        {onTakeOver && <Button size="sm" className="mt-2.5" onClick={onTakeOver}>{t('team.takeOver')}</Button>}
        {!room && <p className="mt-2 text-xs text-subtext">{t('ws.pickRoom')}</p>}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2">
        <h4 className="text-[13px] font-medium text-ink-2">{t('ws.itemsInRoom')}</h4>
        <span className="text-xs tabular-nums text-subtext">{items.length}</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {!items.length && <li className="px-2 py-4 text-center text-sm text-subtext">{t('ws.noItems')}</li>}
        {items.map((e) => {
          const on = e.id === selectedId;
          const price = itemPrice(e);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => onSelect(e)} aria-pressed={on}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-brand ${on ? 'bg-brand-soft' : 'hover:bg-canvas'}`}>
                <span className="min-w-0 flex-1">
                  <span className={`flex min-w-0 items-center gap-1 ${on ? 'font-semibold text-brand' : 'text-ink'}`}>
                    <span className="truncate">{elementName(e, role)}</span>
                    {aiTagged?.(e.id) && <span title={t('aiCombo.fromAi')} className="shrink-0 rounded bg-brand-soft px-1 text-[10px] font-semibold leading-4 text-brand">{t('aiCombo.aiTag')}</span>}
                  </span>
                  <span className={`block truncate text-xs ${e.product?.unavailable ? 'font-medium text-rose-700' : 'text-subtext'}`}>{e.product?.unavailable ? t('drafts.noLongerAvailable') : elementCategory(e, role)}</span>
                </span>
                {isUnknownItem(e) ? <StatusChip kind="choice" value="UNIDENTIFIED" size="sm" />
                  : priced && (price || e.product ? <span className="shrink-0 text-xs tabular-nums text-ink">{price ? formatVnd(price) : '—'}</span>
                    : <StatusChip kind="choice" value="NOT_CHOSEN" size="sm" />)}
              </button>
            </li>
          );
        })}
      </ul>
      {priced && (
        <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-3 text-sm">
          <span className="text-ink-2">{room ? t('ws.roomSubtotal') : t('ws.floorSubtotal')}</span>
          <span className="font-semibold tabular-nums text-ink">{formatVnd(subtotal)}</span>
        </div>
      )}
    </div>
  );
}
