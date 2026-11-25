export const sampleJSON = (market: 'smm' | 'lme', today = new Date()): string => {
  const price_date = today.toISOString().slice(0, 10);
  const isSmm = market === 'smm';
  // FICTIONAL values, deliberately not copied from either pricing provider.
  const prices = isSmm ? [
    { metal: 'Lithium', benchmark: 'Battery-grade lithium carbonate', price: 14000 },
    { metal: 'Nickel', benchmark: 'Nickel cathode metal', price: 19000 },
    { metal: 'Cobalt', benchmark: 'Cobalt metal', price: 35000 },
    { metal: 'Manganese', benchmark: 'Electrolytic manganese metal', price: 2200 },
    { metal: 'Copper', benchmark: 'Copper cathode metal', price: 11000 },
    { metal: 'Aluminium', benchmark: 'Aluminium ingot metal', price: 2800 },
    { metal: 'Steel', benchmark: 'Steel finished product', price: null },
  ] : [
    { metal: 'Lithium', benchmark: 'LME Lithium Hydroxide Monohydrate CIF (Fastmarkets)', price: 15500 },
    { metal: 'Nickel', benchmark: 'LME Nickel metal', price: 18500 },
    { metal: 'Cobalt', benchmark: 'LME Cobalt metal', price: 34500 },
    { metal: 'Manganese', benchmark: 'Not an LME metal contract benchmark', price: null },
    { metal: 'Copper', benchmark: 'LME Copper Grade A metal', price: 10500 },
    { metal: 'Aluminium', benchmark: 'LME Aluminium metal', price: 2750 },
    { metal: 'Steel', benchmark: 'LME Steel finished product', price: null },
  ];
  return JSON.stringify({
    source: isSmm ? 'FICTIONAL SMM SAMPLE - NOT LIVE' : 'FICTIONAL LME SAMPLE - NOT LIVE',
    price_date, currency: 'USD', unit: 'metric_tonne', prices,
  }, null, 2);
};
export const blankTemplate = (market: 'smm' | 'lme', today = new Date()): string => {
  const template = JSON.parse(sampleJSON(market, today));
  template.source = market === 'smm' ? 'Shanghai Metals Market (SMM)' : 'London Metal Exchange (LME)';
  template.prices = template.prices.map((p: {price: number | null}) => ({...p, price: null}));
  return JSON.stringify(template, null, 2);
};
