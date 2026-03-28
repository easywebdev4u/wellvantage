import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  leftIcon?: React.ReactNode;
  onLeftPress?: () => void;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
}

/** SVG back chevron — clean, sharp, iOS-native feel */
const BackIcon = memo(() => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={colors.white}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
));
BackIcon.displayName = 'BackIcon';

/** SVG power/logout icon */
const LogoutIcon = memo(() => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
      stroke={colors.white}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
));
LogoutIcon.displayName = 'LogoutIcon';

const Header = memo<HeaderProps>(({
  title,
  showBack = false,
  onBackPress,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  }, [onBackPress, navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.content}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconPressed,
            ]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <BackIcon />
          </Pressable>
        ) : leftIcon ? (
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              onLeftPress?.();
            }}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconPressed,
            ]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            {leftIcon}
          </Pressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {rightIcon ? (
          <Pressable
            onPress={onRightPress}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconPressed,
            ]}
            hitSlop={12}
          >
            {rightIcon}
          </Pressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </View>
  );
});

Header.displayName = 'Header';
export { LogoutIcon };
export default Header;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingBottom: spacing.md + 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 48,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  iconPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  iconPlaceholder: {
    width: 40,
  },
  title: {
    ...typography.h3,
    color: colors.textOnPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
});
