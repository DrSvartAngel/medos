import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
  StyleSheet,
} from 'react-native';
import { Input as GSInput, InputField, InputSlot } from './input/index';
import { AppText } from './Typography';
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
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

/** Controlled input backed by Gluestack UI; validation and draft ownership stay with the caller. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    invalid = false,
    multiline = false,
    editable = true,
    style,
    onFocus,
    onBlur,
    accessibilityState,
    label,
    helperText,
    errorText,
    leftIcon,
    rightIcon,
    placeholderTextColor,
    className,
    ...props
  },
  ref
) {
  const { colors, spacing, radius, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const hasError = Boolean(invalid || errorText || accessibilityState?.invalid);
  const minHeight = multiline ? Layout.textAreaMinHeight : Math.max(44, Layout.inputMinHeight);

  const inputNode = (
    <GSInput
      style={[
        styles.container,
        {
          minHeight,
          backgroundColor: colors.surface,
          borderColor: invalid ? colors.error : hasError ? colors.error : focused ? colors.primary : colors.cardBorder,
          borderRadius: radius.md,
          borderWidth: Interaction.borderWidth,
          paddingHorizontal: spacing.md,
          opacity: editable ? 1 : Interaction.disabledOpacity,
        },
        style as ViewStyle,
      ]}
      className={className}
    >
      {leftIcon ? <InputSlot style={{ marginRight: spacing.xs }}>{leftIcon}</InputSlot> : null}
      <InputField
        {...props}
        ref={ref as any}
        multiline={multiline}
        editable={editable}
        placeholderTextColor={placeholderTextColor ?? colors.textMuted}
        accessibilityState={{
          ...accessibilityState,
          disabled: !editable || accessibilityState?.disabled,
          invalid: hasError,
        }}
        onFocus={(event: any) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event: any) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.field,
          {
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
            fontSize: typography.size.base,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingVertical: multiline ? spacing.sm : 0,
          },
        ]}
      />
      {rightIcon ? <InputSlot style={{ marginLeft: spacing.xs }}>{rightIcon}</InputSlot> : null}
    </GSInput>
  );

  if (!label && !helperText && !errorText) {
    return inputNode;
  }

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" color={colors.textPrimary} style={{ marginBottom: spacing.xs }}>
          {label}
        </AppText>
      ) : null}
      {inputNode}
      {errorText ? (
        <View accessibilityLiveRegion="polite" style={{ marginTop: spacing.xxs }}>
          <AppText variant="caption" color={colors.error}>
            {errorText}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xxs }}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  field: {
    flex: 1,
    height: '100%',
  },
});
