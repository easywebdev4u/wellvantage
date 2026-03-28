import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useAuthStore } from '../stores/auth.store';
import { colors, spacing, borderRadius } from '../theme';
import { typography } from '../theme/typography';

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

const MenuItem = memo<{
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}>(({ icon, label, subtitle, onPress, destructive }) => (
  <Pressable
    onPress={() => {
      ReactNativeHapticFeedback.trigger('impactLight');
      onPress();
    }}
    style={({ pressed }) => [
      styles.menuItem,
      pressed && styles.menuItemPressed,
    ]}
  >
    <View style={styles.menuItemIcon}>{icon}</View>
    <View style={styles.menuItemText}>
      <Text style={[styles.menuItemLabel, destructive && styles.destructiveText]}>
        {label}
      </Text>
      {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
    </View>
  </Pressable>
));
MenuItem.displayName = 'MenuItem';

// SVG Icons
const ProfileIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={colors.text} strokeWidth={1.8} />
    <Path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const StatsIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 20V10M12 20V4M6 20v-6" stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const SettingsIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={colors.text} strokeWidth={1.8} />
    <Path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const LogoutMenuIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={colors.error} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = useCallback(() => {
    onClose();
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }, [onClose, logout]);

  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.drawer, { paddingTop: insets.top + spacing.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* User profile section */}
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role || 'TRAINER'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Menu items */}
          <MenuItem
            icon={<ProfileIcon />}
            label="My Profile"
            subtitle="View and edit your details"
            onPress={() => {
              onClose();
              Alert.alert('Coming Soon', 'Profile editing will be available soon.');
            }}
          />
          <MenuItem
            icon={<StatsIcon />}
            label="Dashboard"
            subtitle="Sessions, clients & stats"
            onPress={() => {
              onClose();
              Alert.alert('Coming Soon', 'Dashboard analytics will be available soon.');
            }}
          />
          <MenuItem
            icon={<SettingsIcon />}
            label="Settings"
            subtitle="Notifications, preferences"
            onPress={() => {
              onClose();
              Alert.alert('Coming Soon', 'Settings will be available soon.');
            }}
          />

          <View style={styles.divider} />

          <MenuItem
            icon={<LogoutMenuIcon />}
            label="Sign Out"
            onPress={handleLogout}
            destructive
          />

          {/* App version */}
          <Text style={styles.version}>WellVantage v1.0.0</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(DrawerMenu);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  drawer: {
    width: '78%',
    backgroundColor: colors.white,
    paddingBottom: spacing.xxl,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  profileName: {
    ...typography.h3,
    fontSize: 17,
  },
  profileEmail: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  roleBadge: {
    backgroundColor: colors.primarySurface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  roleText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  menuItemPressed: {
    backgroundColor: colors.background,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  menuItemLabel: {
    ...typography.bodyMedium,
    fontSize: 15,
  },
  menuItemSubtitle: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  destructiveText: {
    color: colors.error,
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: spacing.xxxl,
    color: colors.textTertiary,
  },
});
