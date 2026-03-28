import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';

interface TrashIconProps {
  size?: number;
  color?: string;
}

const TrashIcon = memo<TrashIconProps>(({ size = 20, color = colors.error }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
));

TrashIcon.displayName = 'TrashIcon';
export default TrashIcon;
