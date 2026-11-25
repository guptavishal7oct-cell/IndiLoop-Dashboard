export const METAL_IDS = ['lithium', 'nickel', 'cobalt', 'manganese', 'copper', 'aluminium'] as const;
export type MetalId = (typeof METAL_IDS)[number];
export type Market = 'smm' | 'lme';
export type Composition = Record<MetalId, number | string>;
export interface MetalDef { id: MetalId; name: string; symbol: string; }
export const MATERIALS: MetalDef[] = [
  { id: 'lithium', name: 'Lithium', symbol: 'Li' },
  { id: 'nickel', name: 'Nickel', symbol: 'Ni' },
  { id: 'cobalt', name: 'Cobalt', symbol: 'Co' },
  { id: 'manganese', name: 'Manganese', symbol: 'Mn' },
  { id: 'copper', name: 'Copper', symbol: 'Cu' },
  { id: 'aluminium', name: 'Aluminium', symbol: 'Al' },
];
export const EMPTY_COMPOSITION: Composition = { lithium: 0, nickel: 0, cobalt: 0, manganese: 0, copper: 0, aluminium: 0 };
// Completely fictional sample assay for UI testing. Never use as an actual battery assay.
export const SAMPLE_COMPOSITION: Composition = { lithium: 3, nickel: 20, cobalt: 9, manganese: 0, copper: 1, aluminium: 1 };
export type PriceType = 'fastmarkets' | '3_month_closing' | 'current';
export interface Quote {
  priceType?: PriceType | null;
  priceUsdPerTonne: number;
  benchmark: string;
  date: string;
  factor: number; // elemental metal kg -> quoted benchmark kg
  factorDescription: string;
  sourceUrl?: string;
}
export interface ImportedMarket {
  market: Market;
  label: string;
  date: string;
  prices: Partial<Record<MetalId, Quote>>;
  warnings: string[];
  isExample: boolean;
}
