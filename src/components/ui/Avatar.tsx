import { avatarTone, initials } from './status';

const SIZE = { sm: 'h-6 w-6 text-[11px] tracking-tight', md: 'h-9 w-9 text-xs' } as const;

/** A designer's avatar: colour from their id, letters from their name, full name on hover. `label` comes from avatarLabels. */
export function Avatar({ id, name, label, size = 'sm' }: { id: string; name: string; label?: string; size?: keyof typeof SIZE }) {
  return (
    <span role="img" aria-label={name} title={name} className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZE[size]} ${avatarTone(id)}`}>
      {label ?? initials(name)}
    </span>
  );
}
