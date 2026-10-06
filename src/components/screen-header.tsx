import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

type ScreenHeaderProps = {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  overlay?: boolean;
};

export function ScreenHeader({ title, onBack, right, overlay = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: overlay ? colors.overlay : colors.background,
      }}>
      {onBack ? <IconButton icon="back" label="Go back" onPress={onBack} /> : <View style={{ width: 44 }} />}
      <ThemedText variant="headline" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
        {title}
      </ThemedText>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}
