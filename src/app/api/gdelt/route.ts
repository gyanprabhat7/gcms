import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GDELT_BASE = "https://api.gdeltproject.org/api/v1/gkg_geojson";
const RELIEF_WEB_API = "https://api.reliefweb.int/v1/reports?appname=individual_research_meshwa2847O6bR3z2V&filter[field]=theme&filter[value]=Conflict&limit=50";

// Server-side cooldown for GDELT (5s rate limit)
let lastGdeltFetch = 0;
const GDELT_COOLDOWN = 5500; // 5.5s safety buffer

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const timespan = searchParams.get('timespan') || '1440'; // Default 24h
  
  try {
    const now = Date.now();
    let gdeltFeatures = [];

    // 1. Fetch GDELT if cooled down
    if (now - lastGdeltFetch > GDELT_COOLDOWN) {
      const themes = ['ARMEDCONFLICT', 'TERROR', 'PROTEST'];
      const themeRequests = themes.map(theme => 
        fetch(`${GDELT_BASE}?QUERY=${theme}&TIMESPAN=${timespan}`, { next: { revalidate: 0 } })
          .then(res => res.json())
          .catch(() => ({ features: [] }))
      );
      const results = await Promise.all(themeRequests);
      gdeltFeatures = results.flatMap(d => d.features || []);
      lastGdeltFetch = now;
    }

    // 2. Fetch ReliefWeb
    const rwRes = await fetch(RELIEF_WEB_API, { next: { revalidate: 3600 } });
    const rwData = await rwRes.json();
    const rwIncidents = (rwData.data || []).map((item: any) => ({
      id: `rw-${item.id}`,
      lat: 0, // ReliefWeb requires individual lookups for coords, using 0 as placeholder for list
      lng: 0,
      type: 'Humanitarian',
      severity: 60,
      summary: item.fields.title,
      source: 'RELIEFWEB',
      timestamp: new Date().toISOString(),
      country: 'Global',
      url: item.href
    }));

    // 3. Map GDELT to internal format
    const incidents = gdeltFeatures.map((f: any, i: number) => {
      const loc = f.properties.name || "Unknown";
      const url = f.properties.url;
      const themes = (f.properties.mentionedthemes || '').split(';').filter(Boolean);
      
      let type = 'Conflict';
      if (themes.some((t: string) => t.includes('PROTEST'))) type = 'Protest';
      if (themes.some((t: string) => t.includes('TERROR'))) type = 'Terror';

      return {
        id: `gdelt-v1-${url || 'no-url'}-${f.geometry.coordinates[1]}-${f.geometry.coordinates[0]}-${i}`,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        type,
        severity: 50,
        summary: loc, // Default summary
        source: url ? new URL(url).hostname.replace('www.', '').toUpperCase() : 'GDELT',
        timestamp: f.properties.urlpubtimedate || new Date().toISOString(),
        country: loc,
        url: url
      };
    });

    return NextResponse.json([...incidents, ...rwIncidents]);
  } catch (e) {
    console.error("Master fetch failed", e);
    return NextResponse.json([]);
  }
}
