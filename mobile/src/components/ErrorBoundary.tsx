import React, { Component } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { typography } from '../theme/typography';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>!</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Please try again.
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  emoji: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.md,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
});
