/**
 * BrainIcon Component - Web version
 * Primary logo for Being website
 * Converted from React Native SVG to web SVG
 */

interface BrainIconProps {
  className?: string;
  size?: number;
  animate?: boolean; // Optional floating animation
}

export default function BrainIcon({
  className = '',
  size = 96, // Larger default for hero prominence
  animate = false
}: BrainIconProps) {
  const animationClass = animate ? 'animate-float' : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animationClass}`.trim()}
      role="img"
      aria-label="Being logo"
    >
      <defs>
        <clipPath id={`brain-fill-${size}`}>
          <path d="M16 4C20 4 24 6 26 10C28 14 26 18 24 20C26 22 28 26 24 27.5C22 27.8 18 27 16 27C14 27 10 27.8 8 27.5C4 26 6 22 8 20C6 18 4 14 6 10C8 6 12 4 16 4Z" />
        </clipPath>
      </defs>
      {/* Brain outline */}
      <path
        d="M16 4C20 4 24 6 26 10C28 14 26 18 24 20C26 22 28 26 24 27.5C22 27.8 18 27 16 27C14 27 10 27.8 8 27.5C4 26 6 22 8 20C6 18 4 14 6 10C8 6 12 4 16 4Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 60% fill pattern */}
      <g clipPath={`url(#brain-fill-${size})`}>
        <rect x="0" y="12.8" width="32" height="19.2" fill="currentColor" />
        <path
          d="M0 12.8 Q8 10.8 16 12.8 T32 12.8 L32 13.8 Q24 15.8 16 13.8 T0 13.8 Z"
          fill="white"
        />
      </g>
    </svg>
  );
}
