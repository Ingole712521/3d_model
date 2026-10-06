import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { colors, radius } from '@/theme';
import { type ScanPhoto } from '@/types/scan';

type PhotoThumbnailProps = {
  photo: ScanPhoto;
  size: number;
  onPress?: () => void;
  onDelete?: () => void;
};

function PhotoThumbnailComponent({ photo, size, onPress, onDelete }: PhotoThumbnailProps) {
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Preview photo"
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: colors.surfaceSecondary,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Image
        source={{ uri: photo.uri }}
        recyclingKey={photo.id}
        contentFit="cover"
        style={{ width: size, height: size }}
        transition={120}
      />
      {onDelete ? (
        <View style={{ position: 'absolute', top: 2, right: 2 }}>
          <IconButton
            icon="close"
            label="Delete photo"
            color={colors.textPrimary}
            size={14}
            background={colors.overlay}
            onPress={onDelete}
            style={{ width: 28, height: 28 }}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

export const PhotoThumbnail = memo(PhotoThumbnailComponent);
