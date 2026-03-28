import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

interface GoogleLogoProps {
  size?: number;
}

const GoogleLogo = memo<GoogleLogoProps>(({ size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
      fill="#FFC107"
    />
    <Path
      d="M5.3 14.7l7 5.1C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.4 2 8 7.3 5.3 14.7z"
      fill="#FF3D00"
    />
    <Path
      d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.7 37 27 38 24 38c-6 0-11.1-4-12.9-9.6l-7 5.4C7 41 14.8 46 24 46z"
      fill="#4CAF50"
    />
    <Path
      d="M44.5 20H24v8.5h11.8c-.9 3-3 5.5-5.8 7l6.5 5.5C40 37.5 46 31 46 24c0-1.3-.2-2.7-.5-4z"
      fill="#1976D2"
    />
  </Svg>
));

GoogleLogo.displayName = 'GoogleLogo';
export default GoogleLogo;
