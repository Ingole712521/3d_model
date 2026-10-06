import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { IconButton } from '@/components/icon-button';
import { PhotoGrid } from '@/components/photo-grid';
import { ScanQualityIndicator } from '@/components/scan-quality-indicator';
import { ThemedText } from '@/components/themed-text';
import { useCurrentScan, useScanStore } from '@/store/scan-store';
import { colors, radius, spacing, type as textType } from '@/theme';
import { type ScanPhoto } from '@/types/scan';
import { photoCountLabel } from '@/utils/format';
import { scanQuality } from '@/utils/scan-quality';

export function ReviewScreen() {
  const scan = useCurrentScan();
  const insets = useSafeAreaInsets();
  const renameCurrent = useScanStore((state) => state.renameCurrent);
  const removePhoto = useScanStore((state) => state.removePhoto);
  const submitCurrent = useScanStore((state) => state.submitCurrent);
  const [preview, setPreview] = useState<ScanPhoto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  if (!scan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center', gap: spacing.md }}>
        <ThemedText variant="title">Scan unavailable</ThemedText>
        <ThemedText variant="subhead">This scan is no longer on this device.</ThemedText>
        <AppButton title="Go home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const quality = scanQuality(scan.photos.length);
  const completed = scan.status === 'completed' && !!scan.modelUrl;

  const onCreate = async () => {
    if (completed) {
      router.push({ pathname: '/viewer/[id]', params: { id: scan.id } });
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await submitCurrent();
      router.push({ pathname: '/processing/[id]', params: { id: scan.id } });
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "We couldn't create the 3D model.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const onDelete = (photo: ScanPhoto) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removePhoto(photo.id);
    if (preview?.id === photo.id) setPreview(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PhotoGrid
        photos={scan.photos}
        onPress={setPreview}
        onDelete={onDelete}
        header={
          <View style={{ paddingTop: insets.top + spacing.sm, gap: spacing.lg, paddingBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton icon="back" label="Go back" onPress={() => router.back()} />
              <ThemedText variant="headline" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">
                Review your scan
              </ThemedText>
              <View style={{ width: 44 }} />
            </View>
            <TextInput
              value={scan.name}
              onChangeText={renameCurrent}
              accessibilityLabel="Room name"
              placeholder="Name this room"
              placeholderTextColor={colors.textTertiary}
              style={{
                ...textType.title,
                paddingVertical: spacing.xs,
              }}
            />
            <ThemedText variant="subhead">{photoCountLabel(scan)} captured</ThemedText>
            <ScanQualityIndicator count={scan.photos.length} />
          </View>
        }
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.md,
          gap: spacing.sm,
          backgroundColor: colors.background,
        }}>
        {error ? (
          <ThemedText variant="subhead" selectable style={{ color: colors.danger, textAlign: 'center' }}>
            {error}
          </ThemedText>
        ) : null}
        <AppButton
          title={completed ? 'View 3D model' : 'Create 3D Model'}
          disabled={!completed && !quality.ready}
          loading={submitting}
          onPress={() => void onCreate()}
        />
        <AppButton title="Add photos" variant="ghost" onPress={() => router.navigate('/camera')} />
      </View>
      {preview ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background }}>
          <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
            <IconButton icon="close" label="Close preview" onPress={() => setPreview(null)} />
            <IconButton
              icon="trash"
              label="Delete photo"
              color={colors.danger}
              onPress={() => onDelete(preview)}
            />
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => setPreview(null)} accessibilityLabel="Photo preview">
            <Image source={{ uri: preview.uri }} contentFit="contain" style={{ flex: 1 }} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
