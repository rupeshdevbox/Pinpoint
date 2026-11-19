import type { ChromeTabGroupColor } from '../types';

export interface TabGroupColorPalette {
  dot: string;
  darkText: string;
  darkBg: string;
  darkBorder: string;
  lightText: string;
  lightBg: string;
  lightBorder: string;
  label: string;
}

export const TAB_GROUP_PALETTE: Record<ChromeTabGroupColor, TabGroupColorPalette> = {
  grey: {
    dot: '#9aa0a6',
    darkText: '#d1d5db',
    darkBg: 'rgba(154, 160, 166, 0.16)',
    darkBorder: 'rgba(154, 160, 166, 0.34)',
    lightText: '#374151',
    lightBg: 'rgba(107, 114, 128, 0.13)',
    lightBorder: 'rgba(107, 114, 128, 0.3)',
    label: 'Grey',
  },
  blue: {
    dot: '#60a5fa',
    darkText: '#93c5fd',
    darkBg: 'rgba(59, 130, 246, 0.17)',
    darkBorder: 'rgba(96, 165, 250, 0.36)',
    lightText: '#1d4ed8',
    lightBg: 'rgba(59, 130, 246, 0.12)',
    lightBorder: 'rgba(37, 99, 235, 0.28)',
    label: 'Blue',
  },
  red: {
    dot: '#f87171',
    darkText: '#fca5a5',
    darkBg: 'rgba(239, 68, 68, 0.17)',
    darkBorder: 'rgba(248, 113, 113, 0.36)',
    lightText: '#b91c1c',
    lightBg: 'rgba(239, 68, 68, 0.12)',
    lightBorder: 'rgba(220, 38, 38, 0.28)',
    label: 'Red',
  },
  yellow: {
    dot: '#fbbf24',
    darkText: '#fde68a',
    darkBg: 'rgba(245, 158, 11, 0.17)',
    darkBorder: 'rgba(251, 191, 36, 0.36)',
    lightText: '#92400e',
    lightBg: 'rgba(245, 158, 11, 0.15)',
    lightBorder: 'rgba(217, 119, 6, 0.32)',
    label: 'Yellow',
  },
  green: {
    dot: '#34d399',
    darkText: '#86efac',
    darkBg: 'rgba(16, 185, 129, 0.17)',
    darkBorder: 'rgba(52, 211, 153, 0.36)',
    lightText: '#047857',
    lightBg: 'rgba(16, 185, 129, 0.12)',
    lightBorder: 'rgba(5, 150, 105, 0.28)',
    label: 'Green',
  },
  pink: {
    dot: '#f472b6',
    darkText: '#f9a8d4',
    darkBg: 'rgba(236, 72, 153, 0.17)',
    darkBorder: 'rgba(244, 114, 182, 0.36)',
    lightText: '#be185d',
    lightBg: 'rgba(236, 72, 153, 0.12)',
    lightBorder: 'rgba(219, 39, 119, 0.28)',
    label: 'Pink',
  },
  purple: {
    dot: '#c084fc',
    darkText: '#d8b4fe',
    darkBg: 'rgba(168, 85, 247, 0.18)',
    darkBorder: 'rgba(192, 132, 252, 0.38)',
    lightText: '#6d28d9',
    lightBg: 'rgba(147, 51, 234, 0.12)',
    lightBorder: 'rgba(124, 58, 237, 0.28)',
    label: 'Purple',
  },
  cyan: {
    dot: '#22d3ee',
    darkText: '#67e8f9',
    darkBg: 'rgba(6, 182, 212, 0.17)',
    darkBorder: 'rgba(34, 211, 238, 0.36)',
    lightText: '#0e7490',
    lightBg: 'rgba(6, 182, 212, 0.12)',
    lightBorder: 'rgba(8, 145, 178, 0.28)',
    label: 'Cyan',
  },
  orange: {
    dot: '#fb923c',
    darkText: '#fdba74',
    darkBg: 'rgba(249, 115, 22, 0.17)',
    darkBorder: 'rgba(251, 146, 60, 0.36)',
    lightText: '#c2410c',
    lightBg: 'rgba(249, 115, 22, 0.12)',
    lightBorder: 'rgba(234, 88, 12, 0.28)',
    label: 'Orange',
  },
};

export function getTabGroupBadgeStyle(
  color: ChromeTabGroupColor,
  resolvedTheme: 'dark' | 'light'
): { color: string; backgroundColor: string; borderColor: string; dotColor: string } {
  const palette = TAB_GROUP_PALETTE[color] ?? TAB_GROUP_PALETTE.grey;
  if (resolvedTheme === 'light') {
    return {
      color: palette.lightText,
      backgroundColor: palette.lightBg,
      borderColor: palette.lightBorder,
      dotColor: palette.dot,
    };
  }
  return {
    color: palette.darkText,
    backgroundColor: palette.darkBg,
    borderColor: palette.darkBorder,
    dotColor: palette.dot,
  };
}
