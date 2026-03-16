import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch source: ${response.statusText}`);
    }

    const html = await response.text();
    
    // 1. Aggressive removal of non-content blocks
    let processed = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gms, '')
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gms, '')
      .replace(/<header\b[^>]*>([\s\S]*?)<\/header>/gms, '')
      .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gms, '')
      .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gms, '')
      .replace(/<aside\b[^>]*>([\s\S]*?)<\/aside>/gms, '')
      .replace(/<form\b[^>]*>([\s\S]*?)<\/form>/gms, '');

    // 2. Map structural tags to newlines and strip all remaining HTML
    processed = processed
      .replace(/<(p|div|h[1-6]|li|tr|br|section|article)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '') 
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"');

    // 3. Clean and filter lines
    const noisePatterns = [
      /skip to/i, /show caption/i, /read more/i, /subscriber partnership/i,
      /exclusive subscriber/i, /not necessarily reflect/i, /view the gallery/i,
      /all rights reserved/i, /copyright/i, /terms and conditions/i, /privacy policy/i,
      /follow us on/i, /sign up to/i, /advertisement/i, /loading navigation/i
    ];

    const finalLines = processed
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (line.length < 10) return false;
        // Filter out social media handles/signatures
        if (line.startsWith('— ') || line.includes('@')) {
           if (line.length < 100 && (line.includes(') ') || line.includes('—'))) return false;
        }
        return !noisePatterns.some(pattern => pattern.test(line));
      });

    const cleanText = finalLines.join('\n\n').replace(/\n{3,}/g, '\n\n');

    return NextResponse.json({ 
      content: cleanText.slice(0, 10000) || 'No readable content extracted.',
      length: cleanText.length
    });
  } catch (error) {
    console.error('Classic fetch extraction failed:', error);
    return NextResponse.json({ error: 'Failed to fetch raw intel' }, { status: 500 });
  }
}
