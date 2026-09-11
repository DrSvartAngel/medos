import React, { forwardRef } from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Input, type InputProps } from './Input';
import { useTheme } from '@/hooks/useTheme';
import { IconSizes } from '@/theme/icons';

export interface SearchProps
  extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Search primitive: Specialized search input reusing the core Input primitive.
 * Includes search icon adornment and clear-button action.
 */
export const Search = forwardRef<TextInput, SearchProps>(function Search(
  {
    value,
    onChangeText,
    onClear,
    placeholder = 'Search...',
    containerStyle,
    ...props
  },
  ref
) {
  const { colors, spacing } = useTheme();

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Input
        {...props}
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType="search"
        leftIcon={
          <Feather
            name="search"
            size={IconSizes.sm}
            color={colors.textMuted}
          />
        }
        rightIcon={
          value.length > 0 ? (
            <TouchableOpacity
              onPress={handleClear}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name="x"
                size={IconSizes.sm}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
});
