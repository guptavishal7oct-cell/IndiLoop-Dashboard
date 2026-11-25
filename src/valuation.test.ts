import { describe,expect,it } from 'vitest';
import { EMPTY_COMPOSITION } from './domain';
import { parseMarketJSON } from './importPrices';
import { calculateComparison } from './valuation';
const today = new Date('2026-10-13T12:00:00Z');
const mk = (rows: unknown[]) => JSON.stringify({price_date:'2026-10-13',currency:'USD',unit:'metric_tonne',prices:rows});
const nickel = { metal:'Nickel', benchmark:'Nickel metal', price:20000};
const lithiumCarbonate = {metal:'Lithium', benchmark:'Battery Grade Lithium Carbonate', price:16000};
const lithiumHydroxide = {metal:'Lithium', benchmark:'Lithium Hydroxide Monohydrate', price:15000};
const compare = (smm: ReturnType<typeof parseMarketJSON> | null, lme: ReturnType<typeof parseMarketJSON> | null, composition={...EMPTY_COMPOSITION,nickel:20,lithium:5}) => calculateComparison({tonnes:'2',payablePercent:'80',composition,smm,lme});
describe('two independent black mass valuations',()=>{
  it('computes correct per-source totals, tonne and kg values',()=>{
    const smm = parseMarketJSON(mk([nickel,lithiumCarbonate]),'smm',today);
    const lme = parseMarketJSON(mk([nickel,lithiumHydroxide]),'lme',today);
    const result = compare(smm,lme);
    const expectedSmm = (400*20000/1000 + 100*(73.89/(2*6.94))*16000/1000)*.8;
    const expectedLme = (400*20000/1000 + 100*(41.96/6.94)*15000/1000)*.8;
    expect(result.smm.totalUsd).toBeCloseTo(expectedSmm);
    expect(result.lme.totalUsd).toBeCloseTo(expectedLme);
    expect(result.smm.perKgUsd).toBeCloseTo(expectedSmm/2000);
    expect(result.lme.perTonneUsd).toBeCloseTo(expectedLme/2);
  });
  it('shows a partial subtotal on the affected market and a full total on the other',()=>{
    const smm = parseMarketJSON(mk([nickel,lithiumCarbonate]),'smm',today);
    const lme = parseMarketJSON(mk([nickel]),'lme',today);
    const r = compare(smm,lme);
    expect(r.smm.totalUsd).not.toBeNull();
    expect(r.lme.totalUsd).toBe(6400); // nickel only: 400 kg × $20,000/t × 80%
    expect(r.lme.perKgUsd).toBe(3.2);
    expect(r.lme.perTonneUsd).toBe(3200);
    expect(r.lme.missing).toContain('lithium');
    expect(r.lme.included).toEqual(['nickel']);
    expect(r.lme.pricedCompositionPercent).toBe(20);
    expect(r.smm.missing).toEqual([]);
  });
  it('does not invent zero or a full result when all active metals lack prices',()=>{
    const onlyCopper = parseMarketJSON(mk([{metal:'Copper',benchmark:'Copper metal',price:10000}]),'lme',today);
    const r=compare(null,onlyCopper,{...EMPTY_COMPOSITION,nickel:15,lithium:5});
    expect(r.lme.totalUsd).toBeNull();
    expect(r.lme.perKgUsd).toBeNull();
    expect(r.lme.included).toEqual([]);
    expect(r.lme.missing).toEqual(['lithium','nickel']);
  });
  it('excludes multiple missing prices from the same market while preserving currency-convertible totals',()=>{
    const lme = parseMarketJSON(mk([nickel]),'lme',today);
    const r=compare(null,lme,{...EMPTY_COMPOSITION,nickel:10,lithium:3,cobalt:5,manganese:2});
    // 2 tonnes * 10% Ni * $20/kg * 80% = $3,200.
    expect(r.lme.totalUsd).toBe(3200);
    expect(r.lme.perTonneUsd).toBe(1600);
    expect(r.lme.perKgUsd).toBe(1.6);
    expect(r.lme.missing).toEqual(['cobalt']);
    expect(r.lme.pricedCompositionPercent).toBe(10);
    expect(r.smm.totalUsd).toBeNull();
  });
  it('shows a valid $0 result when payable is zero and at least one active quote exists',()=>{
    const lme = parseMarketJSON(mk([nickel]),'lme',today);
    const r=calculateComparison({tonnes:'2',payablePercent:'0',composition:{...EMPTY_COMPOSITION,nickel:10,cobalt:5},smm:null,lme});
    expect(r.lme.totalUsd).toBe(0);
    expect(r.lme.perKgUsd).toBe(0);
    expect(r.lme.missing).toEqual(['cobalt']);
  });
  it('does not require quotes for 0% composition metals',()=>{
    const smm = parseMarketJSON(mk([nickel]),'smm',today);
    const r = compare(smm, null, { ...EMPTY_COMPOSITION, lithium: Number(EMPTY_COMPOSITION.lithium), nickel: 20 });
    expect(r.smm.totalUsd).toBe(6400);
    expect(r.lme.totalUsd).toBeNull();
  });
  it('rejects impossible composition and mass',()=>{
    const r=calculateComparison({tonnes:0,payablePercent:100,composition:{...EMPTY_COMPOSITION,nickel:120},smm:null,lme:null});
    expect(r.valid).toBe(false);
    expect(r.smm.totalUsd).toBeNull();
  });
});

it('applies inclusive cutoff and excludes copper and aluminium even with quotes',()=>{
 const market = parseMarketJSON(mk([nickel, {metal:'Copper',benchmark:'Copper metal',price:10000}, {metal:'Cobalt',benchmark:'Cobalt metal',price:30000}]),'lme',today);
 const r = calculateComparison({tonnes:1,payablePercent:60,composition:{...EMPTY_COMPOSITION,nickel:5,cobalt:4.99,copper:20,aluminium:10},smm:null,lme:market});
 expect(r.lme.totalUsd).toBe(600); expect(r.lme.perKgUsd).toBe(.6); expect(r.lme.missing).toEqual([]); expect(r.lme.included).toEqual(['nickel']);
 const zero = calculateComparison({tonnes:1,payablePercent:60,composition:{...EMPTY_COMPOSITION,nickel:4.99,copper:20},smm:null,lme:market});
 expect(zero.lme.totalUsd).toBe(0); expect(zero.lme.missing).toEqual([]);
});
