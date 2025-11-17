/**
 * ScienceIcon - Custom icon for MBCT science pillar
 * Represents evidence-based research through beaker imagery
 * Matches BrainIcon aesthetic (minimal, geometric, 2px strokes)
 */

interface IconProps {
  size?: number;
  className?: string;
}

export default function ScienceIcon({ size = 32, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="Science icon"
    >
      {/* Beaker with light fill */}
      <path
        d="M12 6 L12 12 L8 22 C7 24, 8 26, 10 26 L22 26 C24 26, 25 24, 24 22 L20 12 L20 6"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top opening */}
      <line x1="11" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Liquid level */}
      <path
        d="M10 18 C12 17, 14 17, 16 18 C18 19, 20 19, 22 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bubble */}
      <circle cx="14" cy="21" r="1.5" fill="currentColor" />
    </svg>
  );
}
