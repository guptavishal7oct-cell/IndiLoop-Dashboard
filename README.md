# IndiLoop Market Intelligence V3.2 — Manual SMM vs LME + AI Prompt + USD/INR

A **standalone React + TypeScript** website for indicative black-mass valuation using **two manually pasted JSON documents**, with a copyable AI-research prompt and free daily USD/INR exchange-rate lookup. The original IndiLoop dark/teal UI is preserved. **No backend, paid price feed, or API key is needed.**

## Buyer pricing update

Only Ni, Co, Mn and Li with elemental assay at least 5% are payable; Cu and Al are excluded regardless of content. Default payable is 70%, editable. Missing eligible quotes give partial totals if another eligible quote exists, otherwise the total is unavailable. If no metal qualifies, an imported market returns zero. Per-kg and per-tonne values use the entire batch weight. Compound quotations are converted to elemental-equivalent prices before applying the formula.

## What you get

- Top navigation: **Home** and **Black Mass Price Calculator**. Refresh-safe `HashRouter` (`/#/calculator` remains on the calculator after refresh).
- **Copy AI price-research prompt** button: copies strict instructions asking a browsing AI to research SMM and LME separately, find the latest verified price per metal (or last verified recorded quote), return two import-compatible JSON blocks, and include individual quote dates/URLs. If copying is blocked, the app displays selectable prompt text.
- Two JSON editors: **Shanghai Metals Market (SMM)** and **London Metal Exchange (LME)**, each with Apply, Template, and Clear actions.
- Enter extracted **black mass tonnes**, **elemental metal composition percentages**, and optional **benchmark payable percentage** (70% by default).
- Side-by-side metal prices and corresponding values **in USD and INR** for each source, followed by three result cards **per kg, per tonne, total** in both currencies for each source.
- **Frankfurter USD → INR**: fetches its latest *available daily reference rate* from `https://api.frankfurter.dev/v2/rate/USD/INR`, shows the observation date and status, supports refresh, manual override, and last successfully saved rate if offline. This is **not an intraday forex trading price**; Frankfurter needs no API key.
- Detects malformed JSON, duplicate rows, unsupported currency/units, salt/metal benchmark mismatch, impossible assay and missing quotations. Missing eligible prices are clearly flagged.
- Marks quotes older than seven days as **stale** while still allowing historical calculations; no automatic fetching or freshness claims.
- Browser-local persistence: JSON, assay, weight and last successful FX quote survive refresh in `localStorage` on the same browser and origin. **The app never uploads your assay or JSON anywhere.** The only external request from the app is the USD/INR GET request to Frankfurter (plus browser font loading). Clear browser data to remove saved inputs.

## Run on Windows / locally

Install Node.js 20+ if needed. Open a terminal in the folder containing `package.json`:

```powershell
npm install
npm run dev
```

Then visit **http://127.0.0.1:5173/**. No second terminal or Python environment required.

```powershell
npm test            # tests for JSON import, valuations, FX parsing and prompt
npm run typecheck   # TypeScript check
npm run build       # static site in dist/
npm run preview     # preview production build locally
```

## JSON you need to paste

One document into the **SMM** editor; another into the **LME** editor. This is the same general schema used in the earlier prototype:

```json
{
  "source": "Shanghai Metals Market (SMM)",
  "price_date": "2026-10-13",
  "currency": "USD",
  "unit": "metric_tonne",
  "prices": [
    { "metal": "Lithium", "benchmark": "Battery-Grade Lithium Carbonate", "price": null },
    { "metal": "Nickel", "benchmark": "Nickel cathode metal", "price": null },
    { "metal": "Cobalt", "benchmark": "Cobalt metal", "price": null },
    { "metal": "Manganese", "benchmark": "Electrolytic manganese metal", "price": null },
    { "metal": "Copper", "benchmark": "Copper cathode metal", "price": null },
    { "metal": "Aluminium", "benchmark": "Aluminium ingot metal", "price": null }
  ]
}
```

Replace each `null` with a verified **numeric** price in USD per **metric tonne** (1,000 kg). Leave unknown/unavailable benchmarks as `null`; don't invent zero prices. The **Template** button fills the correct structure into either textarea. After pasting, click **Apply JSON** on each side.

For LME, use the same schema but enter LME-specific benchmarks, e.g. **LME Lithium Hydroxide Monohydrate CIF** for the lithium benchmark. LME does **not** have a conventional benchmark for every metal (for example, manganese). In such cases, leave the price as `null` and/or set that metal's assay percentage to 0 if genuinely absent. **Never set a metal's percentage to 0 merely to force a result.**

Click **Copy AI price-research prompt** to get the text to paste into ChatGPT or another web-enabled research AI. That assistant must return **two separate JSON objects** using the exact format below. The prompt requests the latest individually verified quote and quote date per metal, or `null` when unverifiable, even if the latest available quote is older. After copying the AI result, paste it into the corresponding market editor and click **Apply JSON**.

For a fully interactive trial without sourcing prices, click **Load fictional examples**. This inserts deliberately invented figures, sets a fictional assay, and visually marks the values as fictional. The fictional LME set intentionally omits manganese; the demo assay has 0% manganese so both totals initially calculate. Adding a positive manganese assay correctly makes the LME total unavailable without a quote.

### USD/INR exchange rate

Upon opening the calculator, the frontend makes one browser request to **Frankfurter API v2** for `USD/INR`. Its daily observation rate/date is shown in a dedicated panel, and all monetary price and valuation amounts are presented in USD and INR.

- **Refresh USD/INR** makes another request.
- Edit **1 USD = INR** to override manually; pending API retrieval is cancelled and the override is clearly identified.
- If the API fails and an earlier successful rate is saved in the browser, the old value is retained but marked **CACHED RATE**, with its date. Otherwise enter a manual rate.
- Conversions use `INR amount = USD amount × USD/INR rate`. If a market has missing prices, an unavailable USD total remains unavailable in INR too.
- No FX API key or server-side code required. You must have internet for automatic refresh.

### Format rules

- `currency` must be `USD` and `unit` must be `metric_tonne` (equivalent labels `usd/tonne`, `usd/t` also work). Metal quotes are still USD per tonne; INR amounts are converted *after importing* via the clearly displayed FX rate. No unit conversion from USD/kg is silently applied.
- `price_date` is a real `YYYY-MM-DD` date not in the future. **Individual metal rows should supply their own `date` and `source_url`** (the prompt explicitly asks for these) because the latest available published date may differ by metal; each row date overrides the top-level date.
- Metal names: `Lithium`, `Nickel`, `Cobalt`, `Manganese`, `Copper`, `Aluminium` (or `Aluminum`).
- Non-lithium benchmarks must refer to **metal**, not sulphate/sulfate, oxide, ore, scrap, etc.
- The lithium benchmark must **explicitly identify** lithium carbonate, lithium hydroxide monohydrate, anhydrous lithium hydroxide, or lithium metal. Generic "lithium price" is rejected.
- Metal proportions are **elemental weight percentages in extracted black mass**, not weight percentages of whole batteries or cathode compounds.
- The UI accepts partial JSON. Only nickel, cobalt, manganese and lithium with elemental assay ≥5% are payable. Copper and aluminium are assay-only. Missing eligible prices produce partial totals; if no metal qualifies, an imported market returns zero. Markets are independent.

## Calculation methodology

For each eligible metal and market (Ni, Co, Mn, Li at ≥5%; others contribute zero):

```
metal_mass_kg = black_mass_tonnes × 1,000 × (metal_percent / 100)
benchmark_equivalent_kg = metal_mass_kg × benchmark_factor
metal_value_usd = benchmark_equivalent_kg × (usd_per_tonne / 1,000) × (payable_percent / 100)
market_total = sum(metal_value_usd)
market_usd_per_kg = market_total / (black_mass_tonnes × 1,000)
market_usd_per_tonne = market_total / black_mass_tonnes
market_inr_per_kg = market_usd_per_kg × USD_INR
```

For **elemental lithium** the calculator converts to the theoretically corresponding quoted lithium compound:

- Battery-grade lithium carbonate (`Li₂CO₃`): `73.89 / (2 × 6.94) = ~5.323`
- Lithium hydroxide monohydrate (`LiOH·H₂O`): `41.96 / 6.94 = ~6.046`
- Anhydrous lithium hydroxide (`LiOH`): `23.95 / 6.94 = ~3.451`
- Lithium metal: `1.0`

That is a **stoichiometric equivalence for benchmark comparison**, not a demonstrated extraction yield or guaranteed amount of saleable salt. SMM and LME series also differ in terms of geography, grade, contract, quotation timing, and product; results should not be mistaken for directly executable black mass sales.

**Reality check:** Black mass is usually sold at negotiated payables after deductions, recovery factors, and assay settlement, not at the simple sum of full refined metal benchmark values. Copper/aluminium can be impurities or separate recovered streams. This calculator is a benchmarking model only.

## Deploy free to GitHub Pages

1. Create a new public GitHub repo (e.g. `indiloop-market-intelligence`).
2. Upload/push the **contents** of this folder to repo root; commit to `main`.
3. In the GitHub repository, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source.
4. Push to `main` or run **Actions → Test and deploy IndiLoop to GitHub Pages → Run workflow**.
5. The workflow runs `npm install`, unit tests and Vite build, then publishes `dist` to Pages.
6. Your URL will be `https://<github-user>.github.io/<repo-name>/`. Routes use `/#/calculator`, so browser refresh works even without a backend.

The Vite base path is derived from the repo name automatically inside GitHub Actions. There are no production `.env` variables or API secrets to configure. Automatic USD/INR fetch requires the visitor’s browser to reach `api.frankfurter.dev` (the API supports browser requests).

## Structure

```
IndiLoop-Dashboard/
├── src/
│   ├── aiPrompt.ts           # one-click AI prompt for two JSONs
│   ├── aiPrompt.test.ts      # verifies prompt schema / instructions
│   ├── exchangeRate.ts       # Frankfurter FX client, validation and conversion
│   ├── exchangeRate.test.ts  # FX API and conversion unit tests
│   ├── App.tsx               # home, dual JSON inputs, table and results
│   ├── styles.css            # original IndiLoop design + comparison additions
│   ├── domain.ts             # metal types and assay definitions
│   ├── importPrices.ts       # strict JSON import and benchmark-unit validation
│   ├── valuation.ts          # deterministic dual-market arithmetic
│   ├── examples.ts           # explicitly FICTIONAL demo and blank templates
│   ├── importPrices.test.ts  # unit tests
│   ├── valuation.test.ts     # unit tests
│   └── main.tsx              # React HashRouter
├── .github/workflows/deploy-pages.yml
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## About names, sourcing, and rights

`metal.com` is **Shanghai Metals Market (SMM)**, a price-reporting agency, **not** a "Shanghai Metal Exchange". `lme.com` is the **London Metal Exchange**. Both may have terms around redistributing published prices. This code **does not scrape their sites or ship any of their real prices**; you alone provide the numbers. The copied prompt assists research but **does not guarantee access, accuracy, or republishing rights**. Use only authorized quotations for public redistribution. Ensure you have rights to use and display third-party quotations, particularly on a public website.

## Separate recovered materials
Copper, aluminium and steel have their own weight, purity, INR/kg price and payable percentage (80% each by default). Select SMM or LME as the automatic source; if its quote is missing, manually enter INR/kg. Automatic prices follow the applied JSON and FX rate; manual overrides remain until reset to auto. The table is independent of black mass. Older six-metal JSONs remain valid. Steel is a finished-product benchmark proxy, not a scrap offer.

## V4 combined update
Market selection in Step 02 controls the research prompt, JSON import cards, comparison columns and black mass results. Both mode preserves side-by-side comparison. Switching retains imported JSON. Separate materials follow the selected market in single-market mode; in Both mode their automatic price source is selectable independently. Manual price overrides remain until reset. Black mass payable defaults to 70%; separate material payables default to 80%. GitHub Pages artifacts are uniquely named per run attempt.
