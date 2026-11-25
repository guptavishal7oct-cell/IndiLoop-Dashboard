import type { ImportedMarket } from './domain';
export const SEPARATE_IDS = ['copper', 'aluminium', 'steel'] as const;
export type SeparateId = typeof SEPARATE_IDS[number];
export function autoMaterialPrice(id: SeparateId, market: ImportedMarket | null, rate: number | null): number | null {
  const quote = market?.prices[id];
  return quote && rate !== null && Number.isFinite(rate) && rate > 0 ? quote.priceUsdPerTonne * rate / 1000 : null;
}
export function materialValue(weight: string, purity: string, price: string, payable: string): number | null {
  const fields = [weight,purity,price,payable];
  if (fields.some(v => v.trim() === '' || !Number.isFinite(Number(v)) || Number(v) < 0)) return null;
  const [w,p,r,b] = fields.map(Number);
  if (p > 100 || b > 100) return null;
  const value = w * (p/100) * r * (b/100);
  return Number.isFinite(value) ? value : null;
}
