import React, { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';

interface CalendarIconProps {
  size?: number;
  color?: string;
}

const CalendarIcon = memo<CalendarIconProps>(({ size = 22, color = colors.text }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Rect x="7" y="14" width="3" height="3" rx="0.5" fill={color} />
  </Svg>
));

CalendarIcon.displayName = 'CalendarIcon';
export default CalendarIcon;
