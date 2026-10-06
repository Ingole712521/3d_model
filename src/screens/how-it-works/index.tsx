import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

const STEPS = [
  {
    title: 'Record',
    body: 'Walk the room for 60–90 seconds. The video uploads with a live progress bar.',
  },
  {
    title: 'Extract',
    body: 'FFmpeg pulls frames at 3 per second, then blurry and duplicate frames are removed.',
  },
  {
    title: 'Reconstruct',
    body: 'Those frames go through the existing COLMAP reconstruction, mesh, and GLB export. A GPU can run COLMAP and OpenMVS in Docker.',
  },
  {
    title: 'Explore',
    body: 'The viewer loads the finished GLB. Rotate, pinch, and pan the reconstructed room.',
  },
];

export function HowItWorksScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
      <ThemedText variant="title" accessibilityRole="header">
        How scanning works
      </ThemedText>
      {STEPS.map((step) => (
        <View key={step.title} style={{ gap: spacing.xs }}>
          <ThemedText variant="headline">{step.title}</ThemedText>
          <ThemedText variant="subhead">{step.body}</ThemedText>
        </View>
      ))}
      <AppButton title="Close" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}
