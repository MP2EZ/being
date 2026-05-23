/**
 * BrainIcon Component - SVG brain icon with 60% fill
 * Used for Profile tab and welcome screen branding
 */

import React, { useMemo } from 'react';
import Svg, { Path, ClipPath, Defs, G, Rect } from 'react-native-svg';
import { colorSystem } from '@/core/theme';
import { generateComponentId } from '@/core/utils/id';

interface BrainIconProps {
  color?: string;
  size?: number;
}

const BrainIcon: React.FC<BrainIconProps> = ({
  color = colorSystem.base.midnightBlue,
  size = 24
}) => {
  const uniqueId = useMemo(() => generateComponentId('brain'), []);

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
      <Defs>
        <ClipPath id={uniqueId}>
          <Path d="M16 4C20 4 24 6 26 10C28 14 26 18 24 20C26 22 28 26 24 27.5C22 27.8 18 27 16 27C14 27 10 27.8 8 27.5C4 26 6 22 8 20C6 18 4 14 6 10C8 6 12 4 16 4Z" />
        </ClipPath>
      </Defs>
      <Path
        d="M16 4C20 4 24 6 26 10C28 14 26 18 24 20C26 22 28 26 24 27.5C22 27.8 18 27 16 27C14 27 10 27.8 8 27.5C4 26 6 22 8 20C6 18 4 14 6 10C8 6 12 4 16 4Z"
        fill="white"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <G clipPath={`url(#${uniqueId})`}>
        <Rect x="0" y="12.8" width="32" height="19.2" fill={color} />
        <Path
          d="M0 12.8 Q8 10.8 16 12.8 T32 12.8 L32 13.8 Q24 15.8 16 13.8 T0 13.8 Z"
          fill="white"
        />
      </G>
    </Svg>
  );
};

export default BrainIcon;
