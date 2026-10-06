import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/theme';

export function FloorPlan({ roomName }: { roomName: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
      <View style={{ gap: spacing.sm, maxWidth: 320 }}>
        <ThemedText variant="headline" style={{ textAlign: 'center' }}>
          {roomName}
        </ThemedText>
        <ThemedText variant="subhead" style={{ textAlign: 'center' }}>
          A measured floor plan is not exported with the mesh. Use the 3D view to inspect the reconstructed room.
        </ThemedText>
      </View>
    </View>
  );
}
