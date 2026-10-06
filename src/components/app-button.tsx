import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors, radius, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
};

const backgrounds: Record<Variant, string> = {
  primary: colors.textPrimary,
  secondary: colors.surfaceSecondary,
  ghost: 'transparent',
  danger: colors.surfaceSecondary,
};

const labels: Record<Variant, string> = {
  primary: colors.background,
  secondary: colors.textPrimary,
  ghost: colors.textSecondary,
  danger: colors.danger,
};

export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  icon,
  ...rest
}: AppButtonProps) {
  const inactive = disabled || loading;
  const labelColor = labels[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        {
          minHeight: 52,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: backgrounds[variant],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          opacity: inactive ? 0.4 : pressed ? 0.72 : 1,
          transform: [{ scale: pressed && !inactive ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}>
      {loading ? <ActivityIndicator color={labelColor} /> : icon}
      {loading ? null : (
        <ThemedText variant="button" style={{ color: labelColor }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}
