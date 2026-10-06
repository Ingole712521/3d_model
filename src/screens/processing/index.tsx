import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ProcessingStep } from '@/components/processing-step';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useScan, useScanStore } from '@/store/scan-store';
import { colors, spacing } from '@/theme';
import { formatRemaining, routeParam } from '@/utils/format';
import { stageLabel, stagesFor, stageVisual } from '@/utils/processing';

export function ProcessingScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = routeParam(params.id);
  const scan = useScan(id);
  const ensureProcessing = useScanStore((state) => state.ensureProcessing);
  const refreshScan = useScanStore((state) => state.refreshScan);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const navigated = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const next = await refreshScan(id);
        if (cancelled) return;
        if (next.status === 'failed') {
          setError(next.errorMessage ?? "We couldn't create the 3D model.");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        if (next.status === 'completed') {
          if (!navigated.current) {
            navigated.current = true;
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace({ pathname: '/viewer/[id]', params: { id: next.id } });
          }
          return;
        }
        timer = setTimeout(() => {
          void tick();
        }, 400);
      } catch {
        if (!cancelled) setError("We couldn't create the 3D model.");
      }
    };

    const start = async () => {
      try {
        await ensureProcessing(id);
        if (!cancelled) await tick();
      } catch {
        if (!cancelled) setError("We couldn't create the 3D model.");
      }
    };

    navigated.current = false;
    setError(null);
    void start();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt, ensureProcessing, id, refreshScan]);

  if (!id || (!scan && error)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Creating your 3D space" onBack={() => router.back()} />
        <Screen>
          <EmptyState
            title="Scan unavailable"
            message="This scan could not be found."
            actionLabel="Go home"
            onAction={() => router.replace('/')}
          />
        </Screen>
      </View>
    );
  }

  const failed = scan?.status === 'failed' || !!error;
  const progress = scan?.progress ?? 0;
  const video = scan?.source === 'video';
  const stages = stagesFor(scan?.source);
  const frameNote =
    video && scan?.usableFrameCount
      ? `${scan.usableFrameCount} frames kept for reconstruction.`
      : video
        ? 'Frames are extracted from your walkthrough, then the existing reconstruction pipeline builds the room.'
        : 'COLMAP is reconstructing this room from your photos. This can take several minutes.';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="" onBack={() => router.back()} />
      <Screen scroll>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="largeTitle" accessibilityRole="header">
            Creating your 3D space
          </ThemedText>
          <ThemedText variant="subhead">
            {video ? "We're turning your walkthrough into a 3D model." : "We're processing your photos into a 3D model."}
          </ThemedText>
        </View>

        {failed ? (
          <EmptyState
            title="We couldn't create the 3D model."
            message={scan?.errorMessage ?? error ?? 'Something interrupted reconstruction.'}
            actionLabel="Try Again"
            onAction={() => setAttempt((value) => value + 1)}
          />
        ) : (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="largeTitle" style={{ fontVariant: ['tabular-nums'], color: colors.accent }}>
                {Math.round(progress)}%
              </ThemedText>
              <ProgressBar value={progress / 100} label={`Reconstruction ${Math.round(progress)} percent`} />
              <ThemedText variant="headline">{stageLabel(scan?.processingStage, scan?.source)}</ThemedText>
              <ThemedText variant="subhead">{formatRemaining(scan?.estimatedSecondsRemaining)}</ThemedText>
            </View>
            <View style={{ gap: spacing.xs }}>
              {stages.map((stage) => (
                <ProcessingStep
                  key={stage.id}
                  label={stage.label}
                  state={stageVisual(scan?.processingStage, stage.id, stages)}
                />
              ))}
            </View>
            <ThemedText variant="caption">{frameNote}</ThemedText>
          </View>
        )}
      </Screen>
    </View>
  );
}
