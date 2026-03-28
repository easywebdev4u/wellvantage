import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';

const MenuIcon = memo(() => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 12h18M3 6h18M3 18h18"
      stroke={colors.white}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </Svg>
));

MenuIcon.displayName = 'MenuIcon';
export default MenuIcon;
