import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { colors, radius } from '@/theme';

type IconButtonProps = Omit<PressableProps, 'style'> & {
  icon: IconName;
  label: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  background?: string;
};

export function IconButton({
  icon,
  label,
  color = colors.textPrimary,
  size = 22,
  background = 'transparent',
  style,
  ...rest
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
      {...rest}>
      <AppIcon name={icon} size={size} color={color} />
    </Pressable>
  );
}
