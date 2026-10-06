import { type ReactElement } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';

import { PhotoThumbnail } from '@/components/photo-thumbnail';
import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/theme';
import { type ScanPhoto } from '@/types/scan';

export function PhotoGrid({
  photos,
  onPress,
  onDelete,
  header,
}: {
  photos: ScanPhoto[];
  onPress: (photo: ScanPhoto) => void;
  onDelete: (photo: ScanPhoto) => void;
  header?: ReactElement;
}) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 560);
  const size = (contentWidth - spacing.md * 2 - spacing.sm * 2) / 3;

  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={3}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={{ gap: spacing.sm }}
      ListEmptyComponent={
        <ThemedText variant="subhead">Photos you capture will appear here.</ThemedText>
      }
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingBottom: 140,
        gap: spacing.sm,
        width: '100%',
        maxWidth: 560,
        alignSelf: 'center',
      }}
      renderItem={({ item }) => (
        <PhotoThumbnail
          photo={item}
          size={size}
          onPress={() => onPress(item)}
          onDelete={() => onDelete(item)}
        />
      )}
    />
  );
}
