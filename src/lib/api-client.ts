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

interface ACLEDCSVRow {
  event_id_cnty: string;
  latitude: string;
  longitude: string;
  event_type: string;
  notes: string;
  location: string;
  event_date: string;
  country: string;
  fatalities: string;
  actor1: string;
  actor2: string;
}

export const fetchLiveIncidents = async (timespan: number = 1440): Promise<Incident[]> => {
  try {
    const [gdeltData, acledData, reliefWebData] = await Promise.all([
      fetchGDELTProxy(timespan),
      fetchACLEDProxy(),
      fetchReliefWebProxy()
    ]);

    return [...acledData, ...gdeltData, ...reliefWebData].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error("Error fetching live incidents:", error);
    return []; 
  }
};

async function fetchACLEDProxy(): Promise<Incident[]> {
  const res = await fetch('/api/acled');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchGDELTProxy(timespan: number): Promise<Incident[]> {
  const res = await fetch(`/api/gdelt?timespan=${timespan}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchReliefWebProxy(): Promise<Incident[]> {
  const res = await fetch('/api/reliefweb');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export const parseACLEDCSV = (csvContent: string): Incident[] => {
  const results = Papa.parse<ACLEDCSVRow>(csvContent, { header: true, skipEmptyLines: true });
  
  return results.data.map((row) => ({
    id: row.event_id_cnty || `acled-csv-${Math.random().toString(36).substring(2, 9)}`,
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
    url: `https://acleddata.com/dashboard/#/dashboard` 
  })).filter(i => !isNaN(i.lat) && !isNaN(i.lng));
};

function calculateACLEDSeverity(row: ACLEDCSVRow): number {
  let score = 50;
  const fats = parseInt(row.fatalities, 10) || 0;
  if (fats > 0) score += 15;
  if (fats > 10) score += 20;
  if (row.event_type === 'Battles' || row.event_type?.includes('Explosions')) score += 15;
  return Math.min(score, 100);
}