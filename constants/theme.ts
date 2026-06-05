// Finexa Orderbooker - Design Tokens
export const Colors = {
  // Base surfaces
  bg: '#070d1a',
  surface: '#0f1929',
  surfaceElevated: '#162035',
  surfaceBorder: '#1e2d47',
  cardBg: '#111827',

  // Brand
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#1d4ed8',
  primaryMuted: 'rgba(59,130,246,0.15)',

  // Accent
  accent: '#22c55e',
  accentMuted: 'rgba(34,197,94,0.15)',

  // Semantic
  success: '#22c55e',
  successMuted: 'rgba(34,197,94,0.12)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245,158,11,0.12)',
  danger: '#ef4444',
  dangerMuted: 'rgba(239,68,68,0.12)',
  purple: '#a855f7',
  purpleMuted: 'rgba(168,85,247,0.12)',
  indigo: '#6366f1',
  indigoMuted: 'rgba(99,102,241,0.15)',
  gold: '#f59e0b',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  textDisabled: '#334155',
  textInverse: '#0f172a',

  // Borders
  border: '#1e2d47',
  borderLight: '#243451',

  // Overlay
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};
