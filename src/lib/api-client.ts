import Papa from 'papaparse';

export interface Incident {
  id: string;
  lat: number;
  lng: number;
  type: string;
  severity: number;
  summary: string;
  source: string;
  timestamp: string;
  country: string;
  url?: string;
  fatalities?: number;
  notes?: string;
  actor1?: string;
  actor2?: string;
}

// STRICT: English only, high-confidence conflict events, last 24h
const GDELT_API = "https://api.gdeltproject.org/api/v2/geo/geo?query=theme:ARMEDCONFLICT sourcelang:eng&format=geojson&timespan=24h";

export const fetchLiveIncidents = async (): Promise<Incident[]> => {
  try {
    const [gdeltData, acledData] = await Promise.all([
      fetchGDELT(),
      fetchACLEDProxy()
    ]);

    // Combine and Sort by most recent
    return [...acledData, ...gdeltData].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error("Error fetching live incidents:", error);
    return []; // RETURN EMPTY if fail. No fake data.
  }
};

async function fetchACLEDProxy(): Promise<Incident[]> {
  try {
    const res = await fetch('/api/acled');
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error || !Array.isArray(data)) return [];
    return data;
  } catch (e) {
    console.warn("ACLED Proxy fetch failed.", e);
    return []; // No simulation fallback
  }
}

async function fetchGDELT(): Promise<Incident[]> {
  try {
    const res = await fetch(GDELT_API);
    const data = await res.json();
    
    if (!data.features) return [];

    return data.features.map((f: any) => {
      // GDELT GeoJSON 'name' is often the location/country.
      const locationName = f.properties.name || "Unknown Location";
      
      // Extract summary and URL from HTML snippet
      let summary = locationName;
      let url = f.properties.url; // Default URL
      let sourceName = "GDELT";

      if (f.properties.html) {
        // Extract Title
        const titleMatch = f.properties.html.match(/title="([^"]+)"/);
        if (titleMatch) summary = titleMatch[1];
        
        // Extract URL (Robust)
        const urlMatch = f.properties.html.match(/href="([^"]+)"/);
        if (urlMatch) url = urlMatch[1];

        // Attempt to extract domain as source name
        if (url) {
          try {
            const domain = new URL(url).hostname.replace('www.', '');
            sourceName = domain.toUpperCase();
          } catch (e) {}
        }
      }

      // Filter out non-English looking summaries (heuristic) if API filter leaks
      // (Simple check: if contains mostly non-ascii, skip? GDELT API 'sourcelang:eng' usually handles this)

      return {
        id: `gdelt-${f.properties.url || Math.random().toString(36).substr(2, 9)}`,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        type: 'Conflict',
        severity: 50, // Baseline for GDELT
        summary: summary,
        source: sourceName,
        timestamp: new Date().toISOString(),
        country: locationName,
        url: url
      };
    });
  } catch (e) {
    console.warn("GDELT fetch failed", e);
    return [];
  }
}

export const parseACLEDCSV = (csvContent: string): Incident[] => {
  const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  
  return results.data.map((row: any) => ({
    id: row.event_id_cnty || `acled-${Math.random()}`,
    lat: parseFloat(row.latitude),
    lng: parseFloat(row.longitude),
    type: row.event_type || 'Conflict',
    severity: calculateACLEDSeverity(row),
    summary: row.notes || `${row.event_type} in ${row.location}`,
    source: `ACLED`,
    timestamp: row.event_date || new Date().toISOString(),
    country: row.country,
    fatalities: parseInt(row.fatalities, 10) || 0,
    notes: row.notes,
    actor1: row.actor1,
    actor2: row.actor2,
    url: `https://acleddata.com/dashboard/#/dashboard` // Fallback for CSV
  })).filter(i => !isNaN(i.lat) && !isNaN(i.lng));
};

function calculateACLEDSeverity(row: any): number {
  let score = 50;
  const fats = parseInt(row.fatalities, 10) || 0;
  if (fats > 0) score += 15;
  if (fats > 10) score += 20;
  if (row.event_type === 'Battles' || row.event_type?.includes('Explosions')) score += 15;
  return Math.min(score, 100);
}