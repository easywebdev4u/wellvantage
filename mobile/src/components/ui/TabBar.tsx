import React, { memo, useCallback, useRef, useEffect } from 'react';
import {
  ScrollView,
  Text,
  Pressable,
  StyleSheet,
  View,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabBarProps {
  tabs: string[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

const TabBar = memo<TabBarProps>(({ tabs, activeIndex, onTabPress }) => {
  const scrollRef = useRef<ScrollView>(null);
  const tabPositions = useRef<Record<number, { x: number; width: number }>>({});

  // Animated indicator
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const handleTabPress = useCallback(
    (index: number) => {
      ReactNativeHapticFeedback.trigger('impactLight');
      onTabPress(index);
    },
    [onTabPress],
  );

  const handleTabLayout = useCallback(
    (index: number, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      tabPositions.current[index] = { x, width };

      // Set initial indicator position
      if (index === activeIndex) {
        indicatorX.value = x + width * 0.1;
        indicatorW.value = width * 0.8;
      }
    },
    [activeIndex, indicatorX, indicatorW],
  );

  // Animate indicator + auto-scroll on tab change
  useEffect(() => {
    const pos = tabPositions.current[activeIndex];
    if (pos) {
      indicatorX.value = withSpring(pos.x + pos.width * 0.1, {
        damping: 18,
        stiffness: 200,
      });
      indicatorW.value = withSpring(pos.width * 0.8, {
        damping: 18,
        stiffness: 200,
      });

      // Auto-scroll to keep active tab visible with some lookahead
      const scrollTo = Math.max(0, pos.x - SCREEN_WIDTH * 0.15);
      scrollRef.current?.scrollTo({ x: scrollTo, animated: true });
    }
  }, [activeIndex, indicatorX, indicatorW]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.tabsRow}>
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex;
            return (
              <Pressable
                key={tab}
                onPress={() => handleTabPress(index)}
                onLayout={(e) => handleTabLayout(index, e)}
                style={({ pressed }) => [
                  styles.tab,
                  pressed && styles.tabPressed,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}

          {/* Animated underline indicator */}
          <Animated.View style={[styles.indicator, indicatorStyle]} />
        </View>
      </ScrollView>

      {/* Fade hint on right edge to signal scrollability */}
      <View style={styles.fadeHint} pointerEvents="none" />
    </View>
  );
});

TabBar.displayName = 'TabBar';
export default TabBar;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    position: 'relative',
  },
  scrollContent: {
    // Generous padding so first 3 tabs fill the screen
    // and "Book Slots" peeks just enough to hint at scroll
    paddingLeft: spacing.xl,
    paddingRight: spacing.xxxl,
  },
  tabsRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    // Wide tabs so 3 fill ~95% of screen, 4th is mostly hidden
    paddingHorizontal: spacing.xxl + 4,
    minWidth: 100,
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
    fontSize: 15,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
  // Subtle gradient fade on the right to hint there's more
  fadeHint: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 1,
    width: 32,
    backgroundColor: 'transparent',
    // iOS shadow trick to create a fade-to-white effect
    borderLeftWidth: 0,
    shadowColor: colors.white,
    shadowOffset: { width: -20, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 0,
  },
});
