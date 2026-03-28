import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RootNavigator } from './navigation/RootNavigator';
import { useAuthStore } from './stores/auth.store';
import { setOnUnauthorized } from './services/api';
import { colors } from './theme';

export default function App() {
  const loadToken = useAuthStore((s) => s.loadToken);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    setOnUnauthorized(logout);
    loadToken();
  }, [loadToken, logout]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.primaryDark}
          />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
