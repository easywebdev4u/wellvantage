import React, { memo, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing } from '../../theme';
import { typography } from '../../theme/typography';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

const Input = memo<InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderProgress = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    borderProgress.value = withTiming(1, { duration: 200 });
  }, [borderProgress]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    borderProgress.value = withTiming(0, { duration: 200 });
  }, [borderProgress]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor:
      error
        ? colors.error
        : borderProgress.value > 0.5
          ? colors.primary
          : colors.border,
  }));

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputContainer,
          animatedBorderStyle,
          error && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </Pressable>
        )}
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

Input.displayName = 'Input';
export default Input;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  leftIcon: {
    paddingLeft: spacing.lg,
  },
  rightIcon: {
    paddingRight: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
