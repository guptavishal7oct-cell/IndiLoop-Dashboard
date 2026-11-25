import {describe, expect, it} from 'vitest';
import {buildMarketPricePrompt} from './aiPrompt';

describe('research prompt',()=>{
 it('requests both exact market source schemas, metal names and proper dates',()=>{
   const p=buildMarketPricePrompt();
   expect(p).toContain('https://www.metal.com/');
   expect(p).toContain('https://www.lme.com/');
   expect(p).toContain('date (YYYY-MM-DD)');
   expect(p).toContain('source_url');
   expect(p).toMatch(/previous/i);
   expect(p).toContain('price: null');
   expect((p.match(/"metal":"Lithium"/g)||[]).length).toBe(2);
   expect((p.match(/"metal":"Manganese"/g)||[]).length).toBe(2);
   expect((p.match(/"unit": "metric_tonne"/g)||[]).length).toBe(2);
 });
});

it('only requests selected market schemas and LME hierarchy',()=>{
 const smm=buildMarketPricePrompt(['smm']); const lme=buildMarketPricePrompt(['lme']);
 expect(smm).not.toContain('www.lme.com'); expect(smm).not.toContain('price_type');
 expect(lme).not.toContain('www.metal.com'); expect(lme).toContain('3_month_closing');
 expect(lme).toContain('fastmarkets'); expect(lme).toContain('"price_type":null');
 expect((lme.match(/"metal":"Lithium"/g)||[]).length).toBe(1);
 expect(buildMarketPricePrompt([])).toBe('');
});
