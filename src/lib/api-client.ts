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
export const fetchLiveIncidents = async (): Promise<Incident[]> => {
  try {
    const [gdeltData, acledData] = await Promise.all([
      fetchGDELTProxy(),
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

async function fetchGDELTProxy(): Promise<Incident[]> {
  try {
    const res = await fetch('/api/gdelt');
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch (e) {
    console.warn("GDELT Proxy fetch failed.", e);
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