export const COLORS = {
  background: '#F5F0EB',
  text: '#1A1A1A',
  textMuted: '#6B6B6B',
  accent: '#4A7C59',
  surface: '#FFFFFF',
  border: '#E0D8CF',
} as const;

export const TYPOGRAPHY = {
  body: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400' as const,
  },
  bodyLarge: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;
