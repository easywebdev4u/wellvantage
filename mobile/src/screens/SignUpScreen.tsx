import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { useAuthStore } from '../stores/auth.store';
import { post } from '../services/api';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { typography } from '../theme/typography';
import { Config } from '../utils/config';
import { logError } from '../utils';
import { WellVantageLogo } from '../components/ui';
import GoogleLogo from '../components/ui/GoogleLogo';
import type { AuthResponse } from '../types';

GoogleSignin.configure({
  iosClientId: Config.GOOGLE_IOS_CLIENT_ID || '',
  webClientId: Config.GOOGLE_WEB_CLIENT_ID || '',
  offlineAccess: true,
});

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, [logoOpacity, logoScale]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const handleGoogleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    ReactNativeHapticFeedback.trigger('impactMedium');
    setIsSigningIn(true);
    try {
      const signInResult = await GoogleSignin.signIn();
      const { idToken } = signInResult.data ?? {};

      if (!idToken) {
        Alert.alert('Error', 'Failed to get authentication token');
        return;
      }

      const response = await post<AuthResponse>('/auth/google/token', {
        idToken,
      });

      await setAuth(response.accessToken, response.user);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      logError('Google Sign-In error', error);
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — no action
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // Sign in already in progress
      } else {
        Alert.alert('Sign In Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [setAuth, isSigningIn]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topSection}
      >
        <View style={[styles.topContent, { paddingTop: insets.top + spacing.xxxxl }]}>
          <Animated.View style={[styles.logoContainer, logoAnimStyle]}>
            <WellVantageLogo size={72} />
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(200).duration(500)}
            style={styles.brandName}
          >
            WellVantage
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.delay(350).duration(500)}
            style={styles.tagline}
          >
            Your Personal Training{'\n'}Command Center
          </Animated.Text>
        </View>

        <View style={styles.curveOverlay} />
      </LinearGradient>

      <View style={styles.bottomSection}>
        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Text style={styles.welcomeTitle}>Welcome!</Text>
          <Text style={styles.welcomeSubtitle}>
            Manage, Track and Grow your Gym with WellVantage.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(650).duration(500)}
          style={styles.features}
        >
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(800).duration(500)}>
          <Pressable
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
            ]}
          >
            <GoogleLogo size={22} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(950).duration(500)}
          style={styles.terms}
        >
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Animated.Text>
      </View>
    </View>
  );
}

const FEATURES = [
  'Create & manage workout plans',
  'Track client sessions & progress',
  'Smart scheduling & availability',
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topSection: {
    flex: 0.48,
    justifyContent: 'flex-end',
  },
  topContent: {
    alignItems: 'center',
    paddingBottom: spacing.xxxxl + 20,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  curveOverlay: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  bottomSection: {
    flex: 0.52,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
  },
  welcomeTitle: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  features: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xxl,
    ...shadows.card,
  },
  googleButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
    backgroundColor: colors.background,
  },
  googleButtonText: {
    ...typography.button,
    color: colors.text,
  },
  terms: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xxl,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
});
