/** The Frankfurter v2 API provides daily reference rates, not intraday FX ticks. */
export const FX_ENDPOINT = 'https://api.frankfurter.dev/v2/rate/USD/INR';

export interface FxQuote {
  rate: number;
  date: string;
}

export function validUsdInrRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function convertedInr(usd: number | null, rate: number | null): number | null {
  return usd === null || rate === null || !Number.isFinite(usd) || !validUsdInrRate(rate)
    ? null : usd * rate;
}

export function parseFxQuote(data: unknown): FxQuote {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid exchange rate API response.');
  const row = data as Record<string, unknown>;
  if (String(row.base).toUpperCase() !== 'USD' || String(row.quote).toUpperCase() !== 'INR') {
    throw new Error('The API did not return a USD to INR quotation.');
  }
  if (!validUsdInrRate(row.rate)) throw new Error('The API returned an invalid USD/INR rate.');
  if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)
      || Number.isNaN(new Date(row.date + 'T00:00:00Z').getTime())
      || new Date(row.date + 'T00:00:00Z').toISOString().slice(0,10) !== row.date) {
    throw new Error('The API returned an invalid quotation date.');
  }
  return {rate: row.rate, date: row.date};
}

export async function getUsdInrRate(signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<FxQuote> {
  const res = await fetcher(FX_ENDPOINT, {signal, headers: {Accept: 'application/json'}, cache: 'no-store'});
  if (!res.ok) throw new Error(`Frankfurter API request failed (HTTP ${res.status}).`);
  return parseFxQuote(await res.json());
}
