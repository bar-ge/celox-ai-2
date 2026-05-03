export function CeloxIcon({ size = 40, color, dark = false, className = '' }) {
  const fill = color ?? (dark ? '#ffffff' : '#2563eb')
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Γ — top-left bracket */}
      <rect x="8"  y="8"  width="36" height="10" rx="4" fill={fill} />
      <rect x="8"  y="8"  width="10" height="36" rx="4" fill={fill} />
      {/* ⌐ — bottom-right bracket (180° rotation) */}
      <rect x="20" y="46" width="36" height="10" rx="4" fill={fill} />
      <rect x="46" y="20" width="10" height="36" rx="4" fill={fill} />
    </svg>
  )
}
