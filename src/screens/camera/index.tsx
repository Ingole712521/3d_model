import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { MAX_PHOTOS, captureInstruction, captureTarget } from '@/constants/scan';
import { useCurrentScan, useScanStore } from '@/store/scan-store';
import { colors, radius, spacing } from '@/theme';
import { type ScanPhoto } from '@/types/scan';
import { createId } from '@/utils/id';
import { deleteCapturedFile, inspectPhoto, readPhotoSample, type PhotoSample } from '@/utils/photo-check';
import { persistPhoto } from '@/utils/persist-photo';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const scan = useCurrentScan();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const takingRef = useRef(false);
  const addPhoto = useScanStore((state) => state.addPhoto);
  const markReviewing = useScanStore((state) => state.markReviewing);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const samples = useRef(new Map<string, PhotoSample>());
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.get() }));

  const count = scan?.photos.length ?? 0;
  const target = captureTarget(count);
  const instruction = captureInstruction(count);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const finish = () => {
    if (!scan || count === 0) return;
    markReviewing();
    router.navigate('/review');
  };

  const sampleFor = async (uri: string) => {
    const cached = samples.current.get(uri);
    if (cached) return cached;
    try {
      const sample = await readPhotoSample(uri);
      samples.current.set(uri, sample);
      return sample;
    } catch {
      return null;
    }
  };

  const rememberPhoto = async (uri: string, width: number, height: number, sample: PhotoSample | null) => {
    if (!scan) return false;
    const id = createId('photo');
    const storedUri = await persistPhoto(uri, scan.id, id);
    if (sample) samples.current.set(storedUri, sample);
    const photo: ScanPhoto = {
      id,
      uri: storedUri,
      width,
      height,
      filename: `${id}.jpg`,
      createdAt: new Date().toISOString(),
    };
    const saved = addPhoto(photo);
    if (!saved && storedUri !== uri) deleteCapturedFile(storedUri);
    if (saved && storedUri !== uri) deleteCapturedFile(uri);
    return saved;
  };

  const judgePhoto = async (uri: string, previous: PhotoSample | null) => {
    try {
      return await inspectPhoto(uri, previous);
    } catch {
      return null;
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !ready || takingRef.current || count >= MAX_PHOTOS) return;
    takingRef.current = true;
    setBusy(true);
    setCaptureError(null);
    flashOpacity.set(withSequence(withTiming(0.85, { duration: 40 }), withTiming(0, { duration: 220, easing: EASE_OUT })));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!picture?.uri) throw new Error('empty');
      const previousUri = scan?.photos[scan.photos.length - 1]?.uri;
      const previous = previousUri ? await sampleFor(previousUri) : null;
      const verdict = await judgePhoto(picture.uri, previous);
      if (verdict && !verdict.ok) {
        deleteCapturedFile(picture.uri);
        setCaptureError(verdict.message);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      const saved = await rememberPhoto(picture.uri, picture.width, picture.height, verdict?.ok ? verdict.sample : null);
      if (!saved) setCaptureError('This scan already has the maximum of 30 photos.');
    } catch {
      setCaptureError('Unable to capture this photo. Try again.');
    } finally {
      takingRef.current = false;
      setBusy(false);
    }
  };

  const importPhotos = async () => {
    if (!scan || importing || count >= MAX_PHOTOS) return;
    setImporting(true);
    setCaptureError(null);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setCaptureError('Photo library access is required to import images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - count,
        quality: 0.6,
      });
      if (result.canceled) return;
      const lastPhoto = scan.photos[scan.photos.length - 1];
      let previous = lastPhoto ? await sampleFor(lastPhoto.uri) : null;
      let discarded = 0;
      let reason = '';
      for (const asset of result.assets) {
        const verdict = await judgePhoto(asset.uri, previous);
        if (verdict && !verdict.ok) {
          discarded += 1;
          reason = verdict.message;
          continue;
        }
        const sample = verdict?.ok ? verdict.sample : null;
        const saved = await rememberPhoto(asset.uri, asset.width, asset.height, sample);
        if (sample) previous = sample;
        if (!saved) break;
      }
      if (discarded === 1) setCaptureError(reason);
      if (discarded > 1) setCaptureError(`${discarded} photos were discarded. ${reason}`);
    } catch {
      setCaptureError('Unable to import these photos. Try again.');
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
        message="Camera access is required to scan your room."
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
      <Fallback
        title="Camera unavailable"
        message={cameraError}
        action="Go back"
        onAction={goBack}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          mode="picture"
          flash={flash}
          onCameraReady={() => setReady(true)}
          onMountError={() => setCameraError("The camera isn't available on this device.")}
        />
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.shutter }, flashStyle]}
        />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
          <CornerGuides />
          <Reticle />
          <View
            style={{
              position: 'absolute',
              left: spacing.md,
              right: spacing.md,
              bottom: spacing.md,
              backgroundColor: colors.overlay,
              borderRadius: radius.lg,
              padding: spacing.md,
              gap: 4,
            }}>
            <ThemedText variant="headline">{captureError ? 'Take it again' : busy ? 'Checking photo' : instruction.title}</ThemedText>
            <ThemedText variant="caption" style={{ color: captureError ? colors.danger : colors.textSecondary }}>
              {captureError ?? (busy ? 'Hold still while this shot is checked.' : instruction.body)}
            </ThemedText>
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
            Scan Room
          </ThemedText>
          <View
            accessibilityLabel={`${count} of ${target} photos`}
            style={{
              minWidth: 64,
              height: 36,
              borderRadius: radius.full,
              backgroundColor: colors.overlay,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.sm,
            }}>
            <ThemedText
              variant="caption"
              style={{ color: count >= 6 ? colors.accent : colors.textPrimary, fontVariant: ['tabular-nums'] }}>
              {count} / {target}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={{ paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md, gap: spacing.md, backgroundColor: colors.background }}>
        <ThemedText
          variant="subhead"
          accessibilityLiveRegion="polite"
          style={{ textAlign: 'center', paddingHorizontal: spacing.lg, color: captureError ? colors.danger : colors.textSecondary }}>
          {captureError ?? instruction.body}
        </ThemedText>
        {scan.photos.length > 0 ? (
          <FlatList
            horizontal
            data={scan.photos}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.uri }}
                recyclingKey={item.id}
                contentFit="cover"
                style={{ width: 56, height: 56, borderRadius: radius.sm }}
              />
            )}
          />
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl }}>
          <IconButton
            icon="photos"
            label="Import from library"
            onPress={() => void importPhotos()}
            disabled={importing || count >= MAX_PHOTOS}
            background={colors.surface}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            disabled={!ready || busy || count >= MAX_PHOTOS}
            onPress={() => void takePhoto()}
            style={({ pressed }) => ({
              width: 76,
              height: 76,
              borderRadius: radius.full,
              borderWidth: 3,
              borderColor: colors.shutter,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !ready || busy || count >= MAX_PHOTOS ? 0.4 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}>
            <View style={{ width: 60, height: 60, borderRadius: radius.full, backgroundColor: colors.shutter }} />
          </Pressable>
          <IconButton
            icon={flash === 'on' ? 'flash' : 'flashOff'}
            label={flash === 'on' ? 'Turn flash off' : 'Turn flash on'}
            color={flash === 'on' ? colors.accent : colors.textPrimary}
            onPress={() => setFlash((current) => (current === 'on' ? 'off' : 'on'))}
            background={colors.surface}
          />
        </View>
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
          <AppButton title="Finish scan" onPress={finish} disabled={count === 0} variant="secondary" />
          <ThemedText variant="caption" style={{ textAlign: 'center' }}>
            {count >= MAX_PHOTOS ? 'Maximum of 30 photos' : 'Step sideways between shots · 6 minimum'}
          </ThemedText>
        </View>
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

function Reticle() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <AppIcon name="scan" size={28} color="rgba(245,245,245,0.8)" />
    </View>
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
