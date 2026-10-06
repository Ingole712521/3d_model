import { Text, type TextProps } from 'react-native';

import { type, type TypeVariant } from '@/theme';

type ThemedTextProps = TextProps & {
  variant?: TypeVariant;
};

export function ThemedText({ variant = 'body', style, ...props }: ThemedTextProps) {
  return <Text style={[type[variant], style]} {...props} />;
}
