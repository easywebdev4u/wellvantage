import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutManagementScreen from '../screens/workouts/WorkoutManagementScreen';
import AddEditWorkoutScreen from '../screens/workouts/AddEditWorkoutScreen';
import AssignedClientsScreen from '../screens/clients/AssignedClientsScreen';
import BookClientSlotsScreen from '../screens/availability/BookClientSlotsScreen';
import SetAvailabilityScreen from '../screens/availability/SetAvailabilityScreen';

export type AppStackParamList = {
  WorkoutManagement: undefined;
  AddEditWorkout: { planId?: string } | undefined;
  AssignedClients: { clientId: string };
  BookClientSlots: undefined;
  SetAvailability: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkoutManagement" component={WorkoutManagementScreen} />
      <Stack.Screen
        name="AddEditWorkout"
        component={AddEditWorkoutScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AssignedClients"
        component={AssignedClientsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="BookClientSlots"
        component={BookClientSlotsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SetAvailability"
        component={SetAvailabilityScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
