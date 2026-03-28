import React, { memo, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors, borderRadius, spacing } from '../../theme';
import { typography } from '../../theme/typography';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const Button = memo<ButtonProps>(({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}) => {
  const handlePress = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onPress();
  }, [onPress]);

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              size === 'sm' ? typography.buttonSmall : typography.button,
              variantTextStyles[variant],
              icon ? styles.textWithIcon : undefined,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
});

Button.displayName = 'Button';
export default Button;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  textWithIcon: {
    marginLeft: spacing.sm,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySurface },
  outline: { backgroundColor: colors.transparent, borderWidth: 1.5, borderColor: colors.primary },
  ghost: { backgroundColor: colors.transparent },
});

const variantTextStyles = StyleSheet.create({
  primary: { color: colors.white } as TextStyle,
  secondary: { color: colors.primary } as TextStyle,
  outline: { color: colors.primary } as TextStyle,
  ghost: { color: colors.primary } as TextStyle,
});
