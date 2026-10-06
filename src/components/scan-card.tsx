import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { RoomMark } from '@/components/room-mark';
import { ThemedText } from '@/components/themed-text';
import { colors, radius, spacing } from '@/theme';
import { type Scan } from '@/types/scan';
import { formatScanDate, photoCountLabel, statusLabel } from '@/utils/format';

function statusColor(status: Scan['status']): string {
  if (status === 'failed') return colors.danger;
  if (status === 'processing') return colors.accent;
  return colors.textSecondary;
}

export function ScanCard({ scan, onPress }: { scan: Scan; onPress: () => void }) {
  const date = formatScanDate(scan.createdAt);
  const count = photoCountLabel(scan);
  const status = statusLabel(scan.status);
  const thumb = scan.thumbnailUrl ?? scan.photos[0]?.uri;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${scan.name}, ${count}, ${status}, ${date}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.sm,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
      })}>
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          recyclingKey={scan.id}
          contentFit="cover"
          style={{ width: 72, height: 72, borderRadius: radius.md }}
        />
      ) : (
        <RoomMark seed={scan.id} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline" numberOfLines={1} selectable>
          {scan.name}
        </ThemedText>
        <ThemedText variant="subhead">
          {count}
          {'  ·  '}
          <ThemedText variant="subhead" style={{ color: statusColor(scan.status) }}>
            {status}
          </ThemedText>
        </ThemedText>
      </View>
      <ThemedText variant="caption">{date}</ThemedText>
    </Pressable>
  );
}

export function ScanCardSkeleton() {
  return (
    <View style={{ gap: spacing.sm }}>
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          style={{
            height: 88,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
          }}
        />
      ))}
    </View>
  );
}
