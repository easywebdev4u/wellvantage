import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Header, Input, TrashIcon, KeyboardScrollView } from '../../components/ui';
import { useWorkoutStore } from '../../stores/workout.store';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { typography } from '../../theme/typography';
import type { WorkoutDay, Exercise } from '../../types';

const MAX_NOTES_LENGTH = 200;

interface LocalDay {
  id: string;
  dayNumber: number;
  muscleGroup: string;
  exercises: LocalExercise[];
}

interface LocalExercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  duration?: string;
  order: number;
}

let localIdCounter = 0;
function localId() {
  return `local_${++localIdCounter}`;
}

export default function AddEditWorkoutScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const planId: string | undefined = route.params?.planId;
  const isEdit = !!planId;

  const scrollRef = useRef<ScrollView>(null);
  const user = useAuthStore((s) => s.user);
  const isReadOnly = user?.role === 'CLIENT';
  const selectedPlan = useWorkoutStore((s) => s.selectedPlan);
  const isLoading = useWorkoutStore((s) => s.isLoading);
  const fetchPlan = useWorkoutStore((s) => s.fetchPlan);
  const createPlan = useWorkoutStore((s) => s.createPlan);
  const updatePlan = useWorkoutStore((s) => s.updatePlan);
  const addDayApi = useWorkoutStore((s) => s.addDay);
  const deleteDayApi = useWorkoutStore((s) => s.deleteDay);
  const addExerciseApi = useWorkoutStore((s) => s.addExercise);
  const deleteExerciseApi = useWorkoutStore((s) => s.deleteExercise);
  const clearSelected = useWorkoutStore((s) => s.clearSelected);

  const [planName, setPlanName] = useState('');
  const [notes, setNotes] = useState('');

  // Local state for create mode
  const [localDays, setLocalDays] = useState<LocalDay[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Inline form states
  const [newDayMuscle, setNewDayMuscle] = useState('');
  const [showAddDay, setShowAddDay] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('');
  const [newExReps, setNewExReps] = useState('');
  const [newExDurValue, setNewExDurValue] = useState('');
  const [newExDurUnit, setNewExDurUnit] = useState<'secs' | 'mins'>('secs');
  const [showAddExercise, setShowAddExercise] = useState(false);

  const handleMuscleGroupChange = useCallback(
    (index: number, value: string) => {
      if (isEdit) {
        // For edit mode, debounce and call API — skip for now, update local display
        // The updateDay API would be called on blur
        return;
      }
      setLocalDays((prev) =>
        prev.map((d, i) => (i === index ? { ...d, muscleGroup: value } : d)),
      );
    },
    [isEdit],
  );

  useEffect(() => {
    if (planId) fetchPlan(planId);
    return () => clearSelected();
  }, [planId, fetchPlan, clearSelected]);

  useEffect(() => {
    if (selectedPlan && isEdit) {
      setPlanName(selectedPlan.name);
      setNotes(selectedPlan.description || '');
    }
  }, [selectedPlan, isEdit]);

  // In edit mode, use server data; in create mode, use local state
  const days: LocalDay[] = useMemo(() => {
    if (isEdit && selectedPlan) {
      return selectedPlan.workoutDays.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        muscleGroup: d.muscleGroup,
        exercises: d.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          duration: e.duration,
          order: e.order,
        })),
      }));
    }
    return localDays;
  }, [isEdit, selectedPlan, localDays]);

  const activeDay = days[activeDayIndex] || null;

  // --- Handlers ---

  const handleSubmit = useCallback(async () => {
    if (!planName.trim()) {
      Alert.alert('Validation', 'Please enter a workout plan name.');
      return;
    }
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      if (isEdit && planId) {
        await updatePlan(planId, {
          name: planName.trim(),
          description: notes.trim() || undefined,
        });
        Alert.alert('Success', 'Workout plan updated!');
      } else {
        // Create with full nested data in one call
        await createPlan({
          name: planName.trim(),
          description: notes.trim() || undefined,
          days: Math.max(localDays.length, 1),
          workoutDays: localDays.length > 0
            ? localDays.map((d) => ({
                dayNumber: d.dayNumber,
                muscleGroup: d.muscleGroup,
                exercises: d.exercises.map((e, i) => ({
                  name: e.name,
                  sets: e.sets,
                  reps: e.reps,
                  duration: e.duration,
                  order: i,
                })),
              }))
            : undefined,
        });
        Alert.alert('Success', 'Workout plan created!');
        navigation.goBack();
      }
    } catch {
      Alert.alert('Error', 'Failed to save workout plan.');
    }
  }, [planName, notes, isEdit, planId, localDays, updatePlan, createPlan, navigation]);

  const handleAddDay = useCallback(async () => {
    if (!newDayMuscle.trim()) return;
    ReactNativeHapticFeedback.trigger('impactLight');

    if (isEdit && selectedPlan) {
      try {
        const nextDay = (selectedPlan.workoutDays.length || 0) + 1;
        await addDayApi(selectedPlan.id, nextDay, newDayMuscle.trim());
      } catch {
        Alert.alert('Error', 'Failed to add day.');
        return;
      }
    } else {
      setLocalDays((prev) => [
        ...prev,
        {
          id: localId(),
          dayNumber: prev.length + 1,
          muscleGroup: newDayMuscle.trim(),
          exercises: [],
        },
      ]);
      setActiveDayIndex(localDays.length);
    }
    setNewDayMuscle('');
    setShowAddDay(false);
  }, [newDayMuscle, isEdit, selectedPlan, addDayApi, localDays.length]);

  const handleDeleteDay = useCallback(
    (day: LocalDay, index: number) => {
      Alert.alert('Delete Day', `Remove Day ${day.dayNumber} (${day.muscleGroup})?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isEdit) {
              try { await deleteDayApi(day.id); } catch { Alert.alert('Error', 'Failed to delete day.'); }
            } else {
              setLocalDays((prev) => {
                const updated = prev.filter((_, i) => i !== index);
                return updated.map((d, i) => ({ ...d, dayNumber: i + 1 }));
              });
              if (activeDayIndex >= index && activeDayIndex > 0) {
                setActiveDayIndex((p) => p - 1);
              }
            }
          },
        },
      ]);
    },
    [isEdit, deleteDayApi, activeDayIndex],
  );

  const handleAddExercise = useCallback(async () => {
    if (!newExName.trim() || !newExSets.trim()) return;
    if (!newExReps.trim() && !newExDurValue.trim()) {
      Alert.alert('Validation', 'Please enter either Reps or Duration.');
      return;
    }
    ReactNativeHapticFeedback.trigger('impactLight');

    const duration = newExDurValue.trim()
      ? `${newExDurValue.trim()} ${newExDurUnit}`
      : undefined;

    const exercise: LocalExercise = {
      id: localId(),
      name: newExName.trim(),
      sets: parseInt(newExSets, 10),
      reps: newExReps ? parseInt(newExReps, 10) : undefined,
      duration,
      order: activeDay?.exercises.length || 0,
    };

    if (isEdit && activeDay) {
      try {
        await addExerciseApi(activeDay.id, exercise);
      } catch {
        Alert.alert('Error', 'Failed to add exercise.');
        return;
      }
    } else {
      setLocalDays((prev) =>
        prev.map((d, i) =>
          i === activeDayIndex
            ? { ...d, exercises: [...d.exercises, exercise] }
            : d,
        ),
      );
    }
    setNewExName('');
    setNewExSets('');
    setNewExReps('');
    setNewExDurValue('');
    setNewExDurUnit('secs');
    setShowAddExercise(false);
  }, [newExName, newExSets, newExReps, newExDurValue, newExDurUnit, activeDay, activeDayIndex, isEdit, addExerciseApi]);

  const handleDeleteExercise = useCallback(
    (exercise: LocalExercise) => {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert('Delete Exercise', `Remove "${exercise.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isEdit) {
              try { await deleteExerciseApi(exercise.id); } catch { Alert.alert('Error', 'Failed to delete.'); }
            } else {
              setLocalDays((prev) =>
                prev.map((d, i) =>
                  i === activeDayIndex
                    ? { ...d, exercises: d.exercises.filter((e) => e.id !== exercise.id) }
                    : d,
                ),
              );
            }
          },
        },
      ]);
    },
    [isEdit, deleteExerciseApi, activeDayIndex],
  );

  return (
    <View style={styles.root}>
      <Header
        title={isEdit ? 'Edit Workout Plan' : 'Add Workout Plan'}
        showBack
      />

        <KeyboardScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Plan Name */}
          <Animated.View entering={FadeInDown.duration(300)}>
            <Input
              label="Plan Name"
              value={planName}
              onChangeText={setPlanName}
              placeholder="e.g. Beginner's Workout - 3 days"
              editable={!isReadOnly}
              containerStyle={styles.inputContainer}
            />
          </Animated.View>

          {/* Day pills */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={styles.daysSection}
          >
            {days.map((day, index) => (
              <View key={day.id} style={styles.dayPillRow}>
                <Pressable
                  onPress={() => setActiveDayIndex(index)}
                  style={[
                    styles.dayPill,
                    activeDayIndex === index && styles.dayPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      activeDayIndex === index && styles.dayPillTextActive,
                    ]}
                  >
                    Day {day.dayNumber}
                  </Text>
                </Pressable>
                <TextInput
                  value={day.muscleGroup}
                  onChangeText={(val) => handleMuscleGroupChange(index, val)}
                  style={styles.dayMuscleInput}
                  placeholder="Muscle group"
                  placeholderTextColor={colors.textTertiary}
                  editable={!isReadOnly && !isEdit}
                />
                {!isReadOnly && (
                  <Pressable
                    onPress={() => handleDeleteDay(day, index)}
                    hitSlop={8}
                    style={styles.trashButton}
                  >
                    <TrashIcon />
                  </Pressable>
                )}
              </View>
            ))}

            {/* Add day */}
            {!isReadOnly && (
              showAddDay ? (
                <View style={styles.addDayRow}>
                  <TextInput
                    value={newDayMuscle}
                    onChangeText={setNewDayMuscle}
                    placeholder="Muscle group (e.g. Chest)"
                    style={styles.addDayInput}
                    placeholderTextColor={colors.textTertiary}
                    autoFocus
                    onSubmitEditing={handleAddDay}
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={handleAddDay}
                    style={[styles.addCircleSmall, !newDayMuscle.trim() && styles.disabledOpacity]}
                    disabled={!newDayMuscle.trim()}
                  >
                    <Text style={styles.addCircleText}>+</Text>
                  </Pressable>
                  <Pressable onPress={() => { setShowAddDay(false); setNewDayMuscle(''); }} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setShowAddDay(true)} style={styles.addCircleCenter}>
                  <View style={styles.addCircle}>
                    <Text style={styles.addCircleIcon}>+</Text>
                  </View>
                </Pressable>
              )
            )}
          </Animated.View>

          {/* Exercises for active day */}
          {activeDay && (
            <Animated.View
              entering={FadeInDown.delay(200).duration(300)}
              style={styles.exercisesSection}
            >
              {/* Column headers — only show when exercises exist */}
              {activeDay.exercises.length > 0 && (
                <View style={styles.exerciseHeader}>
                  <View style={styles.nameCol} />
                  <View style={styles.setsCol}>
                    <Text style={styles.headerLabel}>Sets</Text>
                  </View>
                  <View style={styles.repsCol}>
                    <Text style={styles.headerLabel}>Reps</Text>
                  </View>
                  <View style={styles.actionCol} />
                </View>
              )}

              {activeDay.exercises.map((exercise, idx) => (
                <Animated.View
                  key={exercise.id}
                  entering={FadeInRight.delay(Math.min(idx, 8) * 50).duration(200)}
                  style={styles.exerciseRow}
                >
                  <View style={styles.nameCol}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                      {exercise.name}
                    </Text>
                  </View>
                  <View style={styles.setsCol}>
                    <View style={styles.numBox}>
                      <Text style={styles.numText}>{exercise.sets}</Text>
                    </View>
                  </View>
                  <View style={styles.repsCol}>
                    <View style={[styles.numBox, exercise.duration && styles.numBoxWide]}>
                      <Text style={styles.numText} numberOfLines={1}>
                        {exercise.duration || exercise.reps || '-'}
                      </Text>
                    </View>
                  </View>
                  {!isReadOnly ? (
                    <Pressable onPress={() => handleDeleteExercise(exercise)} hitSlop={8} style={styles.actionCol}>
                      <TrashIcon size={16} />
                    </Pressable>
                  ) : (
                    <View style={styles.actionCol} />
                  )}
                </Animated.View>
              ))}

              {activeDay.exercises.length === 0 && (
                <Text style={styles.emptyExercises}>No exercises yet. Tap + to add.</Text>
              )}

              {/* Add exercise — inline row matching the table */}
              {!isReadOnly && (
                showAddExercise ? (
                  <View style={styles.inlineAddSection}>
                    {/* Name row */}
                    <View style={styles.inlineNameRow}>
                      <TextInput
                        value={newExName}
                        onChangeText={setNewExName}
                        placeholder="Exercise name"
                        style={styles.inlineNameInput}
                        placeholderTextColor={colors.textTertiary}
                        autoFocus
                        returnKeyType="next"
                      />
                    </View>
                    {/* Sets & Reps row */}
                    <View style={styles.inlineNumRow}>
                      <TextInput
                        value={newExSets}
                        onChangeText={setNewExSets}
                        placeholder="Sets"
                        keyboardType="number-pad"
                        style={styles.inlineNumInput}
                        placeholderTextColor={colors.textTertiary}
                      />
                      <TextInput
                        value={newExReps}
                        onChangeText={setNewExReps}
                        placeholder="Reps"
                        keyboardType="number-pad"
                        style={styles.inlineNumInput}
                        placeholderTextColor={colors.textTertiary}
                      />
                      <Text style={styles.orText}>or</Text>
                      {/* Duration: number + unit toggle */}
                      <TextInput
                        value={newExDurValue}
                        onChangeText={setNewExDurValue}
                        placeholder="0"
                        keyboardType="number-pad"
                        style={styles.inlineNumInput}
                        placeholderTextColor={colors.textTertiary}
                      />
                      <Pressable
                        onPress={() => {
                          ReactNativeHapticFeedback.trigger('impactLight');
                          setNewExDurUnit((u) => (u === 'secs' ? 'mins' : 'secs'));
                        }}
                        style={styles.unitToggle}
                      >
                        <Text style={styles.unitToggleText}>{newExDurUnit}</Text>
                      </Pressable>
                    </View>
                    {/* Add + Cancel */}
                    <View style={styles.inlineActionsRow}>
                      <Pressable
                        onPress={handleAddExercise}
                        style={[styles.inlineAddBtn, (!newExName.trim() || !newExSets.trim()) && styles.disabledOpacity]}
                        disabled={!newExName.trim() || !newExSets.trim()}
                      >
                        <Text style={styles.inlineAddBtnLabel}>Add</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { setShowAddExercise(false); setNewExName(''); setNewExSets(''); setNewExReps(''); setNewExDurValue(''); setNewExDurUnit('secs'); }}
                        style={styles.inlineCancelBtn}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => setShowAddExercise(true)} style={styles.addCircleCenter}>
                    <View style={styles.addCircle}>
                      <Text style={styles.addCircleIcon}>+</Text>
                    </View>
                  </Pressable>
                )
              )}
            </Animated.View>
          )}

          {/* Notes */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.notesSection}>
            <TextInput
              value={notes}
              onChangeText={(t) => t.length <= MAX_NOTES_LENGTH && setNotes(t)}
              placeholder="Tips, links, instructions..."
              multiline
              numberOfLines={4}
              style={styles.notesInput}
              placeholderTextColor={colors.textTertiary}
              editable={!isReadOnly}
            />
            <Text style={styles.notesCounter}>
              {MAX_NOTES_LENGTH - notes.length} words remaining
            </Text>
          </Animated.View>

          {/* Submit */}
          {!isReadOnly && (
            <View style={styles.submitRow}>
              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [styles.submitButton, pressed && styles.submitPressed, isLoading && styles.disabledOpacity]}
                disabled={isLoading}
              >
                <Text style={styles.submitText}>{isEdit ? 'Update' : 'Submit'}</Text>
              </Pressable>
            </View>
          )}
        </KeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },
  inputContainer: { marginBottom: spacing.lg },

  // Days
  daysSection: { marginBottom: spacing.lg },
  dayPillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  dayPill: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    minWidth: 72,
    alignItems: 'center',
  },
  dayPillActive: { backgroundColor: colors.primaryDark },
  dayPillText: { ...typography.buttonSmall, color: colors.white },
  dayPillTextActive: { color: colors.white, fontWeight: '700' },
  dayMuscleInput: {
    flex: 1,
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    ...typography.body,
    color: colors.text,
  },
  trashButton: { marginLeft: spacing.sm, padding: spacing.xs },

  // Add day
  addDayRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  addDayInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    fontSize: 14,
    color: colors.text,
  },
  addCircleSmall: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleText: { color: colors.white, fontSize: 20, fontWeight: '500', marginTop: -1 },
  addCircleCenter: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  addCircleIcon: { color: colors.white, fontSize: 26, fontWeight: '300', marginTop: -1 },
  disabledOpacity: { opacity: 0.4 },
  cancelButton: { marginLeft: spacing.md, paddingVertical: spacing.sm },
  cancelText: { ...typography.bodySmall, color: colors.textSecondary },

  // Exercises
  exercisesSection: { marginBottom: spacing.lg },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm, marginBottom: spacing.xs },
  headerLabel: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  nameCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  setsCol: {
    width: 56,
    alignItems: 'center' as const,
  },
  repsCol: {
    width: 72,
    alignItems: 'center' as const,
  },
  actionCol: {
    width: 32,
    alignItems: 'center' as const,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  exerciseName: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 18,
  },
  numBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    minWidth: 42,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  numBoxWide: {
    minWidth: 64,
    paddingHorizontal: spacing.xs,
  },
  numText: { ...typography.bodySmall, textAlign: 'center', color: colors.text, fontWeight: '500' },
  emptyExercises: { ...typography.bodySmall, textAlign: 'center', paddingVertical: spacing.xxl, color: colors.textTertiary },

  // Inline add exercise (matches table rows)
  inlineAddSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  inlineNameRow: {
    marginBottom: spacing.sm,
  },
  inlineNameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inlineNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineNumInput: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    textAlign: 'center',
    width: 60,
  },
  orText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginHorizontal: spacing.xxs,
  },
  unitToggle: {
    backgroundColor: colors.primarySurface,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unitToggleText: {
    ...typography.buttonSmall,
    color: colors.primary,
    fontSize: 12,
  },
  inlineActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  inlineAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xxl,
  },
  inlineAddBtnLabel: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  inlineCancelBtn: {
    paddingVertical: spacing.sm,
  },

  // Notes
  notesSection: { marginBottom: spacing.lg },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: 14,
    color: colors.text,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  notesCounter: { ...typography.caption, color: colors.primary, textAlign: 'right', marginTop: spacing.xs },

  // Submit
  submitRow: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xxxxl + spacing.xl,
  },
  submitPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  submitText: { ...typography.button, color: colors.white, fontSize: 17 },
});
