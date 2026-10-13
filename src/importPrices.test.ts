import { describe, expect, it } from 'vitest';
import { ageInDays, LI_TO_CARBONATE, LI_TO_HYDROXIDE_MONOHYDRATE, parseMarketJSON } from './importPrices';
const TODAY = new Date('2026-10-13T12:00:00Z');
const wrap = (prices: unknown[]) => JSON.stringify({ source:'Manual', price_date:'2026-10-13', currency:'USD', unit:'metric_tonne', prices });

describe('manual price import', () => {
  it('parses the exact previously offered metal-prices JSON structure', () => {
    const result = parseMarketJSON(wrap([
      {metal:'Lithium',benchmark:'Battery-Grade Lithium Carbonate',price:16000},
      {metal:'Nickel',benchmark:'Shanghai 1# Nickel Cathode',price:18000},
    ]), 'smm', TODAY);
    expect(result.prices.lithium?.factor).toBeCloseTo(LI_TO_CARBONATE);
    expect(result.prices.nickel?.priceUsdPerTonne).toBe(18000);
  });
  it('handles LME lithium hydroxide monohydrate as a different compound', () => {
    const result = parseMarketJSON(wrap([{metal:'Lithium',benchmark:'LME Lithium Hydroxide Monohydrate CIF Fastmarkets',price:14000}]),'lme',TODAY);
    expect(result.prices.lithium?.factor).toBeCloseTo(LI_TO_HYDROXIDE_MONOHYDRATE);
    expect(result.prices.lithium?.factor).toBeGreaterThan(LI_TO_CARBONATE);
  });
  it('allows missing LME manganese via null', () => {
    const result = parseMarketJSON(wrap([{metal:'Nickel',benchmark:'LME Nickel metal',price:18000},{metal:'Manganese',benchmark:'Unavailable LME',price:null}]),'lme',TODAY);
    expect(result.prices.manganese).toBeUndefined();
    expect(result.warnings.some(w=>w.includes('manganese'))).toBe(true);
  });
  it('accepts a known-metal JSON with all null quotations, leaving prices unavailable', () => {
    const result = parseMarketJSON(wrap([
      {metal:'Nickel',benchmark:'LME Nickel metal',price:null},
      {metal:'Manganese',benchmark:'Not an LME contract',price:null}
    ]), 'lme', TODAY);
    expect(Object.keys(result.prices)).toHaveLength(0);
    expect(result.warnings.some(w=>w.includes('No available quotations'))).toBe(true);
  });
  it('rejects ambiguous lithium hydroxide and sulfate metal benchmarks', () => {
    expect(()=>parseMarketJSON(wrap([{metal:'Lithium',benchmark:'Lithium hydroxide',price:1000}]),'lme',TODAY)).toThrow(/Unclear lithium/);
    expect(()=>parseMarketJSON(wrap([{metal:'Nickel',benchmark:'Nickel sulphate',price:1000}]),'lme',TODAY)).toThrow(/Unsupported nickel/);
  });
  it('rejects invalid prices, duplicate metals and wrong currency or units', () => {
    expect(()=>parseMarketJSON(wrap([{metal:'Nickel',benchmark:'Nickel metal',price:-5}]),'smm',TODAY)).toThrow(/positive numeric/);
    expect(()=>parseMarketJSON(wrap([{metal:'Nickel',benchmark:'Nickel metal',price:4},{metal:'Ni',benchmark:'Nickel metal',price:5}]),'smm',TODAY)).toThrow(/Duplicate/);
    expect(()=>parseMarketJSON(JSON.stringify({currency:'CNY',unit:'metric_tonne',price_date:'2026-10-13',prices:[]}), 'smm',TODAY)).toThrow(/USD/);
    expect(()=>parseMarketJSON(JSON.stringify({currency:'USD',unit:'USD\/kg',price_date:'2026-10-13',prices:[]}), 'smm',TODAY)).toThrow(/unit/);
  });
  it('rejects future dates and flags stale quotes', () => {
    expect(()=>parseMarketJSON(JSON.stringify({currency:'USD',unit:'metric_tonne',price_date:'2026-10-14',prices:[{metal:'Nickel',benchmark:'Nickel metal',price:10}]}),'smm',TODAY)).toThrow(/future/);
    const raw = JSON.stringify({currency:'USD',unit:'metric_tonne',price_date:'2026-07-18',prices:[{metal:'Nickel',benchmark:'Nickel metal',price:100}]});
    const result = parseMarketJSON(raw,'smm',TODAY);
    expect(result.warnings.some(s=>s.includes('days old'))).toBe(true);
    expect(ageInDays('2026-07-18',TODAY)).toBe(87);
  });
  it('blocks invalid JSON and unsupported metal-only objects',()=>{
    expect(()=>parseMarketJSON('{not valid}', 'smm',TODAY)).toThrow(/Invalid JSON/);
    expect(()=>parseMarketJSON(wrap([{metal:'Graphite',benchmark:'Graphite',price:100}]),'smm',TODAY)).toThrow(/No supported/);
  });
});
