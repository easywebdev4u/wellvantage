import React, { memo } from 'react';
import Svg, { Rect, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface WellVantageLogoProps {
  size?: number;
}

const WellVantageLogo = memo<WellVantageLogoProps>(({ size = 72 }) => (
  <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
    <Rect width="1024" height="1024" rx="224" fill="#2E7D32" />
    <Rect width="1024" height="1024" rx="224" fill="url(#logoGrad)" opacity="0.3" />
    <Path
      d="M280 300L400 724L512 480L624 724L744 300"
      stroke="white"
      strokeWidth="64"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="512" cy="820" r="16" fill="white" opacity="0.6" />
    <Rect x="480" y="814" width="64" height="12" rx="6" fill="white" opacity="0.6" />
    <Circle cx="480" cy="820" r="12" fill="white" opacity="0.6" />
    <Circle cx="544" cy="820" r="12" fill="white" opacity="0.6" />
    <Defs>
      <LinearGradient id="logoGrad" x1="0" y1="0" x2="1024" y2="1024">
        <Stop offset="0%" stopColor="#1B5E20" />
        <Stop offset="100%" stopColor="#4CAF50" />
      </LinearGradient>
    </Defs>
  </Svg>
));

WellVantageLogo.displayName = 'WellVantageLogo';
export default WellVantageLogo;
