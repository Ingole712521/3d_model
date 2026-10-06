import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { MAX_RECORD_SECONDS, MAX_VIDEO_SECONDS, MIN_VIDEO_SECONDS } from '@/constants/scan';
import { useCurrentScan, useScanStore } from '@/store/scan-store';
import { colors, radius, spacing } from '@/theme';
import { formatClock, persistVideo, videoExtension } from '@/utils/persist-video';

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const scan = useCurrentScan();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef(false);
  const startedAt = useRef(0);
  const attachVideo = useScanStore((state) => state.attachVideo);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      setElapsed((Date.now() - startedAt.current) / 1000);
    }, 200);
    return () => clearInterval(timer);
  }, [recording]);

  const goBack = () => {
    if (recording) cameraRef.current?.stopRecording();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const acceptVideo = async (uri: string, filename: string, durationSeconds: number) => {
    if (!scan) return;
    if (durationSeconds < MIN_VIDEO_SECONDS) {
      setCaptureError(`Record at least ${MIN_VIDEO_SECONDS} seconds while you walk through the room.`);
      return;
    }
    if (durationSeconds > MAX_VIDEO_SECONDS) {
      setCaptureError('Keep the walkthrough under 3 minutes.');
      return;
    }
    const stored = await persistVideo(uri, scan.id, filename);
    attachVideo({
      uri: stored.uri,
      filename: `video.${videoExtension(filename)}`,
      durationSeconds,
      bytes: stored.bytes,
    });
    router.push('/upload');
  };

  const startRecording = async () => {
    if (!cameraRef.current || !ready || recordingRef.current) return;
    recordingRef.current = true;
    setCaptureError(null);
    setElapsed(0);
    startedAt.current = Date.now();
    setRecording(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_RECORD_SECONDS });
      const durationSeconds = (Date.now() - startedAt.current) / 1000;
      if (!video?.uri) throw new Error('empty');
      await acceptVideo(video.uri, 'video.mp4', durationSeconds);
    } catch {
      setCaptureError('Unable to save this video. Try again.');
    } finally {
      recordingRef.current = false;
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (!recordingRef.current) return;
    cameraRef.current?.stopRecording();
  };

  const importVideo = async () => {
    if (!scan || importing || recording) return;
    setImporting(true);
    setCaptureError(null);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setCaptureError('Photo library access is required to import a video.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const filename = asset.fileName || 'video.mp4';
      const durationSeconds = (asset.duration ?? 0) / 1000;
      await acceptVideo(asset.uri, filename, durationSeconds);
    } catch {
      setCaptureError('Unable to import this video. Try again.');
    } finally {
      setImporting(false);
    }
  };

  if (!scan) {
    return (
      <Fallback
        title="Scan unavailable"
        message="Start a new room scan from the home screen."
        action="Go home"
        onAction={() => router.replace('/')}
      />
    );
  }

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <ActivityIndicator color={colors.textPrimary} />
        <ThemedText variant="subhead">Preparing camera</ThemedText>
      </View>
    );
  }

  if (!permission.granted) {
    const blocked = permission.status === 'denied' && !permission.canAskAgain;
    return (
      <Fallback
        title="Camera access"
        message="Camera access is required to record a walkthrough of your room."
        action={blocked ? 'Open Settings' : 'Allow camera'}
        onAction={() => {
          if (blocked) void Linking.openSettings();
          else void requestPermission();
        }}
        onBack={goBack}
      />
    );
  }

  if (cameraError) {
    return (
      <Fallback title="Camera unavailable" message={cameraError} action="Go back" onAction={goBack} />
    );
  }

  const clock = formatClock(recording ? elapsed : 0);
  const hint = captureError
    ?? (recording
      ? 'Walk slowly around the room. Overlap what you just filmed.'
      : 'Record a 60–90 second walkthrough. Move your feet, and keep the floor in frame.');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          mode="video"
          mute
          videoQuality="1080p"
          enableTorch={torch}
          onCameraReady={() => setReady(true)}
          onMountError={() => setCameraError("The camera isn't available on this device.")}
        />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
          <CornerGuides />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="scan" size={28} color="rgba(245,245,245,0.8)" />
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <IconButton icon="back" label="Go back" onPress={goBack} background={colors.overlay} />
          <ThemedText variant="headline" style={{ flex: 1, textAlign: 'center' }}>
            Record Room
          </ThemedText>
          <View
            accessibilityLabel={recording ? `Recording ${clock}` : 'Not recording'}
            style={{
              minWidth: 72,
              height: 36,
              borderRadius: radius.full,
              backgroundColor: colors.overlay,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.sm,
            }}>
            <ThemedText variant="caption" style={{ color: recording ? colors.danger : colors.textPrimary, fontVariant: ['tabular-nums'] }}>
              {recording ? clock : '0:00'}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={{ paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md, gap: spacing.md, backgroundColor: colors.background }}>
        <ThemedText
          variant="subhead"
          accessibilityLiveRegion="polite"
          style={{ textAlign: 'center', paddingHorizontal: spacing.lg, color: captureError ? colors.danger : colors.textSecondary }}>
          {hint}
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl }}>
          <IconButton
            icon="photos"
            label="Import a video"
            onPress={() => void importVideo()}
            disabled={importing || recording}
            background={colors.surface}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
            disabled={!ready || importing}
            onPress={() => {
              if (recording) stopRecording();
              else void startRecording();
            }}
            style={({ pressed }) => ({
              width: 76,
              height: 76,
              borderRadius: radius.full,
              borderWidth: 3,
              borderColor: colors.shutter,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !ready || importing ? 0.4 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}>
            {recording ? (
              <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: colors.danger }} />
            ) : (
              <View style={{ width: 60, height: 60, borderRadius: radius.full, backgroundColor: colors.danger }} />
            )}
          </Pressable>
          <IconButton
            icon={torch ? 'flash' : 'flashOff'}
            label={torch ? 'Turn torch off' : 'Turn torch on'}
            color={torch ? colors.accent : colors.textPrimary}
            onPress={() => setTorch((current) => !current)}
            disabled={recording}
            background={colors.surface}
          />
        </View>
        <ThemedText variant="caption" style={{ textAlign: 'center' }}>
          {`Stops automatically at ${formatClock(MAX_RECORD_SECONDS)} · MP4, MOV, or M4V`}
        </ThemedText>
      </View>
    </View>
  );
}

function CornerGuides() {
  const corner = {
    position: 'absolute' as const,
    width: 28,
    height: 28,
    borderColor: 'rgba(245,245,245,0.85)',
  };
  return (
    <>
      <View style={[corner, { top: '18%', left: '12%', borderTopWidth: 1.5, borderLeftWidth: 1.5 }]} />
      <View style={[corner, { top: '18%', right: '12%', borderTopWidth: 1.5, borderRightWidth: 1.5 }]} />
      <View style={[corner, { bottom: '18%', left: '12%', borderBottomWidth: 1.5, borderLeftWidth: 1.5 }]} />
      <View style={[corner, { bottom: '18%', right: '12%', borderBottomWidth: 1.5, borderRightWidth: 1.5 }]} />
    </>
  );
}

function Fallback({
  title,
  message,
  action,
  onAction,
  onBack,
}: {
  title: string;
  message: string;
  action: string;
  onAction: () => void;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md, gap: spacing.lg }}>
      {onBack ? <IconButton icon="back" label="Go back" onPress={onBack} /> : null}
      <View style={{ gap: spacing.sm, paddingTop: spacing.xl }}>
        <ThemedText variant="title">{title}</ThemedText>
        <ThemedText variant="subhead" selectable>
          {message}
        </ThemedText>
      </View>
      <AppButton title={action} onPress={onAction} />
    </View>
  );
}
