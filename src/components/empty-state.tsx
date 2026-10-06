import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/theme';

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  loading = false,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={{ alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.lg }}>
      <ThemedText variant="title" selectable>
        {title}
      </ThemedText>
      <ThemedText variant="subhead" selectable>
        {message}
      </ThemedText>
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} loading={loading} style={{ alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}
