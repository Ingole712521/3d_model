import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useScan } from '@/store/scan-store';
import { colors, spacing } from '@/theme';
import { formatScanDate, photoCountLabel, routeParam, statusLabel } from '@/utils/format';

export function ScanInfoScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const scan = useScan(routeParam(params.id));
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        paddingTop: spacing.xl,
        gap: spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
      }}>
      <ThemedText variant="title" accessibilityRole="header">
        Scan details
      </ThemedText>
      {scan ? (
        <View style={{ gap: spacing.sm }}>
          <Detail label="Room" value={scan.name} />
          <Detail label="Captured" value={formatScanDate(scan.createdAt)} />
          <Detail label="Photos" value={photoCountLabel(scan)} />
          <Detail label="Status" value={statusLabel(scan.status)} />
          <ThemedText variant="caption">
            {scan.modelUrl
              ? 'This model was reconstructed from the captured photos.'
              : 'No reconstructed model is available for this scan.'}
          </ThemedText>
        </View>
      ) : (
        <ThemedText variant="subhead" selectable>
          This scan could not be found.
        </ThemedText>
      )}
      <AppButton title="Close" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <ThemedText variant="caption">{label}</ThemedText>
      <ThemedText variant="body" selectable>
        {value}
      </ThemedText>
    </View>
  );
}
