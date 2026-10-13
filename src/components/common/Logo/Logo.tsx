export interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const Logo = ({
  size = 36,
  showText = true,
  className = '',
}: LogoProps) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Icon Nền xanh đen bo góc */}
      <div
        className="bg-slate-900 flex items-center justify-center shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${size * 0.28}px`,
        }}
      >
        {/* SVG Ngôi nhà */}
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
          {/* Mái nhà & Khung nhà màu trắng */}
          <path
            d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
            stroke="#FFFFFF"
          />
          {/* Cửa nhà màu xanh lam sáng */}
          <path
            d="M9 21V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V21"
            stroke="#00D2FF"
            strokeWidth="2.5"
          />
        </svg>
      </div>

      {/* Chữ Brand Name */}
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
};