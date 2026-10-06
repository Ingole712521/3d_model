import { type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
};

export function Screen({ children, scroll = false, footer, style, padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = padded ? spacing.md : 0;

  const body = scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: padding,
        paddingBottom: footer ? spacing.lg : insets.bottom + spacing.xl,
        gap: spacing.lg,
        width: '100%',
        maxWidth: 560,
        alignSelf: 'center',
      }}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      {body}
      {footer ? (
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.md,
            gap: spacing.sm,
            backgroundColor: colors.background,
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
          }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
