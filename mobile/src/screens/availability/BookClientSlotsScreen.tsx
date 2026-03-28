import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Calendar, DateData } from 'react-native-calendars';
import { TrashIcon, KeyboardScrollView } from '../../components/ui';
import { useAvailabilityStore } from '../../stores/availability.store';
import { useClientStore } from '../../stores/client.store';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { typography } from '../../theme/typography';
import { calendarTheme } from '../../theme/calendar';
import type { Availability, Client } from '../../types';

export default function BookClientSlotsScreen() {
  const user = useAuthStore((s) => s.user);
  const isReadOnly = user?.role === 'CLIENT';
  const availabilities = useAvailabilityStore((s) => s.slots);
  const isLoading = useAvailabilityStore((s) => s.isLoading);
  const fetchMonth = useAvailabilityStore((s) => s.fetchMonth);
  const deleteAvailability = useAvailabilityStore((s) => s.deleteAvailability);
  const bookSlot = useAvailabilityStore((s) => s.bookSlot);
  const { clients, fetchClients } = useClientStore();

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const now = new Date();
    fetchMonth(now.getFullYear(), now.getMonth() + 1);
    fetchClients();
  }, [fetchMonth, fetchClients]);

  const handleRefresh = useCallback(() => {
    const now = new Date();
    fetchMonth(now.getFullYear(), now.getMonth() + 1);
  }, [fetchMonth]);

  const handleMonthChange = useCallback((month: { year: number; month: number }) => {
    fetchMonth(month.year, month.month);
  }, [fetchMonth]);

  const handleDayPress = useCallback(
    (day: DateData) => {
      ReactNativeHapticFeedback.trigger('impactLight');
      setSelectedDate(day.dateString);
    },
    [],
  );

  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    availabilities.forEach((slot) => {
      const slotDate = (slot.date || '').split('T')[0];
      marks[slotDate] = slotDate === selectedDate
        ? { selected: true, selectedColor: colors.primary, marked: true, dotColor: colors.white }
        : { marked: true, dotColor: colors.primary };
    });
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = { selected: true, selectedColor: colors.primary };
    }
    return marks;
  }, [availabilities, selectedDate]);

  const filteredSlots = useMemo(() => {
    if (!selectedDate) return [];
    return availabilities.filter((a) => (a.date || '').split('T')[0] === selectedDate);
  }, [availabilities, selectedDate]);

  const formatDisplayDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const handleDeleteSlot = useCallback(
    (availability: Availability) => {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert(
        'Delete Slot',
        'Are you sure you want to remove this availability slot?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteAvailability(availability.id);
              } catch {
                Alert.alert('Error', 'Failed to delete availability slot.');
              }
            },
          },
        ],
      );
    },
    [deleteAvailability],
  );

  const handleOpenSlotPress = useCallback(
    (availability: Availability) => {
      if (isReadOnly) return;
      const status = getSlotStatus(availability);
      if (status === 'BOOKED') {
        Alert.alert('Already Booked', 'This slot is already booked by a client.');
        return;
      }
      ReactNativeHapticFeedback.trigger('impactLight');
      setSelectedAvailabilityId(availability.id);
      setShowClientPicker(true);
    },
    [isReadOnly, getSlotStatus],
  );

  const handleSelectClient = useCallback(
    async (client: Client) => {
      if (!selectedAvailabilityId) return;
      setShowClientPicker(false);
      try {
        await bookSlot(selectedAvailabilityId, client.id);
        Alert.alert('Success', `Slot booked for ${client.user.name}!`);
      } catch {
        Alert.alert('Error', 'Failed to book slot.');
      }
      setSelectedAvailabilityId(null);
    },
    [selectedAvailabilityId, bookSlot],
  );

  const getSlotStatus = useCallback((availability: Availability): string => {
    if (!availability.slots || availability.slots.length === 0) return 'OPEN';
    const booked = availability.slots.some((s) => s.status === 'BOOKED');
    return booked ? 'BOOKED' : 'OPEN';
  }, []);

  return (
    <View style={styles.root}>
      <KeyboardScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.Text entering={FadeInDown.duration(300)} style={styles.heading}>
          Book Client Slots
        </Animated.Text>

        {/* Calendar */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDayPress}
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              current={new Date().toISOString().split('T')[0]}
              minDate={new Date().toISOString().split('T')[0]}
              hideExtraDays
              enableSwipeMonths
              theme={calendarTheme}
            />
          </View>
        </Animated.View>

        {/* Selected Date + Available Slots */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          {selectedDate ? (
            <Text style={styles.selectedDateText}>
              {formatDisplayDate(selectedDate)}
            </Text>
          ) : null}

          <Text style={styles.slotsTitle}>Available Slots:</Text>

          {!selectedDate ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyMessage}>
                Select a date from the calendar to view slots.
              </Text>
            </View>
          ) : isLoading && filteredSlots.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredSlots.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyMessage}>
                No availability slots for this date. Create one in the Availability tab.
              </Text>
            </View>
          ) : (
            filteredSlots.map((availability, idx) => {
              const status = getSlotStatus(availability);
              return (
                <Animated.View
                  key={availability.id}
                  entering={FadeInRight.delay(idx * 60).duration(200)}
                >
                  <View style={styles.slotRow}>
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotTime}>
                        {availability.startTime} - {availability.endTime}
                      </Text>
                      {availability.sessionName && (
                        <Text style={styles.slotName}>
                          {availability.sessionName}
                        </Text>
                      )}
                    </View>

                    <Pressable
                      onPress={() => handleOpenSlotPress(availability)}
                      style={[
                        styles.statusBadge,
                        status === 'OPEN'
                          ? styles.statusOpen
                          : styles.statusBooked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          status === 'OPEN'
                            ? styles.statusTextOpen
                            : styles.statusTextBooked,
                        ]}
                      >
                        {status}
                      </Text>
                    </Pressable>

                    {!isReadOnly && (
                      <Pressable
                        onPress={() => handleDeleteSlot(availability)}
                        hitSlop={10}
                        style={styles.deleteButton}
                      >
                        <TrashIcon />
                      </Pressable>
                    )}
                  </View>
                </Animated.View>
              );
            })
          )}
        </Animated.View>

        {/* Client Picker Modal (inline) */}
        {showClientPicker && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={styles.clientPicker}
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Client</Text>
              <Pressable
                onPress={() => {
                  setShowClientPicker(false);
                  setSelectedAvailabilityId(null);
                }}
                hitSlop={10}
              >
                <Text style={styles.pickerClose}>X</Text>
              </Pressable>
            </View>
            {clients.length === 0 ? (
              <Text style={styles.emptyMessage}>No clients available.</Text>
            ) : (
              clients.map((client) => (
                <Pressable
                  key={client.id}
                  onPress={() => handleSelectClient(client)}
                  style={({ pressed }) => [
                    styles.clientOption,
                    pressed && styles.clientOptionPressed,
                  ]}
                >
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>
                      {client.user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientOptionInfo}>
                    <Text style={styles.clientOptionName}>
                      {client.user.name}
                    </Text>
                    <Text style={styles.clientOptionEmail}>
                      {client.user.email}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </Animated.View>
        )}
      </KeyboardScrollView>
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
  heading: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  selectedDateText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  calendarContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  slotsTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  slotInfo: {
    flex: 1,
  },
  slotTime: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  slotName: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    marginRight: spacing.sm,
  },
  statusOpen: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.transparent,
  },
  statusBooked: {
    backgroundColor: colors.primary,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  statusTextOpen: {
    color: colors.primary,
  },
  statusTextBooked: {
    color: colors.white,
  },
  deleteButton: {
    padding: spacing.sm,
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
    color: colors.textTertiary,
  },

  // Client picker
  clientPicker: {
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  pickerTitle: {
    ...typography.h3,
  },
  pickerClose: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  clientOptionPressed: {
    opacity: 0.7,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  clientAvatarText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  clientOptionInfo: {
    flex: 1,
  },
  clientOptionName: {
    ...typography.body,
    fontWeight: '500',
  },
  clientOptionEmail: {
    ...typography.caption,
  },
});
