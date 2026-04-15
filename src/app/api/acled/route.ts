import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ACLED_EMAIL = process.env.ACLED_EMAIL;
const ACLED_KEY = process.env.ACLED_KEY;

const EVENT_TYPE_MAP: Record<string, string> = {
  'Battles': 'Conflict',
  'Explosions/Remote violence': 'Air',
  'Violence against civilians': 'Terror',
  'Protests': 'Protest',
  'Riots': 'Conflict',
  'Strategic developments': 'Movement'
};

interface ACLEDRawEvent {
  event_id_cnty: string;
  latitude: string;
  longitude: string;
  event_type: string;
  notes: string;
  source: string;
  event_date: string;
  country: string;
  fatalities: string;
  location: string;
}

export async function GET() {
  let incidents = [];
  
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `https://acleddata.com/api/acled/read?email=${encodeURIComponent(ACLED_EMAIL || '')}&key=${encodeURIComponent(ACLED_KEY || '')}&event_date=${startDate}|${endDate}&event_date_where=BETWEEN&limit=100`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      incidents = data.data.map((event: ACLEDRawEvent) => ({
        id: event.event_id_cnty,
        lat: parseFloat(event.latitude),
        lng: parseFloat(event.longitude),
        type: EVENT_TYPE_MAP[event.event_type] || 'Other',
        severity: calculateSeverity(event),
        summary: event.notes || `${event.event_type} reported in ${event.location}.`,
        source: `ACLED (${event.source})`,
        timestamp: event.event_date,
        country: event.country,
        fatalities: parseInt(event.fatalities, 10) || 0,
        url: `https://acleddata.com/dashboard/#/dashboard`
      }));
    }
  } catch (e) {
    console.error('ACLED Route Error:', e);
  }

  return NextResponse.json(incidents);
}

function calculateSeverity(event: ACLEDRawEvent): number {
  let score = 50;
  const fatalities = parseInt(event.fatalities, 10) || 0;
  if (fatalities > 0) score += 10;
  if (fatalities > 10) score += 20;
  if (fatalities > 50) score += 20;
  if (event.event_type === 'Explosions/Remote violence') score += 15;
  if (event.event_type === 'Battles') score += 10;
  if (event.event_type === 'Violence against civilians') score += 25;
  return Math.min(score, 100);
}