import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignUpScreen from '../screens/SignUpScreen';

export type AuthStackParamList = {
  SignUp: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
