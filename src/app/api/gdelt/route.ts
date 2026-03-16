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

function getTitleFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    
    // Remove file extensions
    const slug = lastSegment.replace(/\.[^/.]+$/, "");
    
    // If slug is too short or just numbers/hashes, ignore it
    if (slug.length < 10 || /^\d+$/.test(slug)) return null;

    // Convert slug (kebab-case or snake_case) to Title Case
    return slug
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } catch {
    return null;
  }
}

function getTacticalTitle(themes: string[], location: string): string {
  if (themes.includes('TERROR')) return `Terrorist Activity Reported in ${location}`;
  if (themes.includes('KIDNAP')) return `Abduction/Kidnapping event in ${location}`;
  if (themes.includes('UNREST_CHECKPOINT')) return `Military Border Checkpoint Activity: ${location}`;
  if (themes.includes('UNREST_STONETHROWING')) return `Civil Unrest / Violent Protest in ${location}`;
  if (themes.includes('CRISISLEX_T03_FATALITIES')) return `Casualties Reported in ${location}`;
  if (themes.includes('MILITARY')) return `Military Movement / Deployment in ${location}`;
  
  return `Armed Activity / Tactical Event: ${location}`;
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
        } catch {}
      }

      const themes = (f.properties.mentionedthemes || '').split(';').filter(Boolean);
      const isConflict = themes.some((t: string) => t.includes('ARMEDCONFLICT') || t.includes('MILITARY') || t.includes('TERROR'));
      
      if (!isConflict) continue;

      // Logic: Prefer URL slug for actual headline, fallback to theme-based tactical title
      const slugTitle = url ? getTitleFromUrl(url) : null;
      const summary = slugTitle || getTacticalTitle(themes, locationName);

      const contentKey = `${url}-${summary}-${Math.round(lat * 100) / 100}-${Math.round(lng * 100) / 100}`;

      if (!seenContent.has(contentKey)) {
        seenContent.add(contentKey);
        const stableId = `gdelt-${generateStableId(contentKey)}`;
        
        incidents.push({
          id: stableId,
          lat,
          lng,
          type: themes.includes('TERROR') ? 'Terror' : 'Conflict',
          severity: themes.includes('TERROR') || themes.includes('FATALITIES') ? 85 : 70,
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