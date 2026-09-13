import React from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { IconSizes } from '@/theme/icons';

export interface AcademicContextSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
  searchAccessibilityLabel?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Dedicated Native Academic Context Sheet
 *
 * Uses React Native's native Modal with statusBarTranslucent to completely escape
 * parent layout containers (ScreenWrapper, ScrollView, PageContainer, etc.).
 *
 * Employs explicit numeric physical height (~78% of viewport height) to eliminate
 * any flex-collapse behavior on Android Yoga layout and guarantee immediate visibility
 * of header, search bar, and scrollable options above the system navigation area.
 */
export function AcademicContextSheet({
  visible,
  onClose,
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  searchAccessibilityLabel,
  children,
  style,
}: AcademicContextSheetProps) {
  const { colors, spacing, radius, borders } = useTheme();
  const { isTablet } = useResponsive();
  const { height: windowHeight } = useWindowDimensions();

  // Bounded physical height calculation:
  // Explicit numeric height ~78% of viewport height on phones (well within 70-85% target)
  const phoneSheetHeight = Math.max(340, Math.round(windowHeight * 0.78));
  const tabletSheetHeight = Math.min(620, Math.round(windowHeight * 0.75));
  const resolvedHeight = isTablet ? tabletSheetHeight : phoneSheetHeight;
  const maxHeight = Math.round(windowHeight * 0.82);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Full-screen pressable backdrop */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        />

        {/* Position container: bottom-anchored on phone, centered on tablet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={isTablet ? styles.tabletPositioner : styles.phonePositioner}
          pointerEvents="box-none"
        >
          <View
            style={[
              isTablet ? styles.tabletSheet : styles.phoneSheet,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.borderSubtle,
                borderWidth: borders.standard,
                height: resolvedHeight,
                maxHeight: maxHeight,
              },
              style,
            ]}
          >
            {/* Sheet Header */}
            <View
              style={[
                styles.header,
                {
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  borderBottomColor: colors.borderSubtle,
                  borderBottomWidth: borders.hairline,
                },
              ]}
            >
              <View style={styles.headerText}>
                <AppText
                  variant="headingS"
                  color={colors.textPrimary}
                  numberOfLines={1}
                >
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText
                    variant="bodyS"
                    color={colors.textSecondary}
                    style={{ marginTop: spacing.xxs }}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </AppText>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Feather
                  name="x"
                  size={IconSizes.sm}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Optional Pinned Search Bar */}
            {onSearchChange !== undefined ? (
              <View
                style={[
                  styles.searchContainer,
                  {
                    paddingHorizontal: spacing.lg,
                    paddingTop: spacing.sm,
                    paddingBottom: spacing.xs,
                  },
                ]}
              >
                <Input
                  value={searchQuery ?? ''}
                  onChangeText={onSearchChange}
                  placeholder={searchPlaceholder ?? 'Ara...'}
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel={searchAccessibilityLabel ?? 'Ara'}
                />
              </View>
            ) : null}

            {/* Body Content with Explicit Height Constraints */}
            <View
              style={[
                styles.sheetBody,
                {
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.xs,
                },
              ]}
            >
              {children}
            </View>

            {/* Safe area inset for system navigation */}
            {!isTablet ? <SafeAreaView edges={['bottom']} /> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  phonePositioner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tabletPositioner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneSheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  tabletSheet: {
    width: '90%',
    maxWidth: 540,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    width: '100%',
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
  },
});
