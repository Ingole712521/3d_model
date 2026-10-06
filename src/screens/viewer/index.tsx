import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { FloorPlan } from '@/components/floor-plan';
import { IconButton } from '@/components/icon-button';
import { ModelViewer, type ModelControls } from '@/components/model-viewer';
import { ThemedText } from '@/components/themed-text';
import { useScan } from '@/store/scan-store';
import { colors, radius, spacing } from '@/theme';
import { photoCountLabel, routeParam, statusLabel } from '@/utils/format';

type ViewerMode = '3d' | 'plan';

export function ViewerScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = routeParam(params.id);
  const scan = useScan(id);
  const insets = useSafeAreaInsets();
  const controls = useRef<ModelControls>(null);
  const [mode, setMode] = useState<ViewerMode>('3d');

  if (!scan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: insets.top + spacing.xl, gap: spacing.md }}>
        <ThemedText variant="title">Scan unavailable</ThemedText>
        <ThemedText variant="subhead" selectable>
          This scan could not be found.
        </ThemedText>
        <AppButton title="Back to spaces" onPress={() => router.replace('/history')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        {mode === '3d' ? <ModelViewer ref={controls} modelUrl={scan.modelUrl} /> : <FloorPlan roomName={scan.name} />}
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
        <IconButton icon="back" label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} background={colors.overlay} />
        <ThemedText variant="headline" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
          {scan.name}
        </ThemedText>
        <IconButton
          icon="more"
          label="More options"
          background={colors.overlay}
          onPress={() => router.push({ pathname: '/scan-info/[id]', params: { id: scan.id } })}
        />
      </View>

      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: radius.full, padding: 3 }}>
            <ModeButton label="3D" selected={mode === '3d'} onPress={() => setMode('3d')} />
            <ModeButton label="Floor Plan" selected={mode === 'plan'} onPress={() => setMode('plan')} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fit model"
            disabled={mode !== '3d'}
            onPress={() => controls.current?.fit()}
            style={{ opacity: mode === '3d' ? 1 : 0.35, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
            <ThemedText variant="subhead">Fit</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset camera"
            disabled={mode !== '3d'}
            onPress={() => controls.current?.reset()}
            style={{ opacity: mode === '3d' ? 1 : 0.35, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
            <ThemedText variant="subhead">Reset</ThemedText>
          </Pressable>
        </View>
        <View style={{ gap: 2 }}>
          <ThemedText variant="headline" selectable>
            {scan.name}
          </ThemedText>
          <ThemedText variant="subhead">
            {photoCountLabel(scan)} · {statusLabel(scan.status)}
          </ThemedText>
          <ThemedText variant="caption">Reconstructed from the photos in this scan.</ThemedText>
        </View>
      </View>
    </View>
  );
}

function ModeButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 36,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? colors.background : 'transparent',
      }}>
      <ThemedText variant="subhead" style={{ color: selected ? colors.textPrimary : colors.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
