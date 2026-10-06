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
import { MAX_PHOTOS, captureGuidance, captureTarget } from '@/constants/scan';
import { useCurrentScan, useScanStore } from '@/store/scan-store';
import { colors, radius, spacing } from '@/theme';
import { type ScanPhoto } from '@/types/scan';
import { createId } from '@/utils/id';
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
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.get() }));

  const count = scan?.photos.length ?? 0;
  const target = captureTarget(count);
  const guidance = captureGuidance(count);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const finish = () => {
    if (!scan || count === 0) return;
    markReviewing();
    router.navigate('/review');
  };

  const rememberPhoto = async (uri: string, width: number, height: number) => {
    if (!scan) return false;
    const id = createId('photo');
    const storedUri = await persistPhoto(uri, scan.id, id);
    const photo: ScanPhoto = {
      id,
      uri: storedUri,
      width,
      height,
      filename: `${id}.jpg`,
      createdAt: new Date().toISOString(),
    };
    return addPhoto(photo);
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !ready || takingRef.current || count >= MAX_PHOTOS) return;
    takingRef.current = true;
    setCaptureError(null);
    flashOpacity.set(withSequence(withTiming(0.85, { duration: 40 }), withTiming(0, { duration: 220, easing: EASE_OUT })));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!picture?.uri) throw new Error('empty');
      const saved = await rememberPhoto(picture.uri, picture.width, picture.height);
      if (!saved) setCaptureError('This scan already has the maximum of 30 photos.');
    } catch {
      setCaptureError('Unable to capture this photo. Try again.');
    } finally {
      takingRef.current = false;
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
      for (const asset of result.assets) {
        const saved = await rememberPhoto(asset.uri, asset.width, asset.height);
        if (!saved) break;
      }
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
        <ThemedText variant="subhead" accessibilityLiveRegion="polite" style={{ textAlign: 'center', paddingHorizontal: spacing.lg }}>
          {guidance}
        </ThemedText>
        {captureError ? (
          <ThemedText variant="caption" selectable style={{ color: colors.danger, textAlign: 'center', paddingHorizontal: spacing.lg }}>
            {captureError}
          </ThemedText>
        ) : null}
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
            disabled={!ready || count >= MAX_PHOTOS}
            onPress={() => void takePhoto()}
            style={({ pressed }) => ({
              width: 76,
              height: 76,
              borderRadius: radius.full,
              borderWidth: 3,
              borderColor: colors.shutter,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !ready || count >= MAX_PHOTOS ? 0.4 : 1,
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
            {count >= MAX_PHOTOS ? 'Maximum of 30 photos' : '6 photos minimum · 12 to 20 recommended'}
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
