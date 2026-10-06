import { View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';
import { scanQuality } from '@/utils/scan-quality';

export function ScanQualityIndicator({ count }: { count: number }) {
  const quality = scanQuality(count);
  const percent = Math.round(quality.ratio * 100);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <ThemedText variant="headline">Scan coverage</ThemedText>
        <ThemedText variant="headline" style={{ fontVariant: ['tabular-nums'], color: colors.accent }}>
          {percent}%
        </ThemedText>
      </View>
      <ProgressBar value={quality.ratio} label={`Scan coverage ${percent} percent`} />
      <ThemedText variant="headline">{quality.label}</ThemedText>
      <ThemedText variant="subhead">{quality.message}</ThemedText>
    </View>
  );
}
