import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { incident } = await request.json();

    const prompt = `
      Analyze the economic impact of this conflict event:
      Country: ${incident.country}
      Summary: ${incident.summary}
      Severity: ${incident.severity}

      Identify 3 specific financial assets (Commodities, Forex, or Indices) that would be most affected.
      Return ONLY a JSON array with this format:
      [
        { "asset": "BRENT CRUDE", "ticker": "CO1:COM", "prediction": "BULLISH", "change": "+2.5%", "reason": "Supply chain disruption risk in region." },
        { "asset": "GOLD", "ticker": "XAU", "prediction": "BULLISH", "change": "+1.2%", "reason": "Safe haven flight." }
      ]
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a Wall Street quantitative analyst specializing in geopolitical risk. Be concise and cynical." },
        { role: "user", content: prompt }
      ],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Economic Analysis Error:', error);
    return NextResponse.json({ error: "Analysis Failed" }, { status: 500 });
  }
}
