import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { ScanCard, ScanCardSkeleton } from '@/components/scan-card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SpatialHero } from '@/components/spatial-hero';
import { ThemedText } from '@/components/themed-text';
import { useScanStore } from '@/store/scan-store';
import { colors, spacing } from '@/theme';
import { type Scan } from '@/types/scan';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const history = useScanStore((state) => state.history);
  const historyStatus = useScanStore((state) => state.historyStatus);
  const historyError = useScanStore((state) => state.historyError);
  const loadHistory = useScanStore((state) => state.loadHistory);
  const focusScan = useScanStore((state) => state.focusScan);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const recent = history.slice(0, 3);

  return (
    <Screen
      scroll
      footer={
        <View style={{ gap: spacing.sm }}>
          <AppButton title="Scan New Room" onPress={() => router.push('/instructions')} />
          <AppButton title="View History" variant="ghost" onPress={() => router.push('/history')} />
        </View>
      }>
      <View style={{ paddingTop: insets.top + spacing.lg, gap: spacing.xs }}>
        <ThemedText variant="largeTitle" accessibilityRole="header">
          RoomScan <ThemedText variant="largeTitle" style={{ color: colors.accent }}>3D</ThemedText>
        </ThemedText>
        <ThemedText variant="subhead">Turn your space into a 3D model.</ThemedText>
      </View>

      <SpatialHero />
      <ThemedText variant="caption" style={{ textAlign: 'center', letterSpacing: 1.2 }}>
        CAPTURE. RECONSTRUCT. EXPLORE.
      </ThemedText>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Recent scans" />
        {historyStatus === 'loading' && history.length === 0 ? <ScanCardSkeleton /> : null}
        {historyStatus === 'error' && history.length === 0 ? (
          <EmptyState
            title="Couldn't load scans"
            message={historyError ?? "We couldn't load your spaces."}
            actionLabel="Try again"
            onAction={() => {
              void loadHistory();
            }}
          />
        ) : null}
        {historyStatus !== 'loading' && history.length === 0 && historyStatus !== 'error' ? (
          <EmptyState
            title="No scans yet"
            message="Your scanned spaces will appear here."
          />
        ) : null}
        {recent.map((scan) => (
          <ScanCard key={scan.id} scan={scan} onPress={() => openScan(scan, focusScan)} />
        ))}
      </View>
    </Screen>
  );
}

function openScan(scan: Scan, focusScan: (id: string) => void) {
  if (scan.status === 'completed') {
    router.push({ pathname: scan.source === 'video' ? '/tour/[id]' : '/viewer/[id]', params: { id: scan.id } });
    return;
  }
  if (scan.status === 'processing' || scan.status === 'failed') {
    router.push({ pathname: '/processing/[id]', params: { id: scan.id } });
    return;
  }
  focusScan(scan.id);
  router.push(scan.photos.length > 0 && scan.status === 'reviewing' ? '/review' : '/camera');
}
