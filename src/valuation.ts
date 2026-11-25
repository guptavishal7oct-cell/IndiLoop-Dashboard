import { MATERIALS, type Composition, type ImportedMarket, type MetalId } from './domain';

export interface MetalValuationRow {
  id: MetalId; name: string; symbol: string;
  percent: number; massKg: number; eligible: boolean; eligibilityReason: string;
  smmPrice: number | null; lmePrice: number | null;
  smmValue: number | null; lmeValue: number | null;
  smmBenchmark: string | null; lmeBenchmark: string | null;
  smmBasis: string | null; lmeBasis: string | null;
}
export interface ValuationSide {
  totalUsd: number | null; perKgUsd: number | null; perTonneUsd: number | null;
  missing: MetalId[]; included: MetalId[]; pricedCompositionPercent: number;
  hasInput: boolean; subtotalUsd: number; eligibleCount: number;
}
export function calculateComparison(args: {
  tonnes: number | string; payablePercent: number | string; composition: Composition;
  smm: ImportedMarket | null; lme: ImportedMarket | null;
}) {
  const tonnes = Number(args.tonnes), payable = Number(args.payablePercent);
  const components = MATERIALS.map(m => Number(args.composition[m.id]));
  const totalPercent = components.reduce((a,b) => a + b, 0);
  const valid = args.tonnes !== '' && Number.isFinite(tonnes) && tonnes > 0
    && args.payablePercent !== '' && Number.isFinite(payable) && payable >= 0 && payable <= 100
    && components.every(n => Number.isFinite(n) && n >= 0 && n <= 100)
    && totalPercent > 0 && totalPercent <= 100.0000001;
  const totalKg = valid ? tonnes * 1000 : 0;
  const pctPayable = payable / 100;
  const rows: MetalValuationRow[] = MATERIALS.map(m => {
    const percent = Number(args.composition[m.id]);
    const allowed = ['nickel','cobalt','manganese','lithium'].includes(m.id);
    const eligible = allowed && percent >= 5;
    const eligibilityReason = !allowed ? 'Not payable' : eligible ? 'Eligible (≥5%)' : 'Below 5% — excluded';
    const massKg = valid ? totalKg * percent / 100 : 0;
    const sq = args.smm?.prices[m.id], lq = args.lme?.prices[m.id];
    return {
      ...m, percent, massKg, eligible, eligibilityReason,
      smmPrice: sq?.priceUsdPerTonne ?? null,
      lmePrice: lq?.priceUsdPerTonne ?? null,
      smmValue: valid && !eligible ? 0 : valid && sq ? (massKg * sq.factor * sq.priceUsdPerTonne / 1000) * pctPayable : null,
      lmeValue: valid && !eligible ? 0 : valid && lq ? (massKg * lq.factor * lq.priceUsdPerTonne / 1000) * pctPayable : null,
      smmBenchmark: sq?.benchmark ?? null, lmeBenchmark: lq?.benchmark ?? null,
      smmBasis: sq?.factorDescription ?? null, lmeBasis: lq?.factorDescription ?? null,
    };
  });
  function side(market: 'smm'|'lme'): ValuationSide {
    const hasInput = args[market] !== null;
    const missing = rows.filter(r => r.eligible && (market === 'smm' ? r.smmPrice : r.lmePrice) === null).map(r => r.id);
    // Ignore unquoted metal rows when summing, without pretending that a missing quote is $0.
    const included = rows.filter(r => r.eligible &&
      (market === 'smm' ? r.smmValue : r.lmeValue) !== null).map(r => r.id);
    const subtotalUsd = rows.reduce((sum, row) => sum + ((market === 'smm' ? row.smmValue : row.lmeValue) ?? 0), 0);
    const pricedCompositionPercent = rows.reduce((sum, row) =>
      sum + (included.includes(row.id) ? row.percent : 0), 0);
    // Show a partial total when at least one active metal has a price. If none do,
    // keep the valuation unavailable rather than displaying a misleading $0.
    const eligibleCount = rows.filter(r => r.eligible).length;
    const canValue = valid && hasInput && (included.length > 0 || eligibleCount === 0);
    return { totalUsd: canValue ? subtotalUsd : null,
      perKgUsd: canValue ? subtotalUsd / totalKg : null,
      perTonneUsd: canValue ? subtotalUsd / tonnes : null,
      missing, included, pricedCompositionPercent, hasInput, subtotalUsd, eligibleCount };
  }
  return { valid, totalPercent, totalKg, rows, smm: side('smm'), lme: side('lme') };
}
