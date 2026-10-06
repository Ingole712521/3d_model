import { type TextStyle } from 'react-native';

import { colors } from '@/theme/colors';

export const type = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.background,
  },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
