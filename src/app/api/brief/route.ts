import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { THERON_BRIEF_SYSTEM_PROMPT, buildBriefPrompt, CountryBriefData } from '@/lib/theron';

interface BriefIncident {
  summary: string;
  type: string;
  severity: number;
  url?: string;
}

interface BriefCountry {
  name: string;
  incidents: BriefIncident[];
}

async function scrapeArticle(url: string, origin: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/api/intel/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content || null;
  } catch {
    return null;
  }
}

async function translateText(text: string, origin: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/api/intel/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 3000) }), // Cap to avoid token overflow
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.translatedText || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { countries, baseUrl, model, apiKey } = await request.json() as {
      countries: BriefCountry[];
      baseUrl?: string;
      model?: string;
      apiKey?: string;
    };

    const origin = new URL(request.url).origin;

    // Phase 1: Scrape & translate — process articles with a concurrency limit
    // Combined articles into one list for optimized worker-style processing
    const allIncidents = countries.flatMap(c => 
      c.incidents.map(inc => ({ ...inc, countryName: c.name }))
    );

    const concurrencyLimit = 5;
    const enrichedResults: (BriefIncident & { countryName: string; scrapedContent?: string; translatedContent?: string })[] = [];
    
    // Simple worker queue to process articles in parallel but with a limit
    const processQueue = async (items: typeof allIncidents) => {
      const workers = [];
      const queue = [...items];
      
      const worker = async () => {
        while (queue.length > 0) {
          const inc = queue.shift();
          if (!inc) break;

          let scrapedContent: string | null = null;
          let translatedContent: string | null = null;

          if (inc.url) {
            scrapedContent = await scrapeArticle(inc.url, origin);
            if (scrapedContent) {
              translatedContent = await translateText(scrapedContent, origin);
            }
            // Add a random jitter delay (500ms - 1500ms) to bypass basic bot detection
            const jitter = 500 + Math.random() * 1000;
            await new Promise(r => setTimeout(r, jitter));
          }

          enrichedResults.push({
            ...inc,
            scrapedContent: scrapedContent || undefined,
            translatedContent: translatedContent || undefined,
          });
        }
      };

      for (let i = 0; i < concurrencyLimit; i++) {
        workers.push(worker());
      }
      await Promise.all(workers);
    };

    await processQueue(allIncidents);

    // Group back by country
    const enrichedCountries: CountryBriefData[] = countries.map(c => ({
      name: c.name,
      incidents: enrichedResults.filter(r => r.countryName === c.name).map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { countryName, ...rest } = r;
        return rest;
      })
    }));

    // Phase 2: Build prompt and send to AI
    const briefPrompt = buildBriefPrompt(enrichedCountries);

    const client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || 'no-key',
      baseURL: baseUrl || process.env.NEXT_PUBLIC_CHAT_BASE_URL || 'https://api.openai.com/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://gcms.app',
        'X-Title': 'GCMS Tactical AI',
      },
    });

    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: THERON_BRIEF_SYSTEM_PROMPT },
        { role: 'user', content: briefPrompt },
      ],
      model: model || process.env.NEXT_PUBLIC_CHAT_MODEL || 'gpt-4o-mini',
      max_tokens: 4096,
    });

    const report = completion.choices[0].message.content;

    return NextResponse.json({ report, countriesAnalyzed: enrichedCountries.length });
  } catch (error) {
    console.error('Brief Generation Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Brief generation failed: ${msg}` }, { status: 500 });
  }
}
