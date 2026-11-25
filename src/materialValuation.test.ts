import { describe, expect, it } from 'vitest';
import { autoMaterialPrice, materialValue } from './materialValuation';
import { parseMarketJSON } from './importPrices';
const market = parseMarketJSON(JSON.stringify({currency:'USD',unit:'metric_tonne',price_date:'2026-10-13',prices:[{metal:'Copper',benchmark:'Copper metal',price:10000},{metal:'Steel',benchmark:'Steel hot rolled coil',price:500}]}),'lme',new Date('2026-10-13T12:00:00Z'));
describe('separate materials',()=>{
  it('converts USD/tonne to INR/kg and accepts steel',()=>{
    expect(autoMaterialPrice('copper',market,85)).toBe(850);
    expect(autoMaterialPrice('steel',market,85)).toBe(42.5);
    expect(autoMaterialPrice('aluminium',market,85)).toBeNull();
    expect(autoMaterialPrice('copper',market,null)).toBeNull();
  });
  it('uses independent purity and payable fractions, including purity below 5%',()=>{
    expect(materialValue('100','95','1200','80')).toBeCloseTo(91200);
    expect(materialValue('100','4','1200','80')).toBeCloseTo(3840);
    expect(materialValue('50','90','300','75')).toBeCloseTo(10125);
  });
  it('rejects missing prices and invalid input',()=>{
    expect(materialValue('100','95','','80')).toBeNull();
    expect(materialValue('100','101','1200','80')).toBeNull();
    expect(materialValue('100','95','1200','101')).toBeNull();
    expect(materialValue('-1','95','1200','80')).toBeNull();
    expect(materialValue('0','95','1200','80')).toBe(0);
  });
});
