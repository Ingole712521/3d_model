import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

const EASE = Easing.bezier(0.77, 0, 0.175, 1);

export function SpatialHero() {
  const reducedMotion = useReducedMotion();
  const travel = useSharedValue(reducedMotion ? 0.45 : 0);

  useEffect(() => {
    if (reducedMotion) {
      travel.set(0.45);
      return;
    }
    travel.set(withRepeat(withTiming(1, { duration: 3200, easing: EASE }), -1, true));
  }, [reducedMotion, travel]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: travel.get() * 128 }],
    opacity: 0.85,
  }));

  return (
    <View
      accessibilityLabel="Abstract room scan"
      style={{ height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={260} height={188} viewBox="0 0 280 200">
        <Path d="M140 168 L232 122 L140 76 L48 122 Z" stroke={colors.border} strokeWidth={1.2} fill={colors.surface} />
        <Path d="M48 122 L140 76 L140 28 L48 74 Z" stroke={colors.textSecondary} strokeWidth={1.3} fill={colors.surfaceSecondary} />
        <Path d="M140 76 L232 122 L232 74 L140 28 Z" stroke={colors.textPrimary} strokeWidth={1.3} fill="#19191B" />
        <Path d="M168 58 L196 72 L196 96 L168 82 Z" stroke={colors.accent} strokeWidth={1.2} fill="none" />
        <Path d="M92 126 L132 106 L132 118 L92 138 Z" stroke={colors.textSecondary} strokeWidth={1.1} fill="none" />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 36,
            width: 196,
            height: 1,
            backgroundColor: colors.accent,
          },
          lineStyle,
        ]}
      />
    </View>
  );
}
