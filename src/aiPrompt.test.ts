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
