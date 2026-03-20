import type { AssetDef } from '../types';

export const STOCK_ASSETS: AssetDef[] = [
  { id: 'smi', name: 'SMI', ticker: 'SMI', category: 'stocks', basePrice: 11200, volatilityMultiplier: 1.0 },
  { id: 'eurostoxx', name: 'Euro Stoxx 50', ticker: 'SX5E', category: 'stocks', basePrice: 4350, volatilityMultiplier: 1.1 },
  { id: 'dow', name: 'Dow Jones', ticker: 'DJI', category: 'stocks', basePrice: 35400, volatilityMultiplier: 0.9 },
  { id: 'nestle', name: 'Nestlé', ticker: 'NESN', category: 'stocks', basePrice: 108, volatilityMultiplier: 0.7 },
  { id: 'nvidia', name: 'NVIDIA', ticker: 'NVDA', category: 'stocks', basePrice: 480, volatilityMultiplier: 1.8 },
  { id: 'ubs', name: 'UBS', ticker: 'UBSG', category: 'stocks', basePrice: 25, volatilityMultiplier: 1.2 },
];

export const FX_ASSETS: AssetDef[] = [
  { id: 'usdchf', name: 'USD/CHF', ticker: 'USD/CHF', category: 'fx', basePrice: 0.8850, volatilityMultiplier: 1.0 },
  { id: 'eurchf', name: 'EUR/CHF', ticker: 'EUR/CHF', category: 'fx', basePrice: 0.9650, volatilityMultiplier: 0.9 },
  { id: 'gbpchf', name: 'GBP/CHF', ticker: 'GBP/CHF', category: 'fx', basePrice: 1.1200, volatilityMultiplier: 1.1 },
  { id: 'jpychf', name: 'JPY/CHF', ticker: 'JPY/CHF', category: 'fx', basePrice: 0.0062, volatilityMultiplier: 1.2 },
];

export const CRYPTO_ASSETS: AssetDef[] = [
  { id: 'btc', name: 'Bitcoin', ticker: 'BTC', category: 'crypto', basePrice: 42000, volatilityMultiplier: 1.0 },
  { id: 'eth', name: 'Ethereum', ticker: 'ETH', category: 'crypto', basePrice: 2200, volatilityMultiplier: 1.2 },
  { id: 'sol', name: 'Solana', ticker: 'SOL', category: 'crypto', basePrice: 95, volatilityMultiplier: 1.5 },
  { id: 'mooninu', name: 'MOON INU', ticker: 'MOON', category: 'crypto', basePrice: 0.00042, volatilityMultiplier: 3.0 },
];

export const ALL_ASSETS: AssetDef[] = [...STOCK_ASSETS, ...FX_ASSETS, ...CRYPTO_ASSETS];

export function getAssetsByCategory(category: string): AssetDef[] {
  return ALL_ASSETS.filter((a) => a.category === category);
}

export function getAssetById(id: string): AssetDef | undefined {
  return ALL_ASSETS.find((a) => a.id === id);
}
