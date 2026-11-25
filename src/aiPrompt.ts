/** Paste this prompt into a research assistant that can browse the web. It requests
 * the exact JSON schema accepted by the V3 manual-market importer. */
export function buildMarketPricePrompt(): string {
  return `Research the MOST RECENT VERIFIABLE published commodity price for each of the seven materials, independently for:
1. Shanghai Metals Market (SMM) — https://www.metal.com/
2. London Metal Exchange (LME) — https://www.lme.com/

IMPORTANT RESEARCH INSTRUCTIONS:
- Search each provider's official website carefully, including the specific contract/product price pages, and cite the exact original webpage URL in each non-null price row.
- Prefer today's dated, publicly visible quotation. When today's quote is unavailable, use the latest PREVIOUS VERIFIED quotation for that specific metal, however old it is. Each metal may have a different quote date. Never mark an older quote as today's price.
- Use only quotations explicitly from that provider. Do not replace unavailable LME values with SMM, other exchanges, third-party estimates, or AI-generated numbers. If official source access is insufficient, output price: null.
- Return prices as NUMBERS (not strings) in USD per METRIC TONNE (1000 kg). Do not silently confuse USD/kg, USD/lb, CNY/tonne, contract month, offer/bid/settlement, or different chemical products. If the USD/tonne conversion cannot be verified reliably, use null.
- For SMM choose these price bases when quoted: battery-grade lithium carbonate, nickel cathode metal, cobalt metal, electrolytic manganese metal, copper cathode metal, and aluminium ingot metal. If multiple bases (tax-inclusive/exclusive) exist, label the actual choice in benchmark.
- For LME prefer official cash/settlement metal quotations for nickel, cobalt, copper and aluminium if available. For lithium use the latest published LME lithium hydroxide MONOHYDRATE-linked contract quote, clearly label its basis and contract month if applicable. LME does not have a standard manganese contract: keep its price null unless a genuine LME manganese benchmark is verified.
- For steel, use a clearly identified finished steel benchmark (not iron ore or scrap), label product and contract basis; if unavailable return null. Steel is only used in the separate materials calculator.
- For lithium, do not treat lithium hydroxide, lithium carbonate, and elemental lithium as the same product. The benchmark string MUST contain 'lithium carbonate' or 'lithium hydroxide monohydrate' (or explicitly 'lithium metal' if that is actually quoted). For nickel/cobalt/copper/aluminium/manganese with non-null prices, benchmark names must be METAL benchmarks, not sulphates, oxides, ore or scrap.
- Include date (YYYY-MM-DD) and source_url for EACH non-null metal row. Use date: null and source_url: null for unavailable rows.
- At the top level, price_date must be the most recent actual quote date in that JSON. If no prices are verifiable at all, use the current research date for price_date and leave every price null. Do NOT claim price_date applies to every row; each row's date is authoritative.
- If a site is inaccessible, subscription-only, or returns no verifiable numeric price, report null; NEVER hallucinate a price or fabricate a quotation date or URL.
- Be mindful of each publisher's terms of use. Researching quotations does not automatically give permission to publicly republish the data.

OUTPUT EXACTLY TWO separate valid JSON code blocks in this order — SMM then LME. No markdown or explanation INSIDE either JSON block. Keep exactly the given top-level field names, metal names and 7 rows. Every 'price' must be a JSON number or null. Every date must be YYYY-MM-DD. Do not omit a material.

FIRST JSON (SMM):
{
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
    {"metal":"Aluminium","benchmark":"Aluminium ingot metal","price":null,"date":null,"source_url":null},
    {"metal":"Steel","benchmark":"Steel finished product","price":null,"date":null,"source_url":null}
  ]
}

SECOND JSON (LME):
{
  "source": "London Metal Exchange (LME)",
  "price_date": "YYYY-MM-DD",
  "currency": "USD",
  "unit": "metric_tonne",
  "prices": [
    {"metal":"Lithium","benchmark":"LME Lithium Hydroxide Monohydrate CIF (Fastmarkets)","price":null,"date":null,"source_url":null},
    {"metal":"Nickel","benchmark":"LME Nickel metal","price":null,"date":null,"source_url":null},
    {"metal":"Cobalt","benchmark":"LME Cobalt metal","price":null,"date":null,"source_url":null},
    {"metal":"Manganese","benchmark":"Not an LME metal contract benchmark","price":null,"date":null,"source_url":null},
    {"metal":"Copper","benchmark":"LME Copper Grade A metal","price":null,"date":null,"source_url":null},
    {"metal":"Aluminium","benchmark":"LME Aluminium metal","price":null,"date":null,"source_url":null},
    {"metal":"Steel","benchmark":"LME Steel finished product","price":null,"date":null,"source_url":null}
  ]
}

You MUST replace the YYYY-MM-DD placeholders with valid real dates and replace each available null price with its accurately verified value, plus its exact quote date and source_url. If a metal lacks a verified quote, preserve null and do not include a fictitious date or URL.`;
}
