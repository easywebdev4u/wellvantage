import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateData } from 'react-native-calendars';
import { Input, Button, CalendarIcon, KeyboardScrollView } from '../../components/ui';
import { useAvailabilityStore } from '../../stores/availability.store';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { typography } from '../../theme/typography';
import { calendarTheme } from '../../theme/calendar';

function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function parseTimeToMinutes(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function SetAvailabilityScreen() {
  const user = useAuthStore((s) => s.user);
  const isReadOnly = user?.role === 'CLIENT';
  const slots = useAvailabilityStore((s) => s.slots);
  const isLoading = useAvailabilityStore((s) => s.isLoading);
  const fetchMonth = useAvailabilityStore((s) => s.fetchMonth);
  const createAvailability = useAvailabilityStore((s) => s.createAvailability);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 45, 0, 0);
    return d;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<'WEEKLY' | 'DAILY'>('WEEKLY');
  const [repeatUntil, setRepeatUntil] = useState('');
  const [showRepeatCalendar, setShowRepeatCalendar] = useState(false);
  const [sessionName, setSessionName] = useState('');

  // Custom toggle animation
  const toggleProgress = useSharedValue(0);

  const toggleTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      toggleProgress.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
  }));

  const toggleThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(toggleProgress.value * 22, { damping: 15, stiffness: 200 }) }],
  }));

  const handleToggle = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    const newVal = !isRepeat;
    setIsRepeat(newVal);
    toggleProgress.value = withSpring(newVal ? 1 : 0, { damping: 15, stiffness: 200 });
  }, [isRepeat, toggleProgress]);

  useEffect(() => {
    const now = new Date();
    fetchMonth(now.getFullYear(), now.getMonth() + 1);
  }, [fetchMonth]);

  const handleMonthChange = useCallback((month: { year: number; month: number }) => {
    fetchMonth(month.year, month.month);
  }, [fetchMonth]);

  const handleDayPress = useCallback((day: DateData) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setSelectedDate(day.dateString);
  }, []);

  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    slots.forEach((slot) => {
      const slotDate = (slot.date || '').split('T')[0];
      marks[slotDate] = slotDate === selectedDate
        ? { selected: true, selectedColor: colors.primary, marked: true, dotColor: colors.white }
        : { marked: true, dotColor: colors.primary };
    });
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = { selected: true, selectedColor: colors.primary };
    }
    return marks;
  }, [slots, selectedDate]);

  const formatDisplayDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!selectedDate) {
      Alert.alert('Validation', 'Please select a date from the calendar.');
      return;
    }

    // Start time must be before end time
    if (startDate >= endDate) {
      Alert.alert('Validation', 'Start time must be before end time.');
      return;
    }

    // Minimum 15 min duration
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs < 15 * 60 * 1000) {
      Alert.alert('Validation', 'Slot must be at least 15 minutes long.');
      return;
    }

    // Check if today and start time is in the past (only for single slots)
    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    if (!isRepeat && isToday && startDate.getHours() * 60 + startDate.getMinutes() < now.getHours() * 60 + now.getMinutes()) {
      Alert.alert('Validation', 'Cannot create a slot in the past. Choose a later time or a future date.');
      return;
    }

    if (!sessionName.trim()) {
      Alert.alert('Validation', 'Please enter a session name.');
      return;
    }

    // Client-side overlap check
    const newStart = startDate.getHours() * 60 + startDate.getMinutes();
    const newEnd = endDate.getHours() * 60 + endDate.getMinutes();
    const sameDateSlots = slots.filter((s) => (s.date || '').split('T')[0] === selectedDate);
    for (const slot of sameDateSlots) {
      const existStart = parseTimeToMinutes(slot.startTime);
      const existEnd = parseTimeToMinutes(slot.endTime);
      if (newStart < existEnd && newEnd > existStart) {
        Alert.alert('Overlap', `This time overlaps with an existing slot: ${slot.startTime} - ${slot.endTime}`);
        return;
      }
    }

    if (isRepeat) {
      if (!repeatUntil) {
        Alert.alert('Validation', 'Please select an end date for repeating sessions.');
        return;
      }
      if (repeatUntil <= selectedDate) {
        Alert.alert('Validation', 'Repeat end date must be after the start date.');
        return;
      }
      // Max 90 days to prevent accidental mass creation
      const startMs = new Date(selectedDate).getTime();
      const endMs = new Date(repeatUntil).getTime();
      const daysDiff = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        Alert.alert('Validation', 'Repeat period cannot exceed 90 days. Please select a closer end date.');
        return;
      }
    }

    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      await createAvailability({
        date: `${selectedDate}T00:00:00.000Z`,
        startTime: formatTimeDisplay(startDate),
        endTime: formatTimeDisplay(endDate),
        isRepeat,
        ...(isRepeat && {
          repeatFrequency,
          repeatUntil: `${repeatUntil}T23:59:59.000Z`,
        }),
        sessionName: sessionName.trim(),
      });
      const msg = isRepeat
        ? `Recurring ${repeatFrequency.toLowerCase()} slots created!`
        : 'Availability slot created!';
      Alert.alert('Success', msg);
      setSessionName('');
      setIsRepeat(false);
      setRepeatUntil('');
      toggleProgress.value = withSpring(0, { damping: 15, stiffness: 200 });
    } catch (err: unknown) {
      const errData = (err as any)?.response?.data?.message;
      const msg = errData
        ? (typeof errData === 'string' ? errData : errData[0])
        : 'Failed to create availability slot.';
      Alert.alert('Error', msg);
    }
  }, [selectedDate, startDate, endDate, isRepeat, repeatFrequency, repeatUntil, sessionName, createAvailability]);

  if (isReadOnly) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Availability</Text>
        <Text style={styles.emptyMessage}>
          Only trainers can set availability. Contact your trainer to book a session.
        </Text>
      </View>
    );
  }


  return (
    <KeyboardScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
    >
      <Animated.Text entering={FadeInDown.duration(300)} style={styles.heading}>
        Set Availability
      </Animated.Text>

      {/* Date field — tap to toggle calendar */}
      <Animated.View entering={FadeInDown.delay(50).duration(300)}>
        <Text style={styles.fieldLabel}>Date*</Text>
        <Pressable
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight');
            setShowCalendar((v) => !v);
          }}
          style={styles.dateInputBox}
        >
          <Text style={selectedDate ? styles.dateInputText : styles.dateInputPlaceholder}>
            {selectedDate ? formatDisplayDate(selectedDate) : 'Select a date'}
          </Text>
          <CalendarIcon />
        </Pressable>

        {showCalendar && (
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={(day: DateData) => {
                handleDayPress(day);
                setShowCalendar(false);
              }}
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              current={new Date().toISOString().split('T')[0]}
              minDate={new Date().toISOString().split('T')[0]}
              hideExtraDays
              enableSwipeMonths
              theme={calendarTheme}
            />
          </View>
        )}
      </Animated.View>

      {/* Start Time + End Time — side by side */}
      <Animated.View
        entering={FadeInDown.delay(150).duration(300)}
        style={styles.timeRow}
      >
        {/* Start Time — hidden native picker behind visible input */}
        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>Start Time*</Text>
          <View style={styles.timeInputBox}>
            <Text style={styles.timeInputText}>
              {formatTimeDisplay(startDate)}
            </Text>
            {/* Native picker: invisible, positioned over the input, handles the tap */}
            <View style={styles.hiddenPickerWrapper}>
              <DateTimePicker
                value={startDate}
                mode="time"
                display="compact"
                minuteInterval={5}
                onValueChange={(_, date) => { if (date) setStartDate(date); }}
                accentColor={colors.primary}
                style={styles.hiddenPicker}
              />
            </View>
          </View>
        </View>

        {/* End Time — same pattern */}
        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>End Time*</Text>
          <View style={styles.timeInputBox}>
            <Text style={styles.timeInputText}>
              {formatTimeDisplay(endDate)}
            </Text>
            <View style={styles.hiddenPickerWrapper}>
              <DateTimePicker
                value={endDate}
                mode="time"
                display="compact"
                minuteInterval={5}
                onValueChange={(_, date) => { if (date) setEndDate(date); }}
                accentColor={colors.primary}
                style={styles.hiddenPicker}
              />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Repeat Sessions */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(300)}
        style={styles.switchRow}
      >
        <Text style={styles.switchLabel}>Repeat Sessions</Text>
        <Pressable onPress={handleToggle} style={styles.toggleContainer}>
          <Animated.View style={[styles.toggleTrack, toggleTrackStyle]}>
            <Animated.View style={[styles.toggleThumb, toggleThumbStyle]} />
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* Repeat config — shown when toggle is ON */}
      {isRepeat && (
        <Animated.View
          entering={FadeInDown.duration(250)}
          style={styles.repeatSection}
        >
          {/* Frequency picker */}
          <Text style={styles.repeatLabel}>Repeat Every</Text>
          <View style={styles.frequencyRow}>
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                setRepeatFrequency('WEEKLY');
              }}
              style={[
                styles.frequencyOption,
                repeatFrequency === 'WEEKLY' && styles.frequencyOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.frequencyText,
                  repeatFrequency === 'WEEKLY' && styles.frequencyTextActive,
                ]}
              >
                Weekly
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                setRepeatFrequency('DAILY');
              }}
              style={[
                styles.frequencyOption,
                repeatFrequency === 'DAILY' && styles.frequencyOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.frequencyText,
                  repeatFrequency === 'DAILY' && styles.frequencyTextActive,
                ]}
              >
                Daily
              </Text>
            </Pressable>
          </View>

          {/* End date */}
          <Text style={styles.repeatLabel}>Repeat Until</Text>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              setShowRepeatCalendar((v) => !v);
            }}
            style={styles.repeatDateInput}
          >
            <Text style={repeatUntil ? styles.repeatDateText : styles.repeatDatePlaceholder}>
              {repeatUntil ? formatDisplayDate(repeatUntil) : 'Select end date'}
            </Text>
            <CalendarIcon size={18} />
          </Pressable>

          {showRepeatCalendar && (
            <View style={styles.calendarContainer}>
              <Calendar
                onDayPress={(day: DateData) => {
                  setRepeatUntil(day.dateString);
                  setShowRepeatCalendar(false);
                }}
                markedDates={
                  repeatUntil
                    ? { [repeatUntil]: { selected: true, selectedColor: colors.primary } }
                    : {}
                }
                initialDate={selectedDate || undefined}
                minDate={selectedDate || new Date().toISOString().split('T')[0]}
                hideExtraDays
                enableSwipeMonths
                theme={calendarTheme}
              />
            </View>
          )}

          {/* Summary */}
          {selectedDate && repeatUntil && (
            <View style={styles.repeatSummary}>
              <Text style={styles.repeatSummaryText}>
                This will create a {formatTimeDisplay(startDate)} - {formatTimeDisplay(endDate)} slot
                every {repeatFrequency === 'WEEKLY' ? 'week' : 'day'} from{' '}
                {formatDisplayDate(selectedDate)} until {formatDisplayDate(repeatUntil)}.
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Session Name */}
      <Animated.View entering={FadeInDown.delay(250).duration(300)}>
        <Input
          label="Session Name*"
          value={sessionName}
          onChangeText={setSessionName}
          placeholder="e.g. Morning PT Session"
          containerStyle={styles.inputContainer}
        />
      </Animated.View>

      {/* Create */}
      <Animated.View entering={FadeInDown.delay(300).duration(300)}>
        <Button
          title="Create"
          onPress={handleCreate}
          loading={isLoading}
          fullWidth
          size="lg"
        />
      </Animated.View>
    </KeyboardScrollView>
  );
}

export default React.memo(SetAvailabilityScreen);

const styles = StyleSheet.create({
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
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dateInputText: {
    ...typography.body,
    color: colors.text,
  },
  dateInputPlaceholder: {
    ...typography.body,
    color: colors.textTertiary,
  },
  calendarIcon: {
    fontSize: 20,
  },
  calendarContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  timeCol: {
    flex: 1,
  },
  timeLabel: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  timeInputBox: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  timeInputText: {
    ...typography.body,
    color: colors.text,
  },
  hiddenPickerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.011,
  },
  hiddenPicker: {
    // Scale the compact picker so its tap area covers the full input box
    transform: [{ scaleX: 5 }, { scaleY: 2 }],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  switchLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  toggleContainer: {
    padding: spacing.xs,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  repeatSection: {
    marginBottom: spacing.md,
  },
  repeatLabel: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  frequencyOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  frequencyText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  frequencyTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  repeatDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  repeatDateText: {
    ...typography.body,
    color: colors.text,
  },
  repeatDatePlaceholder: {
    ...typography.body,
    color: colors.textTertiary,
  },
  repeatSummary: {
    backgroundColor: colors.primarySurface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  repeatSummaryText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
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
