import React from 'react';

interface AvailabilitySwitchProps {
  isAvailable: boolean;
  pending?: boolean;
  onToggle: (next: boolean) => void;
  size?: 'md' | 'sm';
  // 'text' = "Available"/"Unavailable", 'none' = switch only (compact, e.g. table rows)
  label?: 'text' | 'none';
}

const SIZES = {
  md: { track: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-[22px]', spinner: 'h-3 w-3' },
  sm: { track: 'h-5 w-9', knob: 'h-4 w-4', on: 'translate-x-[18px]', spinner: 'h-2.5 w-2.5' },
};

// Slider switch for a designer's availability: green when available, gray when unavailable.
export const AvailabilitySwitch: React.FC<AvailabilitySwitchProps> = ({ isAvailable, pending = false, onToggle, size = 'md', label = 'text' }) => {
  const s = SIZES[size];
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isAvailable}
        aria-label={isAvailable ? 'Available - click to mark as unavailable' : 'Unavailable - click to mark as available'}
        title={isAvailable ? 'Available' : 'Unavailable'}
        disabled={pending}
        onClick={() => onToggle(!isAvailable)}
        className={`relative inline-flex ${s.track} shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait ${
          isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`flex ${s.knob} transform items-center justify-center rounded-full bg-white shadow transition-transform ${
            isAvailable ? s.on : 'translate-x-0.5'
          }`}
        >
          {pending && <span className={`${s.spinner} animate-spin rounded-full border-2 border-slate-300 border-t-slate-600`} />}
        </span>
      </button>
      {label === 'text' && (
        <span className={`text-sm font-semibold ${isAvailable ? 'text-emerald-600' : 'text-slate-500'}`}>
          {isAvailable ? 'Available' : 'Unavailable'}
        </span>
      )}
    </span>
  );
};

export default AvailabilitySwitch;
