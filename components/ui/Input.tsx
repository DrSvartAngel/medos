import React, { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Layout } from '@/theme/layout';
import { Interaction } from '@/theme/interaction';

declare module 'react-native' {
  interface AccessibilityState {
    invalid?: boolean | undefined;
  }
}

export interface InputProps extends TextInputProps {
  invalid?: boolean;
}

/** Controlled native input; validation and draft ownership stay with the caller. */
export const Input = forwardRef<TextInput, InputProps>(function Input({
  invalid = false, multiline = false, editable = true, style, onFocus, onBlur,
  accessibilityState, ...props
}, ref) {
  const { colors, spacing, radius, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  return <TextInput {...props} ref={ref} multiline={multiline} editable={editable}
    accessibilityState={{
      ...accessibilityState,
      disabled: !editable || accessibilityState?.disabled,
      invalid: Boolean(invalid || accessibilityState?.invalid),
    }}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={[{
      minHeight: multiline ? Layout.textAreaMinHeight : Layout.inputMinHeight,
      borderWidth: Interaction.borderWidth,
      borderColor: invalid ? colors.error : focused ? colors.primary : colors.border,
      borderRadius: radius.md, padding: spacing.md,
      color: colors.textPrimary, backgroundColor: colors.surface,
      fontFamily: typography.fontFamily, fontSize: typography.size.base,
      textAlignVertical: multiline ? 'top' : 'center',
    }, style]} />;
});
