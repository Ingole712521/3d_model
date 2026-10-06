import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ScanCard, ScanCardSkeleton } from '@/components/scan-card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useScanStore } from '@/store/scan-store';
import { colors, spacing } from '@/theme';
import { type Scan } from '@/types/scan';

export function HistoryScreen() {
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Your spaces" onBack={() => router.back()} />
      <FlatList
        data={historyStatus === 'loading' && history.length === 0 ? [] : history}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
          gap: spacing.sm,
          flexGrow: 1,
          width: '100%',
          maxWidth: 560,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <ThemedText variant="subhead" style={{ marginBottom: spacing.sm }}>
            Rooms you have captured.
          </ThemedText>
        }
        ListEmptyComponent={
          historyStatus === 'loading' ? (
            <ScanCardSkeleton />
          ) : historyStatus === 'error' ? (
            <EmptyState
              title="Couldn't load scans"
              message={historyError ?? "We couldn't load your spaces."}
              actionLabel="Try again"
              onAction={() => {
                void loadHistory();
              }}
            />
          ) : (
            <EmptyState
              title="No spaces yet"
              message="Your scanned spaces will appear here."
              actionLabel="Scan your first room"
              onAction={() => router.push('/instructions')}
            />
          )
        }
        renderItem={({ item }) => <ScanCard scan={item} onPress={() => openScan(item, focusScan)} />}
      />
    </View>
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
  router.push(scan.status === 'reviewing' ? '/review' : '/camera');
}
