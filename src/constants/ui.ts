export const COLORS = {
  deepNavy: '#07090f',
  darkTeal: '#0a1d2e',
  pixelGreen: '#00ff87',
  pixelGreenDim: '#00c96b',
  pixelGold: '#ffd700',
  pixelGoldDim: '#c7a600',
  pixelRed: '#ff2d55',
  pixelRedDim: '#c91f3e',
  pixelBlue: '#00aaff',
  pixelPurple: '#bf5fff',
  offWhite: '#ddeeff',
  mutedGray: '#4a6580',
  mutedGrayLight: '#7090a8',
  amber: '#ffb830',
  skyBlue: '#40d4ff',
  cyan: '#00e5ff',
  black: '#000000',
  white: '#ffffff',
  terminalBg: '#060d14',
  panelBg: '#0c1520',
  panelBgLight: '#111f30',
  panelBorder: '#1a3355',
  panelBorderBright: '#2a4d7a',
} as const;

export const FONTS = {
  heading: "'Press Start 2P', monospace",
  body: "'VT323', monospace",
} as const;

export const PIXEL = {
  cellSize: 4,
  borderWidth: 2,
  shadowOffset: 4,
  spriteLogical: 16,
  spriteScale: 4,
} as const;

export const CANVAS_SIZES = {
  spritePreview: { width: 128, height: 128 },
  room: { width: 480, height: 360 },
  terminal: { width: 480, height: 360 },
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  stocks: '#40d4ff',
  fx: '#ffb830',
  crypto: '#bf5fff',
  bonds: '#66bb6a',
  cash: '#4a6580',
};

export const CATEGORY_ICONS: Record<string, string> = {
  stocks: '📈',
  fx: '💱',
  crypto: '🪙',
};
