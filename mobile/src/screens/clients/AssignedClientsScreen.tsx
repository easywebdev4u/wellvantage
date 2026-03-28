import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Header, Card, Button } from '../../components/ui';
import { useClientStore } from '../../stores/client.store';
import { useSessionStore } from '../../stores/session.store';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { typography } from '../../theme/typography';
import type { Client, Session } from '../../types';

export default function AssignedClientsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const clientId: string | undefined = route.params?.clientId;

  const user = useAuthStore((s) => s.user);
  const isReadOnly = user?.role === 'CLIENT';
  const { clients, selectedClient, isLoading: clientsLoading, fetchClients, fetchClient } = useClientStore();
  const {
    upcoming,
    past,
    isLoading: sessionsLoading,
    fetchUpcoming,
    fetchPast,
    updateSession,
  } = useSessionStore();

  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const ROWS_PER_TABLE = 5;

  useEffect(() => {
    fetchClients();
    fetchUpcoming();
    fetchPast();
    if (clientId) fetchClient(clientId);
  }, [fetchClients, fetchUpcoming, fetchPast, fetchClient, clientId]);

  const handleRefresh = useCallback(() => {
    fetchClients();
    fetchUpcoming();
    fetchPast();
  }, [fetchClients, fetchUpcoming, fetchPast]);

  const handleCancelSession = useCallback(
    (session: Session) => {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert(
        'Cancel Session',
        'Are you sure you want to cancel this session?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                await updateSession(session.id, { status: 'CANCELLED' });
                fetchUpcoming();
              } catch {
                Alert.alert('Error', 'Failed to cancel session.');
              }
            },
          },
        ],
      );
    },
    [updateSession, fetchUpcoming],
  );

  const handleCallPhone = useCallback((phone: string) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Error', 'Unable to make a phone call.'),
    );
  }, []);

  const handleWhatsApp = useCallback((whatsapp: string) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    const cleaned = whatsapp.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleaned}`).catch(() =>
      Alert.alert('Error', 'WhatsApp is not installed.'),
    );
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const formatTime = useCallback((timeStr: string) => {
    return timeStr;
  }, []);

  const paginatedUpcoming = upcoming.slice(
    (upcomingPage - 1) * ROWS_PER_TABLE,
    upcomingPage * ROWS_PER_TABLE,
  );
  const upcomingTotalPages = Math.ceil(upcoming.length / ROWS_PER_TABLE);

  const paginatedPast = past.slice(
    (pastPage - 1) * ROWS_PER_TABLE,
    pastPage * ROWS_PER_TABLE,
  );
  const pastTotalPages = Math.ceil(past.length / ROWS_PER_TABLE);

  const isLoading = clientsLoading || sessionsLoading;

  return (
    <View style={styles.root}>
      <Header title="Assigned Clients" showBack />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Client Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clients</Text>
        </View>

        {clientsLoading && clients.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : clients.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyMessage}>No clients assigned yet.</Text>
          </View>
        ) : (
          clients.map((client, index) => (
            <Animated.View
              key={client.id}
              entering={FadeInDown.delay(index * 60).duration(300)}
            >
              <Card style={styles.clientCard}>
                <View style={styles.cardRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(client.user.name)}
                    </Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.user.name}</Text>
                    {client.workoutPlan && (
                      <Text style={styles.clientMeta}>
                        Workout: {client.workoutPlan.name}
                      </Text>
                    )}
                    {client.planName && (
                      <Text style={styles.clientMeta}>
                        PT Plan: {client.planName}
                      </Text>
                    )}
                    <Text style={styles.clientMeta}>
                      Sessions: {client.sessionsRemaining}/{client.totalSessions}
                    </Text>
                  </View>
                  <View style={styles.actionIcons}>
                    {client.whatsapp && (
                      <Pressable
                        onPress={() => handleWhatsApp(client.whatsapp!)}
                        hitSlop={10}
                        style={styles.iconButton}
                      >
                        <Text style={styles.iconText}>WA</Text>
                      </Pressable>
                    )}
                    {client.phone && (
                      <Pressable
                        onPress={() => handleCallPhone(client.phone!)}
                        hitSlop={10}
                        style={styles.iconButton}
                      >
                        <Text style={styles.iconText}>Ph</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))
        )}

        {/* Upcoming Sessions Table */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Upcoming Sessions</Text>
          </View>
          <View style={styles.table}>
            {/* Column headers */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeaderText, styles.dateCol]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.timeCol]}>Time</Text>
              <Text style={[styles.tableHeaderText, styles.customerCol]}>Customer</Text>
              {!isReadOnly && (
                <Text style={[styles.tableHeaderText, styles.actionCol]}>Action</Text>
              )}
            </View>

            {paginatedUpcoming.length === 0 ? (
              <View style={styles.emptyTableRow}>
                <Text style={styles.emptyTableText}>No upcoming sessions.</Text>
              </View>
            ) : (
              paginatedUpcoming.map((session, idx) => (
                <Animated.View
                  key={session.id}
                  entering={FadeInRight.delay(idx * 50).duration(200)}
                  style={styles.tableRow}
                >
                  <Text style={[styles.tableCell, styles.dateCol]}>
                    {formatDate(session.date)}
                  </Text>
                  <Text style={[styles.tableCell, styles.timeCol]}>
                    {formatTime(session.startTime)}
                  </Text>
                  <Text style={[styles.tableCell, styles.customerCol]} numberOfLines={1}>
                    {session.client?.user?.name || '-'}
                  </Text>
                  {!isReadOnly && (
                    <View style={styles.actionCol}>
                      <Pressable
                        onPress={() => handleCancelSession(session)}
                        style={styles.cancelButton}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                </Animated.View>
              ))
            )}
          </View>

          {/* Upcoming pagination */}
          {upcoming.length > ROWS_PER_TABLE && (
            <View style={styles.tablePagination}>
              <Pressable
                onPress={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                disabled={upcomingPage <= 1}
                style={[styles.pageBtn, upcomingPage <= 1 && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>{'\u2039'}</Text>
              </Pressable>
              <Text style={styles.pageInfo}>
                {upcomingPage} / {upcomingTotalPages}
              </Text>
              <Pressable
                onPress={() => setUpcomingPage((p) => Math.min(upcomingTotalPages, p + 1))}
                disabled={upcomingPage >= upcomingTotalPages}
                style={[
                  styles.pageBtn,
                  upcomingPage >= upcomingTotalPages && styles.pageBtnDisabled,
                ]}
              >
                <Text style={styles.pageBtnText}>{'\u203A'}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* Past Sessions Table */}
        <Animated.View entering={FadeInDown.delay(300).duration(300)}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Past Sessions</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeaderText, styles.dateCol]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.timeCol]}>Time</Text>
              <Text style={[styles.tableHeaderText, styles.customerCol]}>Customer</Text>
            </View>

            {paginatedPast.length === 0 ? (
              <View style={styles.emptyTableRow}>
                <Text style={styles.emptyTableText}>No past sessions.</Text>
              </View>
            ) : (
              paginatedPast.map((session, idx) => (
                <Animated.View
                  key={session.id}
                  entering={FadeInRight.delay(idx * 50).duration(200)}
                  style={styles.tableRow}
                >
                  <Text style={[styles.tableCell, styles.dateCol]}>
                    {formatDate(session.date)}
                  </Text>
                  <Text style={[styles.tableCell, styles.timeCol]}>
                    {formatTime(session.startTime)}
                  </Text>
                  <Text style={[styles.tableCell, styles.customerCol]} numberOfLines={1}>
                    {session.client?.user?.name || '-'}
                  </Text>
                </Animated.View>
              ))
            )}
          </View>

          {/* Past pagination */}
          {past.length > ROWS_PER_TABLE && (
            <View style={styles.tablePagination}>
              <Pressable
                onPress={() => setPastPage((p) => Math.max(1, p - 1))}
                disabled={pastPage <= 1}
                style={[styles.pageBtn, pastPage <= 1 && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>{'\u2039'}</Text>
              </Pressable>
              <Text style={styles.pageInfo}>
                {pastPage} / {pastTotalPages}
              </Text>
              <Pressable
                onPress={() => setPastPage((p) => Math.min(pastTotalPages, p + 1))}
                disabled={pastPage >= pastTotalPages}
                style={[
                  styles.pageBtn,
                  pastPage >= pastTotalPages && styles.pageBtnDisabled,
                ]}
              >
                <Text style={styles.pageBtnText}>{'\u203A'}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sectionHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  clientCard: {
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  clientMeta: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  iconText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  centered: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyBlock: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyMessage: {
    ...typography.bodySmall,
    textAlign: 'center',
  },

  // Tables
  tableHeader: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  tableTitle: {
    ...typography.h3,
  },
  table: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tableHeaderText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableCell: {
    ...typography.bodySmall,
    color: colors.text,
  },
  dateCol: {
    flex: 2,
  },
  timeCol: {
    flex: 1.5,
  },
  customerCol: {
    flex: 2,
  },
  actionCol: {
    flex: 1.5,
    alignItems: 'center' as const,
  },
  emptyTableRow: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyTableText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  cancelButton: {
    backgroundColor: colors.errorLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  cancelButtonText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },

  // Table pagination
  tablePagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  pageInfo: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
