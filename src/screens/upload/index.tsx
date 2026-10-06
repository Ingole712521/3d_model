import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useCurrentScan, useScanStore } from '@/store/scan-store';
import { colors, spacing } from '@/theme';
import { formatClock } from '@/utils/persist-video';

const uploadsInFlight = new Set<string>();

export function UploadScreen() {
  const scan = useCurrentScan();
  const submitVideo = useScanStore((state) => state.submitVideo);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const videoUri = scan?.localVideo?.uri;

  useEffect(() => {
    if (!scan?.id || !videoUri) return;
    if ((scan.uploadProgress ?? 0) >= 1) {
      router.replace({ pathname: '/processing/[id]', params: { id: scan.id } });
      return;
    }
    if (uploadsInFlight.has(scan.id)) return;
    const scanId = scan.id;
    uploadsInFlight.add(scanId);
    void (async () => {
      try {
        const next = await submitVideo();
        router.replace({ pathname: '/processing/[id]', params: { id: next.id } });
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'The video could not be uploaded.';
        setError(message);
      } finally {
        uploadsInFlight.delete(scanId);
      }
    })();
  }, [attempt, scan?.id, scan?.uploadProgress, submitVideo, videoUri]);

  if (!scan?.localVideo) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Upload" onBack={() => router.back()} />
        <Screen>
          <EmptyState
            title="No video yet"
            message="Record a walkthrough before uploading."
            actionLabel="Back to camera"
            onAction={() => router.replace('/camera')}
          />
        </Screen>
      </View>
    );
  }

  const progress = scan.uploadProgress ?? 0;
  const sizeLabel = scan.localVideo.bytes ? formatBytes(scan.localVideo.bytes) : 'Video';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="" onBack={() => router.back()} />
      <Screen>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="largeTitle" accessibilityRole="header">
            Uploading video
          </ThemedText>
          <ThemedText variant="subhead">
            {`${formatClock(scan.localVideo.durationSeconds)} walkthrough · ${sizeLabel}`}
          </ThemedText>
        </View>
        {error ? (
          <EmptyState
            title="Upload didn't finish"
            message={error}
            actionLabel="Try again"
            onAction={() => setAttempt((value) => value + 1)}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="largeTitle" style={{ fontVariant: ['tabular-nums'], color: colors.accent }}>
              {Math.round(progress * 100)}%
            </ThemedText>
            <ProgressBar value={progress} label={`Upload ${Math.round(progress * 100)} percent`} />
            <ThemedText variant="subhead">Sending the video to the reconstruction server.</ThemedText>
            <ThemedText variant="caption">Frame extraction starts as soon as the upload finishes.</ThemedText>
          </View>
        )}
      </Screen>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
