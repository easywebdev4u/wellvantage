import { StyleSheet, Platform } from 'react-native';
import { colors } from './index';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = StyleSheet.create({
  h1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    color: colors.text,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: colors.text,
  },
  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.text,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: colors.text,
  },
  bodySmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.textTertiary,
  },
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
});
