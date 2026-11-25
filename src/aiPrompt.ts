import type { Market } from './domain';

const COMMON = `IMPORTANT RESEARCH INSTRUCTIONS:
- Search each provider's official website carefully, including the specific contract/product price pages, and cite the exact original webpage URL in each non-null price row.
- Prefer today's dated, publicly visible quotation. When today's quote is unavailable, use the latest PREVIOUS VERIFIED quotation for that specific metal, however old it is. Each metal may have a different quote date. Never mark an older quote as today's price.
- Use only quotations explicitly from that provider. Do not substitute other providers, third-party estimates, or AI-generated numbers. If official source access is insufficient, output price: null.
- Return prices as NUMBERS (not strings) in USD per METRIC TONNE (1000 kg). Do not silently confuse USD/kg, USD/lb, CNY/tonne, contract month, offer/bid/settlement, or different chemical products. If the USD/tonne conversion cannot be verified reliably, use null.
- For lithium, do not treat lithium hydroxide, lithium carbonate, and elemental lithium as the same product. The benchmark string MUST contain 'lithium carbonate' or 'lithium hydroxide monohydrate' (or explicitly 'lithium metal' if that is actually quoted). For nickel/cobalt/copper/aluminium/manganese with non-null prices, benchmark names must be METAL benchmarks, not sulphates, oxides, ore or scrap.
- Include date (YYYY-MM-DD) and source_url for EACH non-null metal row. Use date: null and source_url: null for unavailable rows.
- At the top level, price_date must be the most recent actual quote date in that JSON. If no prices are verifiable at all, use the current research date for price_date and leave every price null. Do NOT claim price_date applies to every row; each row's date is authoritative.
- If a site is inaccessible, subscription-only, or returns no verifiable numeric price, report null; NEVER hallucinate a price or fabricate a quotation date or URL.
- Be mindful of each publisher's terms of use. Researching quotations does not automatically give permission to publicly republish the data.
`;
const SMM = `- For SMM choose these price bases when quoted: battery-grade lithium carbonate, nickel cathode metal, cobalt metal, electrolytic manganese metal, copper cathode metal, and aluminium ingot metal. If multiple bases (tax-inclusive/exclusive) exist, label the actual choice in benchmark.`;
const LME = `LME-specific mandatory price priority, applied independently to each metal:
1. Fastmarkets: first search for an eligible LME-published Fastmarkets-linked contract, using its M1 closing price. Prefer lithium hydroxide monohydrate CIF (Fastmarkets) and cobalt (Fastmarkets MB). Label the actual contract month and closing basis. Set price_type to "fastmarkets". Do not use direct external Fastmarkets quotes or final monthly settlement prices as closing prices.
2. If no verifiable eligible Fastmarkets quotation exists, use the official LME 3-month closing price (not the 3-month official bid/offer). Set price_type to "3_month_closing".
3. If neither is verifiable, use the official cash seller/settlement price. Set price_type to "current".
4. If none is verifiable, set price, price_type, date and source_url to null.
Benchmark priority takes precedence over recency across types; within each type choose the latest verified date, however old. Never label stale prices as current-date quotes. Only use LME-published prices. Do not assume every metal has a Fastmarkets contract. Manganese stays null unless an eligible genuine LME metal benchmark is verified. For all non-lithium metals use metal benchmarks, not salts or compounds. The only permitted price_type values are "fastmarkets", "3_month_closing", "current", and null. Label the exact benchmark and price basis.
Investigate individual product pages and https://www.lme.com/en/Market-data/Reports-and-data/LME-Closing-prices and https://www.lme.com/en/Market-data/Reports-and-data/LME-Official-prices. Use the exact page where the numeric quotation and date were verified, not merely a starting URL.`;
const SMM_SCHEMA = `{
  "source": "Shanghai Metals Market (SMM)",
  "price_date": "YYYY-MM-DD",
  "currency": "USD",
  "unit": "metric_tonne",
  "prices": [
    {"metal":"Lithium","benchmark":"Battery-grade lithium carbonate","price":null,"date":null,"source_url":null},
    {"metal":"Nickel","benchmark":"Nickel cathode metal","price":null,"date":null,"source_url":null},
    {"metal":"Cobalt","benchmark":"Cobalt metal","price":null,"date":null,"source_url":null},
    {"metal":"Manganese","benchmark":"Electrolytic manganese metal","price":null,"date":null,"source_url":null},
    {"metal":"Copper","benchmark":"Copper cathode metal","price":null,"date":null,"source_url":null},
    {"metal":"Aluminium","benchmark":"Aluminium ingot metal","price":null,"date":null,"source_url":null}
  ]
}`;
const LME_SCHEMA = `{
  "source": "London Metal Exchange (LME)",
  "price_date": "YYYY-MM-DD",
  "currency": "USD",
  "unit": "metric_tonne",
  "prices": [
    {"metal":"Lithium","benchmark":"LME Lithium Hydroxide Monohydrate CIF (Fastmarkets)","price":null,"price_type":null,"date":null,"source_url":null},
    {"metal":"Nickel","benchmark":"LME Nickel metal","price":null,"price_type":null,"date":null,"source_url":null},
    {"metal":"Cobalt","benchmark":"LME Cobalt metal","price":null,"price_type":null,"date":null,"source_url":null},
    {"metal":"Manganese","benchmark":"Not an LME metal contract benchmark","price":null,"price_type":null,"date":null,"source_url":null},
    {"metal":"Copper","benchmark":"LME Copper Grade A metal","price":null,"price_type":null,"date":null,"source_url":null},
    {"metal":"Aluminium","benchmark":"LME Aluminium metal","price":null,"price_type":null,"date":null,"source_url":null}
  ]
}`;
export function buildMarketPricePrompt(markets: readonly Market[] = ['smm','lme']): string {
  const selected = (['smm','lme'] as const).filter(m => markets.includes(m));
  if (!selected.length) return '';
  const providers = selected.map(m => m === 'smm' ? 'Shanghai Metals Market (SMM) — https://www.metal.com/' : 'London Metal Exchange (LME) — https://www.lme.com/');
  const sections = selected.map(m => m === 'smm' ? SMM : LME);
  const schemas = selected.map(m => `${m.toUpperCase()} JSON:\n${m === 'smm' ? SMM_SCHEMA : LME_SCHEMA}`);
  return [`Research the MOST RECENT VERIFIABLE published commodity price for each of the six metals, independently for:\n${providers.join('\n')}`, COMMON, ...sections, `OUTPUT EXACTLY ${selected.length === 2 ? 'TWO separate valid JSON code blocks in this order — SMM then LME' : 'ONE valid JSON code block for the selected provider'}. No text outside the code blocks. Keep exactly the given top-level fields, metal names and six rows. Every price must be a JSON number or null. Every non-null date must be YYYY-MM-DD. Do not omit any metal.`, ...schemas, 'Replace YYYY-MM-DD with valid dates and fill only verified numeric prices, dates and exact source URLs. Keep unavailable values null. Validate units, benchmark, dates and JSON syntax before returning.'].join('\n\n');
}
