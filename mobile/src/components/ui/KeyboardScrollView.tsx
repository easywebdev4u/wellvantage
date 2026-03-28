import React, { memo, forwardRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { ScrollViewProps } from 'react-native';

interface KeyboardScrollViewProps extends ScrollViewProps {
  extraKeyboardOffset?: number;
}

const KeyboardScrollView = memo(
  forwardRef<ScrollView, KeyboardScrollViewProps>(
    ({ extraKeyboardOffset = 30, children, contentContainerStyle, ...props }, ref) => (
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          { paddingBottom: extraKeyboardOffset },
          contentContainerStyle,
        ]}
        {...props}
      >
        {children}
      </ScrollView>
    ),
  ),
);

KeyboardScrollView.displayName = 'KeyboardScrollView';
export default KeyboardScrollView;
