import {describe, expect, it} from 'vitest';
import {convertedInr, FX_ENDPOINT, getUsdInrRate, parseFxQuote} from './exchangeRate';

describe('Frankfurter USD/INR exchange rate', () => {
  it('parses documented v2 single-pair response', () => {
    expect(parseFxQuote({date:'2026-10-12',base:'USD',quote:'INR',rate:83.65}))
      .toEqual({date:'2026-10-12',rate:83.65});
  });
  it('rejects incorrect pairs and invalid rate and date', () => {
    expect(() => parseFxQuote({date:'2026-10-12',base:'EUR',quote:'INR',rate:83})).toThrow(/USD to INR/);
    expect(() => parseFxQuote({date:'2026-10-12',base:'USD',quote:'INR',rate:0})).toThrow(/invalid/);
    expect(() => parseFxQuote({date:'2026-02-30',base:'USD',quote:'INR',rate:85})).toThrow(/invalid/);
  });
  it('converts each amount only with a valid rate', () => {
    expect(convertedInr(12.5,84)).toBe(1050);
    expect(convertedInr(null,84)).toBeNull();
    expect(convertedInr(12.5,null)).toBeNull();
    expect(convertedInr(12.5,-1)).toBeNull();
  });
  it('fetches the precise endpoint once and handles failures', async () => {
    const mockFetch = (async (url: string) => {
      expect(url).toBe(FX_ENDPOINT);
      return {ok:true,json:async () => ({date:'2026-10-12',base:'USD',quote:'INR',rate:84.125})};
    }) as typeof fetch;
    await expect(getUsdInrRate(undefined,mockFetch)).resolves.toEqual({date:'2026-10-12',rate:84.125});
    const fail = (async () => ({ok:false,status:503})) as unknown as typeof fetch;
    await expect(getUsdInrRate(undefined,fail)).rejects.toThrow(/HTTP 503/);
  });
});
