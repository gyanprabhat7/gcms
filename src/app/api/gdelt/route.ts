import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GDELT_API = "https://api.gdeltproject.org/api/v1/gkg_geojson?QUERY=ARMEDCONFLICT&TIMESPAN=1440";

export async function GET() {
  try {
    // Disable caching for live data
    const res = await fetch(GDELT_API, { cache: 'no-store' });
    const data = await res.json();
    
    if (!data.features) return NextResponse.json([]);

    const seenContent = new Set();
    const incidents = [];

    for (let i = 0; i < data.features.length; i++) {
      const f = data.features[i];
      const locationName = f.properties.name || "Unknown Location";
      const url = f.properties.url;
      const lat = f.geometry.coordinates[1];
      const lng = f.geometry.coordinates[0];
      
      let summary = locationName;
      let sourceName = "GDELT";

      if (url) {
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          sourceName = domain.toUpperCase();
        } catch (e) {}
      }

      if (f.properties.mentionedthemes) {
        const themes = f.properties.mentionedthemes.split(';').filter(Boolean);
        if (themes.length > 0) {
          const mainTheme = themes[0].replace(/_/g, ' ');
          summary = `${mainTheme} reported in ${locationName}`;
        }
      }

      // Create a key for content deduplication (URL + Summary + rounded coordinates)
      // We round coordinates slightly to merge very close points if they are from the same article
      const contentKey = `${url}-${summary}-${Math.round(lat * 100) / 100}-${Math.round(lng * 100) / 100}`;

      if (!seenContent.has(contentKey)) {
        seenContent.add(contentKey);
        
        incidents.push({
          id: `gdelt-v1-${url || 'no-url'}-${lat}-${lng}-${i}`,
          lat,
          lng,
          type: 'Conflict',
          severity: 50,
          summary: summary,
          source: sourceName,
          timestamp: f.properties.urlpubtimedate || new Date().toISOString(),
          country: locationName,
          url: url
        });
      }
    }

    return NextResponse.json(incidents);
  } catch (e) {
    console.warn("GDELT proxy fetch failed", e);
    return NextResponse.json([]);
  }
}
