/**
 * PhilosophyIcon - Custom icon for Stoic Mindfulness philosophy pillar
 * Represents ancient wisdom through scroll and quill imagery
 * Matches BrainIcon aesthetic (minimal, geometric, 2px strokes)
 */

interface IconProps {
  size?: number;
  className?: string;
}

export default function PhilosophyIcon({ size = 32, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="Philosophy icon"
    >
      {/* Scroll with light fill */}
      <path
        d="M6 10 C6 8, 7 7, 8 7 L24 7 C25 7, 26 8, 26 10 L26 22 C26 24, 25 25, 24 25 L8 25 C7 25, 6 24, 6 22 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Text lines */}
      <line x1="10" y1="13" x2="22" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="21" x2="18" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
