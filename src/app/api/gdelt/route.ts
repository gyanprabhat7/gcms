import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const THEMES = ['ARMEDCONFLICT'];
const BASE_URL = "https://api.gdeltproject.org/api/v1/gkg_geojson";

function generateStableId(str: string) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timespan = searchParams.get('timespan') || '1440'; 

    const themeRequests = THEMES.map(theme => 
      fetch(`${BASE_URL}?QUERY=${theme}&TIMESPAN=${timespan}`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(err => {
          console.error(`Failed to fetch theme ${theme}`, err);
          return { features: [] };
        })
    );

    const results = await Promise.all(themeRequests);
    const allFeatures = results.flatMap(data => data.features || []);
    
    if (allFeatures.length === 0) return NextResponse.json([]);

    const seenContent = new Set();
    const incidents = [];

    for (let i = 0; i < allFeatures.length; i++) {
      const f = allFeatures[i];
      const locationName = f.properties.name || "Unknown Location";
      const url = f.properties.url;
      const lat = f.geometry.coordinates[1];
      const lng = f.geometry.coordinates[0];
      
      let sourceName = "GDELT";
      if (url) {
        try {
          sourceName = new URL(url).hostname.replace('www.', '').toUpperCase();
        } catch {
          // Fallback to default
        }
      }

      const themes = (f.properties.mentionedthemes || '').split(';').filter(Boolean);
      const isConflict = themes.some((t: string) => t.includes('ARMEDCONFLICT') || t.includes('MILITARY'));
      
      if (!isConflict) continue;

      const summary = `Armed conflict / Kinetic event reported in ${locationName}`;
      const contentKey = `${url}-${summary}-${Math.round(lat * 100) / 100}-${Math.round(lng * 100) / 100}`;

      if (!seenContent.has(contentKey)) {
        seenContent.add(contentKey);
        const stableId = `gdelt-${generateStableId(contentKey)}`;
        
        incidents.push({
          id: stableId,
          lat,
          lng,
          type: 'Conflict',
          severity: 70,
          summary: summary,
          source: sourceName,
          timestamp: f.properties.urlpubtimedate || new Date().toISOString(),
          country: locationName,
          url: url
        });
      }
    }

    incidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return NextResponse.json(incidents);
  } catch (e) {
    console.warn("GDELT proxy fetch failed", e);
    return NextResponse.json([]);
  }
}