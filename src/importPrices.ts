import { METAL_IDS, type ImportedMarket, type Market, type MetalId, type Quote } from './domain';

// Molecular masses in g/mol, for transparent theoretical elemental-lithium conversion.
export const LI_TO_CARBONATE = 73.89 / (2 * 6.94);
export const LI_TO_HYDROXIDE_MONOHYDRATE = 41.96 / 6.94;
export const LI_TO_HYDROXIDE_ANHYDROUS = 23.95 / 6.94;
const MARKET_LABEL: Record<Market, string> = {
  smm: 'Shanghai Metals Market (SMM)',
  lme: 'London Metal Exchange (LME)',
};
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const validIsoDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const dt = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === v;
};
export function ageInDays(date: string, today = new Date()): number {
  const start = new Date(`${date}T00:00:00Z`).getTime();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((end - start) / 86400000);
}
const normalizeMetal = (value: string): MetalId | null => {
  const clean = value.toLowerCase().replace(/[_-]/g,' ').trim();
  const aliases: Record<string, MetalId> = {
    li: 'lithium', lithium: 'lithium', 'lithium carbonate':'lithium', 'lithium hydroxide':'lithium',
    ni: 'nickel', nickel:'nickel', co:'cobalt', cobalt:'cobalt',
    mn:'manganese', manganese:'manganese', cu:'copper', copper:'copper',
    al:'aluminium', aluminum:'aluminium', aluminium:'aluminium',
  };
  return aliases[clean] || null;
};
function benchmarkFactor(metal: MetalId, benchmark: string): { factor: number; description: string } {
  const b = benchmark.toLowerCase();
  if (metal === 'lithium') {
    if (/carbonate|li₂co₃|li2co3/.test(b)) return { factor: LI_TO_CARBONATE, description: 'Li₂CO₃ equivalent' };
    if (/monohydrate|lioh[·.\s]?h2o|lioh[·.\s]?h₂o/.test(b)) return { factor: LI_TO_HYDROXIDE_MONOHYDRATE, description: 'LiOH·H₂O equivalent' };
    if (/anhydrous/.test(b) && /hydroxide/.test(b)) return { factor: LI_TO_HYDROXIDE_ANHYDROUS, description: 'Anhydrous LiOH equivalent' };
    if (/lithium metal|pure lithium|elemental lithium/.test(b)) return { factor: 1, description: 'Elemental Li' };
    throw new Error(`Unclear lithium benchmark: "${benchmark}". Specify lithium carbonate, lithium hydroxide monohydrate, anhydrous lithium hydroxide, or lithium metal.`);
  }
  const matchers: Record<Exclude<MetalId, 'lithium'>, RegExp> = {
    nickel: /nickel/i, cobalt: /cobalt/i, manganese: /manganese/i,
    copper: /copper/i, aluminium: /alumin(?:ium|um)/i,
  };
  if (!matchers[metal].test(benchmark)) throw new Error(`The ${metal} benchmark "${benchmark}" does not identify ${metal}.`);
  if (/sulphate|sulfate|oxide|hydroxide|carbonate|chloride|ore|scrap|black mass|battery grade sulphate|battery grade sulfate|alumina/i.test(benchmark)) {
    throw new Error(`Unsupported ${metal} benchmark "${benchmark}". The calculator requires a metal benchmark, not a metal salt, oxide, ore or scrap price.`);
  }
  if (metal === 'manganese' && !/metal|electrolytic|99\.?\d*%/i.test(benchmark)) {
    throw new Error('Manganese requires an explicit metal/electrolytic manganese benchmark, not just "manganese".');
  }
  return { factor: 1, description: 'Elemental metal basis' };
}
function readRows(root: Record<string,unknown>): Record<string,unknown>[] {
  const input = root.prices;
  if (Array.isArray(input)) {
    if (!input.every(isObject)) throw new Error('Each prices[] entry must be a JSON object.');
    return input;
  }
  if (isObject(input)) return Object.entries(input).map(([metal, price]) =>
    isObject(price) ? { metal, ...price } : { metal, price }
  );
  throw new Error('Expected a "prices" array (or an object keyed by metal).');
}
export function parseMarketJSON(raw: string, market: Market, today = new Date(), isExample = false): ImportedMarket {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('Invalid JSON. Check commas, quotation marks and brackets.'); }
  if (!isObject(parsed)) throw new Error('JSON must contain one top-level object.');
  if (String(parsed.currency ?? '').toUpperCase() !== 'USD') throw new Error('currency must be "USD". Currency conversions are not performed.');
  const unit = String(parsed.unit ?? '').toLowerCase().trim();
  if (!['metric_tonne', 'usd/tonne', 'usd/metric_tonne', 'usd/t', 'tonne', 'metric tonne'].includes(unit)) {
    throw new Error('unit must be "metric_tonne" (USD per 1,000 kg). No conversion from USD/kg or other units is performed.');
  }
  if (!validIsoDate(parsed.price_date)) throw new Error('price_date must be a real date in YYYY-MM-DD format.');
  const date = parsed.price_date;
  if (ageInDays(date, today) < 0) throw new Error('price_date cannot be in the future.');
  const rows = readRows(parsed);
  if (!rows.length) throw new Error('The prices array is empty.');
  const prices: ImportedMarket['prices'] = {};
  const warnings: string[] = [];
  const seen = new Set<MetalId>();
  for (const row of rows) {
    const rawMetal = row.metal ?? row.name;
    if (typeof rawMetal !== 'string') throw new Error('Each price row needs a metal name.');
    const metal = normalizeMetal(rawMetal);
    if (!metal) { warnings.push(`Unrecognized metal "${rawMetal}" ignored.`); continue; }
    if (seen.has(metal)) throw new Error(`Duplicate quote for ${metal}. Supply only one benchmark per metal.`);
    seen.add(metal);
    const price = row.price ?? row.price_usd_per_tonne ?? null;
    if (price === null) { warnings.push(`No quote supplied for ${metal}.`); continue; }
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new Error(`${metal}: price must be a positive numeric USD-per-tonne value, or null if unavailable.`);
    }
    const benchmark = row.benchmark;
    if (typeof benchmark !== 'string' || !benchmark.trim()) throw new Error(`${metal}: add a specific "benchmark" label.`);
    const { factor, description } = benchmarkFactor(metal, benchmark);
    const quoteDate = row.date ?? row.as_of ?? date;
    if (!validIsoDate(quoteDate) || ageInDays(quoteDate, today) < 0) throw new Error(`${metal}: invalid quotation date; use YYYY-MM-DD on or before today.`);
    if (row.source_url !== undefined && row.source_url !== null && typeof row.source_url !== 'string') throw new Error(`${metal}: source_url must be a string URL.`);
    const sourceUrl = typeof row.source_url === 'string' && /^https?:\/\//i.test(row.source_url) ? row.source_url : undefined;
    const quote: Quote = { priceUsdPerTonne: price, benchmark: benchmark.trim(), date: quoteDate, factor, factorDescription: description, sourceUrl };
    prices[metal] = quote;
    const age = ageInDays(quoteDate, today);
    if (age > 7) warnings.push(`${metal} quote (${quoteDate}) is ${age} days old.`);
  }
  if (!METAL_IDS.some(m => prices[m])) {
    // Allow a correctly structured JSON with known metals but no prices yet.
    // It should render unavailable values, not prevent the other market from loading.
    if (!seen.size) throw new Error('No supported metal names found. Supply at least one of the six supported metals.');
    warnings.push('No available quotations in this market; totals will remain unavailable.');
  }
  return { market, label: MARKET_LABEL[market], date, prices, warnings, isExample };
}
