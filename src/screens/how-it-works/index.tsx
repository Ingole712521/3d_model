import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/theme';

const STEPS = [
  {
    title: 'Capture',
    body: 'Walk the room and take overlapping photos. They upload when you create the model.',
  },
  {
    title: 'Reconstruct',
    body: 'The backend runs COLMAP on those photos, then Open3D builds a mesh and exports a GLB.',
  },
  {
    title: 'Explore',
    body: 'The viewer loads that GLB. Rotate, pinch, and pan the reconstructed room.',
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
