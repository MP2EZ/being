import React from 'react';
import Svg, { Path, Defs, ClipPath, G, Rect } from 'react-native-svg';
import { colorSystem } from '../../constants/colors';

interface BrainIconProps {
  size?: number;
  color?: string;
}

export const BrainIcon: React.FC<BrainIconProps> = ({ 
  size = 24, 
  color = colorSystem.base.midnightBlue 
}) => {
  // Generate stable unique ID for clipPath
  const clipId = `brainClip-${size}-${color.replace('#', '')}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <ClipPath id={clipId}>
          <Path d="M16 4C20 4 24 6 26 10C28 14 26 18 24 20C26 22 28 26 24 28C20 28 16 26 16 28C16 26 12 28 8 28C4 26 6 22 8 20C6 18 4 14 6 10C8 6 12 4 16 4Z" />
        </ClipPath>
      </Defs>
      
      {/* Brain outline */}
      <Path 
        d="M16 4C20 4 24 6 26 10C28 14 26 18 24 20C26 22 28 26 24 28C20 28 16 26 16 28C16 26 12 28 8 28C4 26 6 22 8 20C6 18 4 14 6 10C8 6 12 4 16 4Z" 
        fill="white" 
        stroke={color} 
        strokeWidth="2"
      />
      
      {/* 60% fill - starts at y="12.8" */}
      <G clipPath={`url(#${clipId})`}>
        <Rect x="0" y="12.8" width="32" height="19.2" fill={color} />
        <Path 
          d="M0 12.8 Q8 10.8 16 12.8 T32 12.8 L32 13.8 Q24 15.8 16 13.8 T0 13.8 Z" 
          fill="white"
        />
      </G>
    </Svg>
  );
};