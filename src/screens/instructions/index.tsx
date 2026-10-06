import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { AppButton } from '@/components/app-button';
import { AppIcon, type IconName } from '@/components/app-icon';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useScanStore } from '@/store/scan-store';
import { colors, radius, spacing } from '@/theme';

const STEPS: { title: string; body: string; icon: IconName }[] = [
  { title: 'Good lighting', body: 'Make sure the room is evenly lit.', icon: 'sun' },
  { title: 'Move slowly', body: 'Keep the camera steady while moving around the room.', icon: 'walk' },
  { title: 'Overlap frames', body: 'Keep 40–80% visual overlap between photos.', icon: 'overlap' },
  { title: 'Capture everything', body: 'Scan walls, furniture, floor and important details.', icon: 'scan' },
];

export function InstructionsScreen() {
  const insets = useSafeAreaInsets();
  const startScan = useScanStore((state) => state.startScan);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const onStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await startScan();
      router.push('/camera');
    } catch (error) {
      setError(error instanceof Error && error.message ? error.message : "We couldn't start this scan. Try again.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="" onBack={() => router.back()} />
      <Screen
        scroll
        footer={
          <View style={{ gap: spacing.xs }}>
            {error ? (
              <ThemedText variant="subhead" selectable style={{ color: colors.danger, textAlign: 'center' }}>
                {error}
              </ThemedText>
            ) : null}
            <AppButton title="Start Scanning" onPress={() => void onStart()} loading={starting} />
            <AppButton title="How scanning works" variant="ghost" onPress={() => router.push('/how-it-works')} />
          </View>
        }>
        <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
          <ThemedText variant="largeTitle" accessibilityRole="header">
            Scan your room
          </ThemedText>
          <ThemedText variant="subhead">
            Capture overlapping photos around the space for a better 3D reconstruction.
          </ThemedText>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            overflow: 'hidden',
          }}>
          {STEPS.map((step, index) => (
            <View
              key={step.title}
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                padding: spacing.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
              <AppIcon name={step.icon} color={colors.accent} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <ThemedText variant="headline">{step.title}</ThemedText>
                <ThemedText variant="subhead">{step.body}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={{ alignItems: 'center', gap: spacing.sm, paddingBottom: insets.bottom }}>
          <Svg width={88} height={88} viewBox="0 0 88 88" accessibilityLabel="Scanning progress illustration">
            <Circle cx={44} cy={44} r={30} stroke={colors.border} strokeWidth={1.5} fill="none" />
            <Circle cx={44} cy={14} r={3} fill={colors.accent} />
            <Circle cx={70} cy={44} r={3} fill={colors.textSecondary} />
            <Circle cx={44} cy={74} r={3} fill={colors.textSecondary} />
            <Circle cx={18} cy={44} r={3} fill={colors.textSecondary} />
            <Circle cx={44} cy={44} r={6} stroke={colors.textPrimary} strokeWidth={1.2} fill="none" />
          </Svg>
          <ThemedText variant="caption">Move around the room in a steady loop.</ThemedText>
        </View>
      </Screen>
    </View>
  );
}
