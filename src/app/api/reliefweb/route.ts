import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const appname = process.env.RELIEFWEB_APP_NAME;
    if (!appname) throw new Error('RELIEFWEB_APP_NAME is not set in environment variables.');
    const url = `https://api.reliefweb.int/v2/reports?appname=${appname}&limit=50&preset=latest&profile=full`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ReliefWeb API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    interface ReliefWebReport {
      id: number;
      fields: {
        primary_country?: {
          name: string;
          location?: { lat: number; lon: number };
        };
        format?: { name: string }[];
        title: string;
        headline?: { title: string };
        date: { created: string; changed: string };
        url: string;
      };
    }

    // Map ReliefWeb reports to our Incident interface
    const incidents = (data.data || []).map((report: ReliefWebReport) => {
      const fields = report.fields;
      
      // Verified structure: fields.primary_country.location.lat/lon
      const primaryCountry = fields.primary_country;
      
      return {
        id: report.id.toString(),
        lat: primaryCountry?.location?.lat || 0,
        lng: primaryCountry?.location?.lon || 0,
        type: fields.format?.[0]?.name || 'Humanitarian Report',
        severity: fields.headline ? 85 : 45, // Higher severity for headlines
        summary: fields.title,
        source: 'ReliefWeb',
        timestamp: fields.date.created || fields.date.changed,
        country: primaryCountry?.name || 'Unknown',
        url: fields.url,
      };
    }).filter((i: { lat: number; lng: number }) => i.lat !== 0 && i.lng !== 0);

    return NextResponse.json(incidents);
  } catch (error) {
    console.error('Error in ReliefWeb API route:', error);
    return NextResponse.json({ error: 'Failed to fetch ReliefWeb data' }, { status: 500 });
  }
}
