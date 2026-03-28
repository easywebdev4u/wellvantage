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
import { Card } from '../../components/ui';
import { getInitials, handleCallPhone, handleWhatsApp } from '../../utils';
import { useClientStore } from '../../stores/client.store';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { typography } from '../../theme/typography';
import type { Client } from '../../types';


function ClientListScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { clients, isLoading, total, page, fetchClients } = useClientStore();
  const isReadOnly = user?.role === 'CLIENT';
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleRefresh = useCallback(() => {
    fetchClients();
  }, [fetchClients]);

  const handleEditClient = useCallback(
    (client: Client) => {
      ReactNativeHapticFeedback.trigger('impactLight');
      navigation.navigate('AssignedClients', { clientId: client.id });
    },
    [navigation],
  );

  const handleNextPage = useCallback(() => {
    const totalPages = Math.ceil(total / rowsPerPage);
    if (page < totalPages) {
      fetchClients(page + 1);
    }
  }, [page, total, rowsPerPage, fetchClients]);

  const handlePrevPage = useCallback(() => {
    if (page > 1) {
      fetchClients(page - 1);
    }
  }, [page, fetchClients]);

  const renderClientCard = useCallback(
    ({ item, index }: { item: Client; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
        <Card style={styles.clientCard}>
          <View style={styles.cardRow}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.user.name)}</Text>
            </View>

            {/* Info */}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{item.user.name}</Text>
              {item.workoutPlan && (
                <Text style={styles.clientMeta}>
                  Workout: {item.workoutPlan.name}
                </Text>
              )}
              {item.planName && (
                <Text style={styles.clientMeta}>PT Plan: {item.planName}</Text>
              )}
              <Text style={styles.clientMeta}>
                Sessions Remaining: {item.sessionsRemaining}/{item.totalSessions}
              </Text>
            </View>

            {/* Action icons */}
            <View style={styles.actionIcons}>
              {item.whatsapp && (
                <Pressable
                  onPress={() => handleWhatsApp(item.whatsapp!)}
                  hitSlop={10}
                  style={styles.iconButton}
                >
                  <Text style={styles.iconText}>WA</Text>
                </Pressable>
              )}
              {item.phone && (
                <Pressable
                  onPress={() => handleCallPhone(item.phone!)}
                  hitSlop={10}
                  style={styles.iconButton}
                >
                  <Text style={styles.iconText}>Ph</Text>
                </Pressable>
              )}
              {!isReadOnly && (
                <Pressable
                  onPress={() => handleEditClient(item)}
                  hitSlop={10}
                  style={styles.iconButton}
                >
                  <Text style={styles.editIcon}>Edit</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Card>
      </Animated.View>
    ),
    [handleEditClient, isReadOnly],
  );

  const totalPages = Math.ceil(total / rowsPerPage);

  if (isLoading && clients.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (clients.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>👤</Text>
        <Text style={styles.emptyTitle}>No Clients Assigned Yet</Text>
        <Text style={styles.emptyMessage}>
          {isReadOnly
            ? 'Your profile will appear here once a trainer assigns you.'
            : 'Assign clients to start managing their sessions.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {isReadOnly ? 'My Profile' : 'Assigned Clients'}
        </Text>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderClientCard}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Pagination */}
      {total > rowsPerPage && (
        <View style={styles.pagination}>
          <Text style={styles.paginationText}>
            Rows per page: {rowsPerPage}
          </Text>
          <View style={styles.paginationControls}>
            <Text style={styles.paginationText}>
              {(page - 1) * rowsPerPage + 1}-
              {Math.min(page * rowsPerPage, total)} of {total}
            </Text>
            <Pressable
              onPress={handlePrevPage}
              disabled={page <= 1}
              style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
            >
              <Text style={styles.pageButtonText}>{'\u2039'}</Text>
            </Pressable>
            <Pressable
              onPress={handleNextPage}
              disabled={page >= totalPages}
              style={[
                styles.pageButton,
                page >= totalPages && styles.pageButtonDisabled,
              ]}
            >
              <Text style={styles.pageButtonText}>{'\u203A'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default React.memo(ClientListScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  clientCard: {
    marginTop: spacing.md,
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
  editIcon: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
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
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.white,
  },
  paginationText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
});
