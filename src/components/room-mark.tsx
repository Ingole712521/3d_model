import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, radius } from '@/theme';

export function RoomMark({ seed, size = 72 }: { seed: string; size?: number }) {
  const variant = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  const tableX = variant === 1 ? 18 : 28;
  const windowY = variant === 2 ? 18 : 26;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceSecondary,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={size * 0.72} height={size * 0.72} viewBox="0 0 64 64">
        <Rect x={6} y={8} width={52} height={48} rx={2} stroke={colors.textPrimary} strokeWidth={1.4} fill="none" />
        <Rect
          x={tableX}
          y={28}
          width={18}
          height={12}
          stroke={colors.accent}
          strokeWidth={1.2}
          fill="none"
        />
        <Path d={`M50  ${windowY} v12`} stroke={colors.textSecondary} strokeWidth={2} />
        <Path d="M6 48 h10" stroke={colors.background} strokeWidth={3} />
      </Svg>
    </View>
  );
}
