import { useState } from 'react';
import type { MarketSelection } from './aiPrompt';
import type { ImportedMarket, Market } from './domain';
import { autoMaterialPrice, materialValue, SEPARATE_IDS, type SeparateId } from './materialValuation';
const names = {copper:'Copper', aluminium:'Aluminium', steel:'Steel'};
const symbols = {copper:'Cu', aluminium:'Al', steel:'Fe'};
type Entry = {weight:string; purity:string; payable:string; manual:string|null};
const initial = (): Record<SeparateId,Entry> => Object.fromEntries(SEPARATE_IDS.map(id=>[id,{weight:'0',purity:'100',payable:'80',manual:null}])) as Record<SeparateId,Entry>;
const format = (v:number|null) => v === null ? '—' : new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2,minimumFractionDigits:2}).format(v);
export function SeparateMaterials({smm,lme,rate,selection}:{smm:ImportedMarket|null;lme:ImportedMarket|null;rate:number|null;selection:MarketSelection}) {
  const [entries,setEntries] = useState(initial);
  const [comparisonSource,setSource] = useState<Market>('lme');
  const source = selection === 'both' ? comparisonSource : selection;
  const market = source === 'lme' ? lme : smm;
  const update = (id:SeparateId, patch:Partial<Entry>) => setEntries(old=>({...old,[id]:{...old[id],...patch}}));
  const rows = SEPARATE_IDS.map(id=>{
    const entry = entries[id];
    const auto = autoMaterialPrice(id,market,rate);
    const price = entry.manual ?? (auto === null ? '' : String(auto));
    const total = materialValue(entry.weight,entry.purity,price,entry.payable);
    return {id,entry,price,total,auto};
  });
  const incomplete = rows.some(r=>r.total === null && (r.entry.weight.trim()==='' || Number(r.entry.weight)!==0));
  const total = rows.reduce((sum,r)=>sum+(r.total??0),0);
  return <section className="table-panel separate-materials">
    <div className="panel-heading table-heading"><div><span className="overline">STEP 06</span><h2>Separate materials valuation</h2><p>Calculate recovered copper, aluminium and steel independently of black mass.</p></div><button type="button" className="text-button" onClick={()=>setEntries(initial())}>Reset materials</button></div>
    <div className="materials-source"><label>Automatic price source <select disabled={selection !== 'both'} value={source} onChange={e=>setSource(e.target.value as Market)}><option value="lme">LME</option><option value="smm">SMM</option></select></label><small>Applied JSON prices × USD/INR ÷ 1,000. Edit any price manually or reset it to auto. {market?.isExample ? 'Fictional sample prices selected.' : ''}</small></div>
    <div className="table-wrap"><table className="metal-table materials-table"><thead><tr><th>Material</th><th>Weight (kg)</th><th>Purity (%)</th><th>Price (₹/kg)</th><th>Benchmark payable (%)</th><th>Final price (₹)</th></tr></thead><tbody>
      {rows.map(({id,entry,price,total:rowTotal,auto})=><tr key={id}><td><div className="metal-name"><span className="element-badge">{symbols[id]}</span><strong>{names[id]}</strong></div></td>
      {(['weight','purity'] as const).map(field=><td key={field}><div className="percent-cell"><input aria-label={`${names[id]} ${field}`} type="number" min="0" max={field==='purity'?100:undefined} step="any" value={entry[field]} onChange={e=>update(id,{[field]:e.target.value})}/></div></td>)}
      <td><div className="percent-cell material-price"><input aria-label={`${names[id]} price INR per kg`} type="number" min="0" step="any" value={price} placeholder="Enter price" onChange={e=>update(id,{manual:e.target.value})}/></div><small className="material-price-source">{entry.manual!==null?'Manual':auto===null?'No quote / FX':`${source.toUpperCase()} · ${market?.prices[id]?.date}`}</small>{entry.manual!==null&&<button className="text-button" type="button" onClick={()=>update(id,{manual:null})}>Reset to auto</button>}</td>
      <td><div className="percent-cell"><input aria-label={`${names[id]} payable percentage`} type="number" min="0" max="100" step="any" value={entry.payable} onChange={e=>update(id,{payable:e.target.value})}/></div></td><td className="value-cell">{format(rowTotal)}{rowTotal===null&&Number(entry.weight)>0&&<small className="material-price-source">Check inputs</small>}</td></tr>)}
    </tbody><tfoot><tr><td colSpan={5}>{incomplete?'PARTIAL MATERIALS TOTAL':'TOTAL MATERIALS VALUE'}</td><td className="value-cell">{format(incomplete && !rows.some(r=>r.total!==null&&Number(r.entry.weight)>0)?null:total)}</td></tr></tfoot></table></div>
    <div className="table-bottom"><span>Final price = weight × purity ÷ 100 × price per kg × payable ÷ 100. No 5% cutoff applies here. Steel finished-product quotations are proxies, not scrap prices.</span></div>
  </section>;
}
