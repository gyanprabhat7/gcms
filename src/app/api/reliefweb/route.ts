import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const appname = 'individual_research_meshwa2847O6bR3z2V';
    const url = `https://api.reliefweb.int/v2/reports?appname=${appname}&limit=50&preset=latest&profile=full`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ReliefWeb API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Map ReliefWeb reports to our Incident interface
    const incidents = (data.data || []).map((report: any) => {
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
    }).filter((i: any) => i.lat !== 0 && i.lng !== 0);

    return NextResponse.json(incidents);
  } catch (error) {
    console.error('Error in ReliefWeb API route:', error);
    return NextResponse.json({ error: 'Failed to fetch ReliefWeb data' }, { status: 500 });
  }
}
