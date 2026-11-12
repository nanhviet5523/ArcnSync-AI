import { Link } from 'react-router-dom';

export interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  /** When set, the logo becomes an SPA link to this route. Omit for static logos (e.g. Footer). */
  to?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 36,
  showText = true,
  className = '',
  to,
}: LogoProps) => {
  const mark = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Rounded dark background icon */}
      <div
        className="bg-slate-900 flex items-center justify-center shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${size * 0.28}px`,
        }}
      >
        {/* House SVG */}
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* White roof and house frame */}
          <path
            d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
            stroke="#FFFFFF"
          />
          {/* Bright blue doorway */}
          <path
            d="M9 21V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V21"
            stroke="#00D2FF"
            strokeWidth="2.5"
          />
        </svg>
      </div>

      {/* Brand name */}
      {showText && (
        <span
          className="font-extrabold text-slate-900 tracking-tight select-none"
          style={{
            fontSize: `${size * 0.55}px`,
          }}
        >
          ArchSync AI
        </span>
      )}
    </div>
  );

  if (!to) return mark;

  return (
    <Link
      to={to}
      aria-label="ArchSync AI home"
      className="inline-flex shrink-0 cursor-pointer rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {mark}
    </Link>
  );
};
