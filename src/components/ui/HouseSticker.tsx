/**
 * A cozy Vietnamese garden house ("nhà lá vườn") as a die-cut sticker: thatched roof, wooden plank walls, warm lit
 * windows, an areca palm and a banana clump in a small garden. The cream outline and soft shadow come from
 * `.house-sticker` (globals.css). Alive while on screen: kitchen smoke curls up from the roof, the palm sways and
 * the windows flicker; reduced motion shows it still. Decorative only.
 */
export function HouseSticker({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={`house-sticker ${className}`}>
      {/* garden */}
      <ellipse cx="32" cy="54.5" rx="28" ry="7.5" fill="#8FA357" />
      <ellipse cx="32" cy="53.5" rx="25" ry="5.5" fill="#AFC277" />

      {/* areca palm (cây cau), swaying from the foot of its trunk */}
      <g className="sticker-palm">
        <path d="M13 54 C12 45 11 35 12.5 24" fill="none" stroke="#8A6A3F" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12.6 46h-1.8M12 40h-1.7M11.7 34h-1.6M12 29h-1.5" stroke="#6E5432" strokeWidth="0.7" strokeLinecap="round" />
        <g fill="#6B8A37">
          <path d="M12.5 24 C8 20.5 4 21 1.5 24.5 C5.5 23 8.5 23.5 12.5 24Z" />
          <path d="M12.5 24 C10.5 18.5 6.5 16 3 16.5 C7 18 9.5 20.5 12.5 24Z" />
          <path d="M12.5 24 C12.5 19 14 15 16.5 13 C15 17 14 20 12.5 24Z" />
          <path d="M12.5 24 C15 18.5 19 16.5 23 17.5 C19 18.5 16 21 12.5 24Z" />
          <path d="M12.5 24 C17 21.5 21 22.5 23.5 26 C19.5 24.5 16.5 24 12.5 24Z" />
        </g>
        <circle cx="12" cy="25.8" r="1.3" fill="#C08A3E" />
        <circle cx="13.8" cy="25.4" r="1.1" fill="#D9A94E" />
      </g>

      {/* chimney of the kitchen hearth, and its smoke */}
      <rect x="43.5" y="20.5" width="3.2" height="8" rx="0.6" fill="#7A5532" />
      <g fill="#EFE8D8">
        <circle className="sticker-smoke" cx="45.1" cy="19" r="2.1" />
        <circle className="sticker-smoke sticker-smoke-2" cx="45.1" cy="19" r="2.1" />
        <circle className="sticker-smoke sticker-smoke-3" cx="45.1" cy="19" r="2.1" />
      </g>

      {/* wooden plank walls */}
      <rect x="19.5" y="33" width="29" height="17.5" rx="1" fill="#C68E58" />
      <path d="M19.5 42.5h29M19.5 47h29" stroke="#A3703F" strokeWidth="0.9" />
      {/* door */}
      <path d="M30.5 50.5v-9a3.5 3.5 0 0 1 7 0v9Z" fill="#6E4524" />
      <circle cx="36" cy="46.5" r="0.6" fill="#E8C27A" />
      {/* windows, lit from inside */}
      <rect x="22" y="39.5" width="6" height="5.6" rx="0.8" fill="#F6C45E" className="sticker-glow" />
      <rect x="40.5" y="39.5" width="5.6" height="5.6" rx="0.8" fill="#F6C45E" className="sticker-glow sticker-glow-2" />
      <path d="M25 39.5v5.6M22 42.3h6M43.3 39.5v5.6M40.5 42.3h5.6" stroke="#8A5F1F" strokeWidth="0.8" />

      {/* thatched roof (mái lá): straw body, darker eave, hatched thatch, ridge */}
      <path d="M14.5 35.5 L34 16.5 L53.5 35.5 Q34 33.2 14.5 35.5Z" fill="#DDAE52" />
      <path d="M14.5 35.5 Q34 33.2 53.5 35.5 L52.6 38 Q34 35.8 15.4 38Z" fill="#B98633" />
      <g stroke="#B98633" strokeWidth="0.9" strokeLinecap="round">
        <path d="M31 21v3M34 20.5v3.5M37 21v3" />
        <path d="M27 25.5v3.2M30.5 25v3.5M34 25v3.5M37.5 25v3.5M41 25.5v3.2" />
        <path d="M22 30.5v3M25.5 29.8v3.4M29 29.5v3.5M32.5 29.5v3.5M36 29.5v3.5M39.5 29.5v3.5M43 29.8v3.4M46.5 30.5v3" />
      </g>
      <path d="M29.5 20.8 L34 16.5 L38.5 20.8" fill="none" stroke="#A3732A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* banana clump (bụi chuối) on the right */}
      <g fill="#7C9A40">
        <path d="M54 53 C52 46 53 41 57 37 C56 42 56 47 57 53Z" />
        <path d="M56 53 C57 46 60 42 63 41 C61 45 60 49 59.5 53Z" />
        <path d="M53 53 C50 49 48.5 45.5 49.5 42 C51.5 45.5 53 49 55 53Z" />
      </g>
      <path d="M57 53 C56.6 48 57 43 58.6 39" fill="none" stroke="#5F7A2E" strokeWidth="0.7" />

      {/* flowers in the garden */}
      <circle cx="18" cy="52.6" r="1.2" fill="#E9875E" />
      <circle cx="21.2" cy="54.2" r="1" fill="#F2C14E" />
      <circle cx="44.5" cy="53.4" r="1.1" fill="#E9875E" />
      <circle cx="41.5" cy="55" r="0.9" fill="#FBF8EF" />
    </svg>
  );
}
