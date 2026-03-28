import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

const Card = memo<CardProps>(({ children, style, padded = true }) => (
  <View style={[styles.card, padded && styles.padded, style]}>
    {children}
  </View>
));

Card.displayName = 'Card';
export default Card;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
});
