import { View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';
import { type StageVisual } from '@/utils/processing';

export function ProcessingStep({ label, state }: { label: string; state: StageVisual }) {
  const color = state === 'pending' ? colors.textTertiary : state === 'active' ? colors.accent : colors.textPrimary;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 }}>
      <View
        style={{
          width: 22,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {state === 'complete' ? (
          <AppIcon name="check" size={16} color={colors.textPrimary} />
        ) : (
          <View
            style={{
              width: state === 'active' ? 10 : 8,
              height: state === 'active' ? 10 : 8,
              borderRadius: 5,
              backgroundColor: state === 'active' ? colors.accent : 'transparent',
              borderWidth: 1,
              borderColor: state === 'active' ? colors.accent : colors.textTertiary,
            }}
          />
        )}
      </View>
      <ThemedText variant="body" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}
