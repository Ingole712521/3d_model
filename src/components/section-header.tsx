import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}>
      <ThemedText variant="headline">{title}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={8} onPress={onAction}>
          <ThemedText variant="subhead" style={{ color: colors.accent }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}
