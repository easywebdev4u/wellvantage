import { Platform } from 'react-native';

export const colors = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  primarySurface: '#E8F5E9',

  white: '#FFFFFF',
  background: '#F5F5F5',
  surface: '#FFFFFF',

  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textOnPrimary: '#FFFFFF',

  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  divider: '#EEEEEE',

  error: '#D32F2F',
  errorLight: '#FFEBEE',
  success: '#2E7D32',
  warning: '#F57C00',

  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
  }),
  cardHover: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
  }),
} as const;

export const theme = Object.freeze({
  colors,
  spacing,
  borderRadius,
  shadows,
});

export type Theme = typeof theme;

export { typography } from './typography';
