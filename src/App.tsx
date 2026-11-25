import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, BarChart3, Calculator,
  CheckCircle2, ChevronRight, CircleHelp, ClipboardPaste, Code2, FileJson,
  Info, Layers3, Menu, RotateCcw, ShieldCheck, TrendingUp, X, Copy, RefreshCw, IndianRupee,
} from 'lucide-react';
import { EMPTY_COMPOSITION, MATERIALS, SAMPLE_COMPOSITION, type Composition, type ImportedMarket, type Market, type MetalId } from './domain';
import { ageInDays, parseMarketJSON } from './importPrices';
import { calculateComparison, type ValuationSide } from './valuation';
import { blankTemplate, sampleJSON } from './examples';
import { buildMarketPricePrompt } from './aiPrompt';
import { convertedInr, getUsdInrRate, validUsdInrRate, type FxQuote } from './exchangeRate';

const priceTypeLabel = (type: string | null | undefined) => type === 'fastmarkets' ? 'Fastmarkets' : type === '3_month_closing' ? '3-month closing' : type === 'current' ? 'Current / cash settlement' : 'Price type not supplied';
const money = (value: number | null, decimals = 2) => value === null || !Number.isFinite(value) ? '—'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
const rupees = (value: number | null) => value === null || !Number.isFinite(value) ? '—'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const number = (value: number, digits = 2) => Number.isFinite(value)
  ? new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value) : '—';
const getSaved = (key: string, fallback: string): string => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
function loadAssay(): Composition {
  try {
    const stored = JSON.parse(getSaved('indiloop.assay.v3', 'null')) as unknown;
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      const s = stored as Record<string, unknown>;
      return Object.fromEntries(MATERIALS.map(m => [m.id, m.id === 'copper' || m.id === 'aluminium' ? 0 : typeof s[m.id] === 'number' || typeof s[m.id] === 'string' ? s[m.id] : 0])) as Composition;
    }
  } catch { /* invalid stored state */ }
  return {...EMPTY_COMPOSITION};
}
function storedMarket(kind: Market): ImportedMarket | null {
  const raw = getSaved(`indiloop.${kind}.json.v3`, '');
  if (!raw) return null;
  try { return parseMarketJSON(raw, kind, new Date(), getSaved(`indiloop.${kind}.example.v3`, 'false') === 'true'); }
  catch { return null; }
}
function readSavedFx(): FxQuote | null {
  try {
    const value = JSON.parse(getSaved('indiloop.fx.last.v3.1','null')) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const quote = value as Record<string,unknown>;
      if (validUsdInrRate(quote.rate) && typeof quote.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(quote.date))
        return {rate:quote.rate,date:quote.date};
    }
  } catch { /* no cached FX data */ }
  return null;
}
function Brand() { return <span className="brand-mark" aria-hidden="true"><span className="brand-ring"/></span>; }
function Header() {
  const [open, setOpen] = useState(false);
  return <header className="topbar"><div className="container topbar-inner">
    <NavLink className="brand" to="/" onClick={() => setOpen(false)}><Brand/><span>indi<span className="brand-accent">loop</span></span><span className="brand-divider"/><span className="brand-subtitle">INTELLIGENCE</span></NavLink>
    <nav className={'nav-links' + (open ? ' open' : '')} aria-label="Main navigation">
      <NavLink to="/" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} onClick={() => setOpen(false)}>Home</NavLink>
      <NavLink to="/calculator" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')} onClick={() => setOpen(false)}>Black Mass Price Calculator</NavLink>
    </nav>
    <div className="topbar-end"><span className="beta"><span className="pulse-dot"/> V3.2 · PARTIAL TOTALS</span><button type="button" className="mobile-menu" onClick={() => setOpen(x=>!x)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X size={22}/> : <Menu size={22}/>}</button></div>
  </div></header>;
}
function Footer() { return <footer className="footer"><div className="container footer-inner"><span>© {new Date().getFullYear()} IndiLoop · Market Intelligence</span><span>Illustrative benchmark arithmetic, not a binding black-mass sale quotation.</span></div></footer>; }
function Home() {
  const navigate = useNavigate();
  return <main className="container home-main"><div className="eyebrow"><span className="eyebrow-line"/> THE FUTURE OF MATERIAL RECOVERY</div>
    <section className="hero"><div className="hero-copy"><div className="tiny-chip"><span className="chip-dot"/> INDILOOP ANALYTICS · V3.2</div>
      <h1>Intelligence for a <em>circular</em> future.</h1>
      <p>Understand the value locked inside battery black mass. Compare Shanghai and London commodity benchmarks using prices you manually supply — with transparent, chemistry-aware calculations.</p>
      <div className="hero-actions"><button type="button" className="button primary" onClick={() => navigate('/calculator')}>Open Price Calculator <ArrowUpRight size={18}/></button><span className="button ghost static-pill"><FileJson size={16}/> Manual prices · Free FX API</span></div>
    </div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="hero-moon"><Layers3 size={63} strokeWidth={1.1}/><span>Li</span></div><span className="float-tag tag-one">RECOVER</span><span className="float-tag tag-two">REFINE</span><span className="float-tag tag-three">REVALUE</span></div></section>
    <section className="stat-grid">
      <div className="stat-tile"><span className="stat-icon mint"><BarChart3 size={22}/></span><div><span className="stat-value">06</span><span className="stat-label">Battery-metal benchmarks</span></div><ArrowUpRight size={17} className="stat-arrow"/></div>
      <div className="stat-tile"><span className="stat-icon blue"><Activity size={22}/></span><div><span className="stat-value">02</span><span className="stat-label">Independent market comparisons</span></div><ArrowUpRight size={17} className="stat-arrow"/></div>
      <div className="stat-tile"><span className="stat-icon amber"><FileJson size={22}/></span><div><span className="stat-value">100%</span><span className="stat-label">Browser-based, manual import</span></div><ArrowUpRight size={17} className="stat-arrow"/></div>
    </section>
    <div className="section-top"><div><span className="overline">TOOLS / 01</span><h2>Your workspace</h2></div><span className="section-muted">Purpose-built for battery recycling</span></div>
    <section className="tool-grid"><button type="button" className="tool-card clickable" onClick={() => navigate('/calculator')}><span className="tool-icon"><Calculator size={24}/></span><span className="tool-name">Black Mass Price Calculator</span><span className="tool-desc">Paste SMM and LME JSON, input batch weight and metal composition, and view separate per-kg, per-tonne and total estimates.</span><span className="tool-action">Launch calculator <ArrowRight size={17}/></span><span className="corner-chevron"><ArrowUpRight size={24}/></span></button>
    <div className="tool-card muted-tool"><span className="tool-icon"><ShieldCheck size={24}/></span><span className="tool-name">Transparent, manual benchmark data</span><span className="tool-desc">No paid pricing APIs or keys. Metal prices are manually imported; USD/INR is sourced from a free daily-reference API.</span><span className="tool-footnote"><CheckCircle2 size={16}/> No prices fabricated by the calculator</span></div></section>
    <div className="information-strip"><Info size={18}/><span><strong>How it works:</strong> Collect quotations you are permitted to use, paste two JSON documents in the calculator, then apply them. Your JSON and assay stay in your browser. Only the free Frankfurter exchange-rate API is contacted for USD/INR.</span></div>
  </main>;
}
interface JsonCardProps {market: Market; raw: string; imported: ImportedMarket | null; error: string; onChange: (value: string) => void; onApply: () => void; onTemplate: () => void; onClear: () => void;}
function JsonCard({ market, raw, imported, error, onChange, onApply, onTemplate, onClear }: JsonCardProps) {
  const label = market === 'smm' ? 'Shanghai Metals Market' : 'London Metal Exchange';
  const code = market === 'smm' ? 'SMM · metal.com' : 'LME · lme.com';
  const old = imported ? Math.max(...Object.values(imported.prices).map(q => q ? ageInDays(q.date) : 0), 0) : 0;
  return <div className={`json-card ${market}`}><div className="json-heading"><div><span className="source-code">{code}</span><h3>{label}</h3></div><span className={'json-state ' + (imported ? (imported.isExample ? 'sample-state' : 'good-state') : 'waiting-state')}>{imported ? (imported.isExample ? 'FICTIONAL EXAMPLE' : 'JSON APPLIED') : 'AWAITING JSON'}</span></div>
    <label className="json-label" htmlFor={`${market}-json`}>Paste price JSON</label>
    <textarea id={`${market}-json`} className="json-input" spellCheck={false} value={raw} onChange={e => onChange(e.target.value)} placeholder={'{\n  "price_date": "2026-10-13",\n  "currency": "USD",\n  "unit": "metric_tonne",\n  "prices": [...]\n}'} aria-invalid={Boolean(error)}/>
    <div className="json-actions"><button type="button" className="button primary" onClick={onApply}><ClipboardPaste size={15}/> Apply JSON</button><button type="button" className="mini-action" onClick={onTemplate}><Code2 size={14}/> Template</button><button type="button" className="mini-action" onClick={onClear}><RotateCcw size={14}/> Clear</button></div>
    {error && <p className="json-error" role="alert"><AlertCircle size={15}/>{error}</p>}
    {imported && <div className="import-notice"><CheckCircle2 size={16}/><span>{Object.keys(imported.prices).length} metal quote(s) applied · {imported.date}{old > 7 ? <strong className="stale-flag"> · STALE ({old}d oldest)</strong> : null}{imported.warnings.length > 0 && <small>{imported.warnings.slice(0,2).join(' ')}</small>}</span></div>}
  </div>;
}
function Results({label, market, data, tonnes, example, rate}: {label:string; market:Market; data:ValuationSide; tonnes:string; example:boolean; rate:number|null}) {
  return <div className={`market-results ${market}`}><div className="market-results-title"><div><span className="overline">{market.toUpperCase()} BENCHMARK</span><h3>{label}</h3></div><span className="basis-chip">{example ? 'FICTIONAL DEMO' : 'MANUALLY SUPPLIED'}</span></div>
    <div className="result-grid"><div className="result-card"><div className="result-card-top"><span>PER KG BLACK MASS</span><span className="result-card-icon"><TrendingUp size={20}/></span></div><strong>{money(data.perKgUsd)}</strong><div className="result-inr">{rate === null ? 'INR pending FX rate' : rupees(convertedInr(data.perKgUsd,rate))} <small>INR / kg</small></div><div className="result-card-bottom">USD / kg <ArrowUpRight size={16}/></div></div>
    <div className="result-card"><div className="result-card-top"><span>PER TONNE BLACK MASS</span><span className="result-card-icon"><BarChart3 size={20}/></span></div><strong>{money(data.perTonneUsd)}</strong><div className="result-inr">{rate === null ? 'INR pending FX rate' : rupees(convertedInr(data.perTonneUsd,rate))} <small>INR / tonne</small></div><div className="result-card-bottom">USD / metric tonne <ArrowUpRight size={16}/></div></div>
    <div className="result-card featured"><div className="result-card-top"><span>TOTAL BLACK MASS VALUE</span><span className="result-card-icon"><Layers3 size={20}/></span></div><strong>{money(data.totalUsd)}</strong><div className="result-inr">{rate === null ? 'INR pending FX rate' : rupees(convertedInr(data.totalUsd,rate))} <small>INR total</small></div><div className="result-card-bottom">For {number(Number(tonnes)||0)} tonnes <ArrowUpRight size={16}/></div></div></div>
    {!data.hasInput && <p className="result-note">Paste and apply {market.toUpperCase()} JSON to calculate this market's values.</p>}
    {data.hasInput && data.eligibleCount === 0 && data.totalUsd !== null && <p className="result-note">No eligible metals at or above 5%; payable value is zero under this rule.</p>}
    {data.hasInput && data.missing.length > 0 && <p className="result-note warn"><AlertCircle size={16}/>{data.totalUsd !== null
      ? <>Partial valuation: {data.missing.join(', ')} {data.missing.length === 1 ? 'has' : 'have'} no price and {data.missing.length === 1 ? 'is' : 'are'} excluded. Total includes {data.included.length} priced {data.included.length === 1 ? 'metal' : 'metals'} ({number(data.pricedCompositionPercent)}% of black mass by weight). This is not a complete metal value.</>
      : <>No total available: none of the eligible metals has a quoted price for this market ({data.missing.join(', ')}).</>}</p>}
  </div>;
}
function CalculatorPage() {
  const [markets, setMarkets] = useState<Market[]>(() => {
    try { const saved = JSON.parse(getSaved('indiloop.markets.v1', '["smm","lme"]')); return ['smm','lme'].filter(m => Array.isArray(saved) && saved.includes(m)) as Market[]; } catch { return ['smm','lme']; }
  });
  const showSmm = markets.includes('smm'), showLme = markets.includes('lme');
  function toggleMarket(market: Market) { setMarkets(old => old.includes(market) ? old.filter(m => m !== market) : [...old, market]); setCopyStatus(''); setShowPrompt(false); }
  useEffect(() => { try { localStorage.setItem('indiloop.markets.v1', JSON.stringify(markets)); } catch { /* ignore */ } }, [markets]);
  const [tonnes, setTonnes] = useState(() => getSaved('indiloop.tonnes.v3','1'));
  const [payable, setPayable] = useState(() => getSaved('indiloop.payable.v4','60'));
  const [composition, setComposition] = useState<Composition>(loadAssay);
  const [rawSmm, setRawSmm] = useState(() => getSaved('indiloop.smm.json.v3',''));
  const [rawLme, setRawLme] = useState(() => getSaved('indiloop.lme.json.v3',''));
  const [smm, setSmm] = useState<ImportedMarket | null>(() => storedMarket('smm'));
  const [lme, setLme] = useState<ImportedMarket | null>(() => storedMarket('lme'));
  const [errorSmm, setErrorSmm] = useState('');
  const [errorLme, setErrorLme] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [fxRateInput, setFxRateInput] = useState(() => readSavedFx()?.rate.toString() ?? '');
  const [fxDate, setFxDate] = useState<string | null>(() => readSavedFx()?.date ?? null);
  const [fxStatus, setFxStatus] = useState<'loading'|'automatic'|'cached'|'manual'|'error'>(() => readSavedFx() ? 'cached' : 'loading');
  const [fxError, setFxError] = useState('');
  const fxController = useRef<AbortController | null>(null);
  const refreshFx = useCallback(async () => {
    fxController.current?.abort();
    const controller = new AbortController();
    fxController.current = controller;
    setFxStatus('loading');setFxError('');
    try {
      const quote = await getUsdInrRate(controller.signal);
      if (controller.signal.aborted) return;
      setFxRateInput(String(quote.rate));setFxDate(quote.date);setFxStatus('automatic');
      try {localStorage.setItem('indiloop.fx.last.v3.1',JSON.stringify(quote));} catch { /* storage optional */ }
    } catch (e) {
      if (controller.signal.aborted) return;
      const saved = readSavedFx();
      if (saved) { setFxRateInput(String(saved.rate)); setFxDate(saved.date); setFxStatus('cached'); }
      else { setFxStatus('error'); }
      setFxError(e instanceof Error ? e.message : 'Could not fetch the USD/INR rate.');
    }
  },[]);
  useEffect(() => {
    void refreshFx();
    return () => fxController.current?.abort();
  },[refreshFx]);
  const fxRate = fxRateInput.trim() !== '' && validUsdInrRate(Number(fxRateInput)) ? Number(fxRateInput) : null;
  function editFx(value:string) {
    fxController.current?.abort(); // Manual changes must not be overwritten by an inflight API result.
    setFxRateInput(value);setFxDate(null);setFxStatus('manual');setFxError('');
  }
  async function copyResearchPrompt() {
    const text = buildMarketPricePrompt(markets);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied! Paste into a web-enabled AI assistant.');
      setShowPrompt(false);
    } catch {
      setCopyStatus('Clipboard permission denied. Select and copy the prompt below.');
      setShowPrompt(true);
    }
  }
  useEffect(() => {
    try {
      localStorage.setItem('indiloop.tonnes.v3',tonnes);
      localStorage.setItem('indiloop.payable.v4',payable);
      localStorage.setItem('indiloop.assay.v3',JSON.stringify(composition));
      localStorage.setItem('indiloop.smm.json.v3',rawSmm);
      localStorage.setItem('indiloop.lme.json.v3',rawLme);
    } catch { /* local storage may be unavailable: calculator still works */ }
  },[tonnes,payable,composition,rawSmm,rawLme]);
  const valuation = useMemo(() => calculateComparison({tonnes,payablePercent:payable,composition,smm:showSmm?smm:null,lme:showLme?lme:null}),[tonnes,payable,composition,smm,lme,showSmm,showLme]);
  function editJSON(market: Market, text: string) {
    if (market === 'smm') {setRawSmm(text);setSmm(null);setErrorSmm('');}
    else {setRawLme(text);setLme(null);setErrorLme('');}
    try {localStorage.setItem(`indiloop.${market}.example.v3`,'false');} catch { /* ignore */ }
  }
  function apply(market: Market, isExample = false) {
    const raw = market === 'smm' ? rawSmm : rawLme;
    try {
      const record = parseMarketJSON(raw,market,new Date(),isExample);
      if (market === 'smm') {setSmm(record);setErrorSmm('');}
      else {setLme(record);setErrorLme('');}
      try {localStorage.setItem(`indiloop.${market}.example.v3`,String(isExample));} catch { /* ignore */ }
    } catch (e) {
      if (market === 'smm') {setSmm(null);setErrorSmm(e instanceof Error ? e.message : 'Unknown parsing error.');}
      else {setLme(null);setErrorLme(e instanceof Error ? e.message : 'Unknown parsing error.');}
    }
  }
  function loadExample() {
    for (const market of markets) {
      const raw = sampleJSON(market);
      const parsed = parseMarketJSON(raw,market,new Date(),true);
      if (market === 'smm') { setRawSmm(raw); setSmm(parsed); setErrorSmm(''); }
      else { setRawLme(raw); setLme(parsed); setErrorLme(''); }
      try { localStorage.setItem(`indiloop.${market}.example.v3`,'true'); } catch { /* ignore */ }
    }
    setComposition({...SAMPLE_COMPOSITION,copper:0,aluminium:0});setTonnes('1');setPayable('60');
  }
  function clearMarket(market: Market) { editJSON(market, ''); }
  function setTemplate(market:Market) { editJSON(market,blankTemplate(market)); }
  function changePercent(id:MetalId, value:string) {setComposition(old=>({...old,[id]:value}));}
  const dated = [showSmm?smm:null,showLme?lme:null].filter((r): r is ImportedMarket => !!r);
  const hasOld = dated.some(r=>r.warnings.some(w=>w.includes('days old')));
  return <main className="container calc-main">
    <div className="breadcrumb"><NavLink to="/">Home</NavLink><ChevronRight size={14}/><span className="crumb-active">Black Mass Price Calculator</span></div>
    <div className="calc-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> COMMODITY BENCHMARK COMPARISON</div><h1>Black Mass <span>Price Calculator</span></h1><p>Compare the indicative value of your black mass using manually entered Shanghai and London metal quotations.</p></div><span className="basis-chip">USD · METRIC TONNE · MANUAL INPUT</span></div>
    <div className="source-banner"><span className="banner-icon"><FileJson size={20}/></span><span className="banner-content"><strong>NO METAL PRICING API OR BACKEND REQUIRED</strong><small>Select one or both markets and paste the corresponding researched price JSON. Metal prices are always manual; USD/INR is retrieved from Frankfurter when available.</small></span><span className="banner-status">MANUAL DATA</span></div>
    <section className="input-panel market-selector"><div className="panel-heading"><div><span className="overline">MARKET SELECTION</span><h2>Choose pricing markets</h2><p>Select one or both markets. Your imported quotations are retained when a market is hidden.</p></div></div><div className="market-options">{(['smm','lme'] as const).map(market => <label key={market} className={`market-option ${market} ${markets.includes(market)?'selected':''}`}><input type="checkbox" checked={markets.includes(market)} onChange={()=>toggleMarket(market)}/><span><strong>{market==='smm'?'Shanghai Metals Market (SMM)':'London Metal Exchange (LME)'}</strong><small>{market==='smm'?'Spot metal assessments':'Fastmarkets → 3-month closing → cash settlement'}</small></span></label>)}</div>{!markets.length && <p role="status" className="research-hint">Select at least one market to begin.</p>}</section>
    {markets.length>0 && <>
    <section className="input-panel"><div className="panel-heading"><div><span className="overline">STEP 01</span><h2>Black mass inputs</h2><p>Enter the total black mass weight and the buyer’s payable percentage (default 60%).</p></div><div className="round-icon"><Layers3 size={22}/></div></div>
      <div className="inputs-grid"><label className="input-wrap"><span>Black mass weight</span><div className="input-group"><input type="number" min="0.001" step="any" value={tonnes} onChange={e=>setTonnes(e.target.value)} aria-label="Black mass weight in tonnes"/><span className="input-unit">TONNES</span></div><small>1 metric tonne = 1,000 kilograms</small></label>
        <label className="input-wrap"><span>Benchmark payable percentage</span><div className="input-group"><input type="number" min="0" max="100" step="any" value={payable} onChange={e=>setPayable(e.target.value)} aria-label="Benchmark payable percentage"/><span className="input-unit">%</span></div><small>60% default; enter the negotiated payable, not the deduction</small></label>
        <div className="input-aside"><Info size={20}/><span>Assay percentages below represent <strong>elemental metals in extracted black mass</strong>, not metals in whole batteries. Only Ni, Co, Mn and Li at 5% or above are payable.</span></div>
      </div>
    </section>
    <section className="json-section"><div className="panel-heading json-section-heading"><div><span className="overline">STEP 02</span><h2>Import market quotations</h2><p>Use the provided JSON format, with prices in USD per metric tonne and an ISO quotation date.</p></div><div className="import-toolbar"><button type="button" className="button primary" onClick={() => void copyResearchPrompt()}><Copy size={16}/> Copy {showSmm && showLme ? 'SMM + LME' : showSmm ? 'SMM' : 'LME'} research prompt</button><button type="button" className="button outlined" onClick={loadExample}><Code2 size={15}/> Load fictional {markets.length===1?'example':'examples'}</button></div></div>
      {copyStatus && <p className="copy-notice" role="status"><CheckCircle2 size={16}/>{copyStatus}</p>}
      {showPrompt && <div className="copy-fallback"><label htmlFor="ai-prompt">Research prompt (click inside and press Ctrl+A, Ctrl+C)</label><textarea id="ai-prompt" readOnly value={buildMarketPricePrompt(markets)} onFocus={e=>e.target.select()}/><button type="button" className="mini-action" onClick={()=>setShowPrompt(false)}>Close prompt</button></div>}
      <p className="research-hint">Requests the latest available <strong>verified</strong> quote per metal from each source, or the last published quote if today's is unavailable. Missing prices stay <code>null</code>. Each metal can have its own quote date and source URL.</p>
      <div className={`json-grid ${markets.length===1?'single-market':''}`}>{showSmm && <JsonCard market="smm" raw={rawSmm} imported={smm} error={errorSmm} onChange={v=>editJSON('smm',v)} onApply={()=>apply('smm')} onTemplate={()=>setTemplate('smm')} onClear={()=>clearMarket('smm')}/>} {showLme && <JsonCard market="lme" raw={rawLme} imported={lme} error={errorLme} onChange={v=>editJSON('lme',v)} onApply={()=>apply('lme')} onTemplate={()=>setTemplate('lme')} onClear={()=>clearMarket('lme')}/>}</div>
      <div className="json-hint"><CircleHelp size={17}/><span>Shanghai = <strong>Shanghai Metals Market (SMM)</strong>, a price-reporting provider, not a metals exchange. London = <strong>LME</strong>. Some benchmarks differ (e.g. lithium carbonate vs lithium hydroxide) and LME may have no manganese quotation. Missing values must be <code>null</code>, not zero.</span></div>
    </section>
    <section className="fx-panel"><div className="panel-heading"><div><span className="overline">STEP 03</span><h2>USD → INR exchange rate</h2><p>Frankfurter's latest available daily reference rate. Use the manual override if offline or for scenario analysis.</p></div><span className="fx-icon"><IndianRupee size={24}/></span></div>
      <div className="fx-grid"><label className="input-wrap"><span>1 USD = INR</span><div className="input-group"><input type="number" min="0.001" step="any" inputMode="decimal" aria-label="USD to INR rate" value={fxRateInput} onChange={e=>editFx(e.target.value)} placeholder="Fetching daily rate..."/><span className="input-unit">INR</span></div><small>{fxStatus === 'automatic' ? `Frankfurter reference quote · ${fxDate}` : fxStatus === 'cached' ? `Last saved reference quote · ${fxDate ?? 'unknown date'}` : fxStatus === 'manual' ? 'Manual rate — not fetched or verified' : fxStatus === 'loading' ? 'Fetching latest available daily reference rate…' : 'Enter a manual rate to show INR amounts'}</small></label>
      <div className="fx-action"><button type="button" className="button outlined" disabled={fxStatus === 'loading'} onClick={() => void refreshFx()}><RefreshCw size={15} className={fxStatus === 'loading' ? 'spin' : ''}/> {fxStatus === 'loading' ? 'Fetching...' : 'Refresh USD/INR'}</button><span className={'fx-state ' + fxStatus}>{fxStatus === 'automatic' ? 'DAILY RATE LOADED' : fxStatus === 'manual' ? 'MANUAL OVERRIDE' : fxStatus === 'cached' ? 'CACHED RATE' : fxStatus === 'loading' ? 'CONNECTING' : 'FX UNAVAILABLE'}</span></div>
      <div className="fx-note"><Info size={18}/><span>All selected markets use the <strong>same USD/INR conversion</strong>. Frankfurter provides a daily reference rate, not a live trading tick or an executable bank rate. {fxStatus === 'cached' ? 'The last saved rate may be outdated.' : ''}</span></div></div>
      {fxError && <p className="fx-error" role="alert"><AlertCircle size={15}/>{fxError} {fxRate === null ? 'Enter an exchange rate manually.' : 'A cached rate is shown with its original date.'}</p>}
    </section>
    <section className="table-panel"><div className="panel-heading table-heading"><div><span className="overline">STEP 04</span><h2>Composition & market comparison</h2><p>Edit elemental composition. Only Ni, Co, Mn and Li at 5% or above contribute to value.</p></div><button type="button" className="text-button" onClick={()=>setComposition({...EMPTY_COMPOSITION})}><RotateCcw size={15}/> Clear assay</button></div>
      <div className="table-wrap"><table className={`metal-table compare-table ${markets.length===1?'single-market':''}`}><thead><tr><th rowSpan={2}>METAL</th><th rowSpan={2}>% IN BLACK MASS</th><th rowSpan={2}>WEIGHT (KG)</th>{showSmm && <th colSpan={2} className="smm-head">SHANGHAI · SMM</th>}{showLme && <th colSpan={2} className="lme-head">LONDON · LME</th>}</tr><tr>{showSmm && <><th className="smm-head">PRICE (USD/TONNE)</th><th className="smm-head">METAL VALUE (USD)</th></>}{showLme && <><th className="lme-head">PRICE (USD/TONNE)</th><th className="lme-head">METAL VALUE (USD)</th></>}</tr></thead><tbody>{valuation.rows.filter(row => row.id !== 'copper' && row.id !== 'aluminium').map(row => <tr key={row.id}><td><div className="metal-name"><span className="element-badge">{row.symbol}</span><span><strong>{row.name}</strong><small>{row.eligibilityReason}</small></span></div></td>
        <td><div className="percent-cell"><input aria-label={`${row.name} percentage`} type="number" min="0" max="100" step="any" value={composition[row.id]} onChange={e=>changePercent(row.id,e.target.value)}/><span>%</span></div></td>
        <td className="mono">{valuation.valid ? number(row.massKg,3) : '—'} <small>kg</small></td>
        {showSmm && <><td className="mono market-price" title={row.smmBenchmark ?? 'No SMM quote'}>{money(row.smmPrice)}<small className="inr-secondary">{fxRate !== null && row.smmPrice !== null ? rupees(convertedInr(row.smmPrice,fxRate)) : ''}</small><small>{row.smmBasis ?? 'No quotation'}</small></td>
        <td className="mono value-cell">{valuation.valid ? money(row.smmValue) : '—'}{fxRate !== null && valuation.valid && row.smmValue !== null && <small className="inr-secondary">{rupees(convertedInr(row.smmValue,fxRate))}</small>}</td>
        </>}{showLme && <><td className="mono market-price" title={row.lmeBenchmark ?? 'No LME quote'}>{money(row.lmePrice)}<small className="inr-secondary">{fxRate !== null && row.lmePrice !== null ? rupees(convertedInr(row.lmePrice,fxRate)) : ''}</small><small>{row.lmeBasis ?? 'No quotation'}</small>{row.lmePrice !== null && <small className="price-type">{priceTypeLabel(lme?.prices[row.id]?.priceType)}</small>}</td>
        <td className="mono value-cell lme-value">{valuation.valid ? money(row.lmeValue) : '—'}{fxRate !== null && valuation.valid && row.lmeValue !== null && <small className="inr-secondary">{rupees(convertedInr(row.lmeValue,fxRate))}</small>}</td></>}</tr>)}</tbody>
        <tfoot><tr><td>VALUATION TOTAL</td><td>{number(valuation.totalPercent)}%</td><td>{valuation.valid ? number(valuation.totalKg,2)+' kg batch' : 'Check inputs'}</td>{showSmm && <><td>{valuation.smm.totalUsd !== null && valuation.smm.missing.length ? `Partial · ${valuation.smm.missing.length} unpriced` : valuation.smm.missing.length ? 'No priced metals' : 'After payable %'}</td><td className="value-cell">{money(valuation.smm.totalUsd)}{fxRate !== null && valuation.smm.totalUsd !== null && <small className="inr-secondary">{rupees(convertedInr(valuation.smm.totalUsd,fxRate))}</small>}</td></>}{showLme && <><td>{valuation.lme.totalUsd !== null && valuation.lme.missing.length ? `Partial · ${valuation.lme.missing.length} unpriced` : valuation.lme.missing.length ? 'No priced metals' : 'After payable %'}</td><td className="value-cell lme-value">{money(valuation.lme.totalUsd)}{fxRate !== null && valuation.lme.totalUsd !== null && <small className="inr-secondary">{rupees(convertedInr(valuation.lme.totalUsd,fxRate))}</small>}</td></>}</tr></tfoot>
      </table></div><div className="table-bottom"><span><CircleHelp size={16}/> Only Ni, Co, Mn and Li with assay ≥ 5% contribute. Batch USD = metal mass (kg) × benchmark-equivalent factor × USD/tonne ÷ 1,000 × payable fraction. INR = USD × exchange rate. Missing eligible quotes produce partial totals.</span><span>Assayed: <strong className={valuation.totalPercent>100 ? 'danger-text' : ''}>{number(valuation.totalPercent)}%</strong> · Unassayed: <strong>{number(Math.max(0,100-valuation.totalPercent))}%</strong></span></div></section>
    {!valuation.valid && <div className="validation-message"><AlertCircle size={19}/>Enter a positive weight, composition totalling 0–100% (but not zero), and a payable percentage between 0–100%.</div>}
    {hasOld && <div className="validation-message"><AlertCircle size={19}/>Some imported quotations are older than 7 days. The calculator can compute historical values, but does not describe them as current prices.</div>}
    {(showSmm && smm?.isExample) || (showLme && lme?.isExample) ? <div className="validation-message"><AlertCircle size={19}/>Fictional sample quotations are loaded. Replace selected fictional JSON documents with verified, usable prices before making any business decisions.</div> : null}
    <section className="results-section"><div className="results-heading"><div><span className="overline">STEP 05</span><h2>Estimated black mass valuation</h2></div><span className="basis-chip">BENCHMARK BASIS · NOT A BUYER OFFER</span></div>
      {showSmm && <Results label="Shanghai Metals Market" market="smm" data={valuation.smm} tonnes={tonnes} example={Boolean(smm?.isExample)} rate={fxRate}/>}
      {showLme && <Results label="London Metal Exchange" market="lme" data={valuation.lme} tonnes={tonnes} example={Boolean(lme?.isExample)} rate={fxRate}/>}
      <div className="disclaimer"><Info size={18}/><p><strong>Important:</strong> These are estimates under the configured buyer payable and 5% cutoff, <em>not actual black-mass selling prices.</em> When a metal price is missing, that metal is excluded from the displayed partial total; it is <strong>not assigned a zero market value</strong>. LME and SMM quotations can refer to different products, delivery terms and valuation dates. Real buyers may discount for recoveries, moisture, Cu/Al impurities, treatment, transport and payable fractions. Only paste and publish quotation data you have the right to use.</p></div>
    </section>
    </>}
    <div className="source-footer"><span><ShieldCheck size={17}/> Only Frankfurter FX API requested · Metal pricing remains manual</span><span><FileJson size={15}/> SMM / LME manual comparison</span></div>
  </main>;
}
export default function App() {return <div className="app-shell"><Header/><Routes><Route path="/" element={<Home/>}/><Route path="/calculator" element={<CalculatorPage/>}/><Route path="*" element={<Home/>}/></Routes><Footer/></div>;}
