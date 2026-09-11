import React from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppText } from './Typography';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { IconSizes } from '@/theme/icons';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  presentation?: 'auto' | 'sheet' | 'modal';
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Modal / Sheet foundation primitive.
 * Supports header, content, close action, optional footer, and responsive presentation:
 * Phone renders a bottom sheet (top radius 28), tablet renders a centered panel (radius 20).
 */
export function Modal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  presentation = 'auto',
  scrollable = true,
  style,
  contentStyle,
  accessibilityLabel,
}: ModalProps) {
  const { colors, spacing, radius, borders } = useTheme();
  const { isTablet } = useResponsive();

  const isSheet =
    presentation === 'sheet' || (presentation === 'auto' && !isTablet);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={isSheet ? 'slide' : 'fade'}
      onRequestClose={onClose}
      accessibilityLabel={accessibilityLabel ?? title ?? 'Dialog'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        <View
          style={[
            isSheet ? styles.sheetContainer : styles.modalContainer,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.borderSubtle,
              borderWidth: borders.standard,
              borderRadius: isSheet ? radius.sheet : radius.modal,
              borderBottomLeftRadius: isSheet ? 0 : radius.modal,
              borderBottomRightRadius: isSheet ? 0 : radius.modal,
            },
            style,
          ]}
        >
          {/* Header */}
          {title || onClose ? (
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
                {title ? (
                  <AppText
                    variant="headingS"
                    color={colors.textPrimary}
                    numberOfLines={1}
                  >
                    {title}
                  </AppText>
                ) : null}
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
          ) : null}

          {/* Content */}
          {scrollable ? (
            <ScrollView
              contentContainerStyle={[
                styles.content,
                { padding: spacing.lg },
                contentStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.content,
                { padding: spacing.lg },
                contentStyle,
              ]}
            >
              {children}
            </View>
          )}

          {/* Optional Footer */}
          {footer ? (
            <View
              style={[
                styles.footer,
                {
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  borderTopColor: colors.borderSubtle,
                  borderTopWidth: borders.hairline,
                },
              ]}
            >
              {footer}
            </View>
          ) : null}

          {isSheet ? <SafeAreaView edges={['bottom']} /> : null}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 540,
    maxHeight: '85%',
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
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
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
