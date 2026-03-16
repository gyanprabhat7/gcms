import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { incident } = await request.json();
    const summary = (incident.summary || '').toUpperCase();
    const country = (incident.country || '').toUpperCase();
    const severity = incident.severity || 50;

    // Local Heuristic Rules Engine (Simulating Pattern Recognition)
    const impacts = [];

    // 1. Energy Sector Logic
    const oilProducers = ['IRAN', 'RUSSIA', 'SAUDI ARABIA', 'IRAQ', 'KUWAIT', 'UAE', 'USA', 'VENEZUELA', 'NIGERIA', 'LIBYA'];
    const isOilRegion = oilProducers.some(p => country.includes(p));
    const mentionsEnergy = summary.includes('OIL') || summary.includes('GAS') || summary.includes('ENERGY') || summary.includes('TANKER') || summary.includes('STRAIT');

    if (isOilRegion || mentionsEnergy) {
      impacts.push({
        asset: "BRENT CRUDE",
        ticker: "BZ=F",
        prediction: "BULLISH",
        change: severity > 70 ? "+4.2%" : "+1.8%",
        reason: `Geopolitical risk in ${country} threatening supply lines.`
      });
    }

    // 2. Safe Haven Logic (Gold)
    if (severity > 60) {
      impacts.push({
        asset: "GOLD",
        ticker: "GC=F",
        prediction: "BULLISH",
        change: severity > 85 ? "+2.1%" : "+0.5%",
        reason: "Risk-off sentiment driving flight to safe-haven assets."
      });
    }

    // 3. Currency / Forex Logic
    if (country.includes('USA') || summary.includes('USA') || summary.includes('TRUMP') || summary.includes('BIDEN')) {
      impacts.push({
        asset: "US DOLLAR INDEX",
        ticker: "DX=F",
        prediction: "BULLISH",
        change: "+0.4%",
        reason: "Geopolitical instability boosting USD liquidity demand."
      });
    } else if (country.includes('EUROPE') || country.includes('UKRAINE')) {
      impacts.push({
        asset: "EUR/USD",
        ticker: "EURUSD=X",
        prediction: "BEARISH",
        change: "-0.6%",
        reason: "Regional instability weighing on Eurozone economic outlook."
      });
    }

    // 4. Tech / Semiconductor (Taiwan/China focus)
    if (country.includes('TAIWAN') || country.includes('CHINA') || summary.includes('CHIP') || summary.includes('SEMICONDUCTOR')) {
      impacts.push({
        asset: "SOX SEMICONDUCTOR",
        ticker: "SOXX",
        prediction: "BEARISH",
        change: "-3.2%",
        reason: "Supply chain disruption risks in critical tech hub."
      });
    }

    // Fallback if no specific rules matched
    if (impacts.length === 0) {
      impacts.push({
        asset: "S&P 500 VIX",
        ticker: "^VIX",
        prediction: "BULLISH",
        change: "+5.4%",
        reason: "General increase in market volatility due to global incident."
      });
    }

    return NextResponse.json(impacts.slice(0, 3));
  } catch (error) {
    console.error('Economic Analysis Error:', error);
    return NextResponse.json({ error: "Analysis Failed" }, { status: 500 });
  }
}
