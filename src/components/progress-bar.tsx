import { View } from 'react-native';

import { colors, radius } from '@/theme';

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const ratio = Math.max(0, Math.min(1, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={{
        height: 4,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceSecondary,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${ratio * 100}%`,
          height: 4,
          borderRadius: radius.full,
          backgroundColor: colors.accent,
        }}
      />
    </View>
  );
}
