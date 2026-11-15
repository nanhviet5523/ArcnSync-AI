import { Check, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { t } from '@/i18n';
import { Dropdown, menuItem } from './WorkspaceBar';

export interface TeamOption { id: string; name: string }

interface Props {
  roomName: string;
  ownerId: string | null;
  ownerName: string | null;
  team: TeamOption[];
  /** Avatar letters by designer id (avatarLabels). */
  avatars: Record<string, string>;
  /** Lead on an open project: the control opens the menu. Otherwise it only shows who is in charge. */
  editable: boolean;
  onPick: (designerId: string | null) => void;
  /** avatar: beside the room in the tree. link: the "Change" after the designer's name in the Room tab. */
  variant?: 'avatar' | 'link';
}

/** Designer in charge of a room, and the menu the Lead assigns it with. */
export function RoomOwnerMenu({ roomName, ownerId, ownerName, team, avatars, editable, onPick, variant = 'avatar' }: Props) {
  const face = ownerId && ownerName
    ? <Avatar id={ownerId} name={ownerName} label={avatars[ownerId]} />
    : <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-slate-500"><UserPlus className="h-3 w-3" /></span>;
  if (!editable) return ownerName ? face : null;
  const options: { id: string | null; label: string }[] = [{ id: null, label: t('team.unassigned') }, ...team.map((x) => ({ id: x.id, label: x.name }))];
  const link = variant === 'link';
  return (
    <Dropdown label={`${t('team.assignRoom', { room: roomName })}: ${ownerName ?? t('team.unassigned')}`} title={t('team.assignTooltip')} align="right" menuWidth="min-w-[170px] max-w-[220px]"
      button={link ? (ownerName ? t('team.change') : t('team.assign')) : (
        <span className="flex items-center gap-1">
          {!ownerName && <span className="text-[11px] font-medium text-slate-500">{t('team.assign')}</span>}
          {face}
        </span>
      )}
      className={link ? 'rounded text-[13px] font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand' : 'rounded-full transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand'}>
      {(close) => options.map((o) => (
        <button key={o.id ?? 'none'} type="button" role="menuitemradio" aria-checked={o.id === ownerId} className={menuItem} onClick={() => { close(); if (o.id !== ownerId) onPick(o.id); }}>
          {o.id && <Avatar id={o.id} name={o.label} label={avatars[o.id]} />}
          <span className="min-w-0 flex-1 truncate">{o.label}</span>
          {o.id === ownerId && <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />}
        </button>
      ))}
    </Dropdown>
  );
}
