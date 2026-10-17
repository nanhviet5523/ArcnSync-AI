import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { STATUS_ACTION_META } from '../statusActions';
import type { StatusAction } from '../types';

interface StatusActionsMenuProps {
  label: string; // accessible name, e.g. the user's email
  actions: StatusAction[];
  onSelect: (action: StatusAction) => void;
}

// Row "more" menu. Positioned with `fixed` so the table's horizontal scroll container cannot clip it.
export const StatusActionsMenu: React.FC<StatusActionsMenuProps> = ({ label, actions, onSelect }) => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [pos]);

  if (actions.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Change status of ${label}`}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        title="Change status"
        onClick={(e) => {
          e.stopPropagation();
          if (pos) return setPos(null);
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }}
        className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreVertical size={16} />
      </button>
      {pos && (
        <ul
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 min-w-[150px] rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {actions.map((action) => {
            const meta = STATUS_ACTION_META[action];
            return (
              <li key={action} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPos(null);
                    onSelect(action);
                  }}
                  className={`w-full px-4 py-2 text-left font-medium hover:bg-slate-50 ${
                    meta.tone === 'danger' ? 'text-red-600' : 'text-slate-700'
                  }`}
                >
                  {meta.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
};

export default StatusActionsMenu;
