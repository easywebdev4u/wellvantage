import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Header, MenuIcon, TabBar, TrashIcon } from '../../components/ui';
import DrawerMenu from '../../components/DrawerMenu';
import { useWorkoutStore } from '../../stores/workout.store';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, borderRadius } from '../../theme';
import { typography } from '../../theme/typography';
import type { WorkoutPlan } from '../../types';
import ClientListScreen from '../clients/ClientListScreen';
import SetAvailabilityScreen from '../availability/SetAvailabilityScreen';
import BookClientSlotsScreen from '../availability/BookClientSlotsScreen';

const TABS = ['Workout', 'Client', 'Availability', 'Book Slots'];

export default function WorkoutManagementScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const user = useAuthStore((s) => s.user);
  const plans = useWorkoutStore((s) => s.plans);
  const isLoading = useWorkoutStore((s) => s.isLoading);
  const fetchPlans = useWorkoutStore((s) => s.fetchPlans);
  const deletePlan = useWorkoutStore((s) => s.deletePlan);

  const isReadOnly = user?.role === 'CLIENT';

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleRefresh = useCallback(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleAddPlan = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.navigate('AddEditWorkout');
  }, [navigation]);

  const handlePlanPress = useCallback(
    (plan: WorkoutPlan) => {
      ReactNativeHapticFeedback.trigger('impactLight');
      navigation.navigate('AddEditWorkout', { planId: plan.id });
    },
    [navigation],
  );

  const handleDeletePlan = useCallback(
    (plan: WorkoutPlan) => {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert(
        'Delete Plan',
        `Are you sure you want to delete "${plan.name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deletePlan(plan.id),
          },
        ],
      );
    },
    [deletePlan],
  );

  const renderPlanItem = useCallback(
    ({ item, index }: { item: WorkoutPlan; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
        <Pressable
          onPress={() => handlePlanPress(item)}
          style={({ pressed }) => [
            styles.planRow,
            pressed && styles.planRowPressed,
          ]}
        >
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{item.name}</Text>
            <Text style={styles.planMeta}>
              {item.days} {item.days === 1 ? 'day' : 'days'}
              {item._count?.clients ? ` · ${item._count.clients} clients` : ''}
            </Text>
          </View>
          {!isReadOnly && (
            <Pressable
              onPress={() => handleDeletePlan(item)}
              hitSlop={12}
              style={styles.deleteButton}
            >
              <TrashIcon />
            </Pressable>
          )}
        </Pressable>
      </Animated.View>
    ),
    [handlePlanPress, handleDeletePlan, isReadOnly],
  );

  const renderWorkoutTab = () => (
    <View style={styles.tabContent}>
      {isLoading && plans.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : plans.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💪</Text>
          <Text style={styles.emptyTitle}>No Workout Plans Yet</Text>
          <Text style={styles.emptyMessage}>
            {isReadOnly
              ? 'Your trainer hasn\'t assigned any plans yet.'
              : 'Tap + to create your first workout plan.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={renderPlanItem}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.listHeaderLeft}>
                <View style={styles.headerAccent} />
                <Text style={styles.listHeaderTitle}>Custom Workout Plans</Text>
              </View>
              <Text style={styles.listHeaderCount}>
                {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB for adding new plan */}
      {!isReadOnly && (
        <Pressable
          onPress={handleAddPlan}
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <DrawerMenu visible={showMenu} onClose={() => setShowMenu(false)} />
      <Header
        title="Workout Management"
        leftIcon={<MenuIcon />}
        onLeftPress={() => setShowMenu(true)}
      />
      <TabBar tabs={TABS} activeIndex={activeTab} onTabPress={setActiveTab} />
      {activeTab === 0 && renderWorkoutTab()}
      {activeTab === 1 && <ClientListScreen />}
      {activeTab === 2 && <SetAvailabilityScreen />}
      {activeTab === 3 && <BookClientSlotsScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContent: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.xs,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAccent: {
    width: 4,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  listHeaderTitle: {
    ...typography.h3,
    fontSize: 17,
  },
  listHeaderCount: {
    ...typography.caption,
    color: colors.textTertiary,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 1,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  planRowPressed: {
    opacity: 0.7,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    ...typography.body,
    fontWeight: '500',
  },
  planMeta: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  deleteIcon: {
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.white,
    fontWeight: '300',
    marginTop: -2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 22,
  },
});
