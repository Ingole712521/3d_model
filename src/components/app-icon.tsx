import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { colors } from '@/theme';

type IconName =
  | 'back'
  | 'camera'
  | 'photos'
  | 'flash'
  | 'flashOff'
  | 'check'
  | 'more'
  | 'refresh'
  | 'cube'
  | 'plan'
  | 'close'
  | 'sun'
  | 'walk'
  | 'overlap'
  | 'scan'
  | 'trash'
  | 'add'
  | 'history'
  | 'info';

const symbols = {
  back: { ios: 'chevron.left', android: 'arrow_back' },
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  photos: { ios: 'photo', android: 'photo_library' },
  flash: { ios: 'bolt.fill', android: 'flash_on' },
  flashOff: { ios: 'bolt.slash.fill', android: 'flash_off' },
  check: { ios: 'checkmark', android: 'check' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh' },
  cube: { ios: 'cube.fill', android: 'view_in_ar' },
  plan: { ios: 'map', android: 'map' },
  close: { ios: 'xmark', android: 'close' },
  sun: { ios: 'sun.max', android: 'wb_sunny' },
  walk: { ios: 'figure.walk', android: 'directions_walk' },
  overlap: { ios: 'square.on.square', android: 'layers' },
  scan: { ios: 'viewfinder', android: 'center_focus_strong' },
  trash: { ios: 'trash', android: 'delete' },
  add: { ios: 'plus', android: 'add' },
  history: { ios: 'clock', android: 'history' },
  info: { ios: 'info.circle', android: 'info' },
} as const satisfies Record<IconName, { ios: string; android: string }>;

export function AppIcon({
  name,
  size = 22,
  color = colors.textPrimary,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const symbol = symbols[name];

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SymbolView
        name={{ ios: symbol.ios, android: symbol.android, web: symbol.android }}
        tintColor={color}
        size={size}
        weight="medium"
        resizeMode="scaleAspectFit"
        style={{ width: size, height: size }}
      />
    </View>
  );
}

export type { IconName };
