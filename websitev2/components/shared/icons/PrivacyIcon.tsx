/**
 * PrivacyIcon - Custom icon for privacy/security pillar
 * Represents data protection through shield imagery
 * Matches BrainIcon aesthetic (minimal, geometric, 2px strokes)
 */

interface IconProps {
  size?: number;
  className?: string;
}

export default function PrivacyIcon({ size = 32, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="Privacy icon"
    >
      {/* Shield with light fill */}
      <path
        d="M16 4 L6 8 L6 16 C6 22, 10 26, 16 28 C22 26, 26 22, 26 16 L26 8 L16 4 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M12 16 L15 19 L20 13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
