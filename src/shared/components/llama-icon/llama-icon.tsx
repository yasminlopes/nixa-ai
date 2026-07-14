interface LlamaIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

export function LlamaIcon({ size = 16, className, style, strokeWidth = 1.75 }: LlamaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M8 3.5 L8.5 7" />
      <path d="M15.5 7 L16 3.5" />
      <path d="M6 9 C6 7.5 7 7 8.5 7 L15.5 7 C17 7 18 7.5 18 9 V13.5 C18 14.5 17.5 15 17 15.5 V19.5 C17 19.8 16.7 20 16.3 20 L14.5 20 V17 L9.5 17 V20 L7.7 20 C7.3 20 7 19.8 7 19.5 V15.5 C6.5 15 6 14.5 6 13.5 Z" />
      <circle cx="10" cy="10.5" r="0.65" fill="currentColor" stroke="none" />
    </svg>
  );
}
