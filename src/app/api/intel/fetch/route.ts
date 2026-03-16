import { NextResponse } from 'next/server';

function decodeHTMLEntities(text: string): string {
  if (!text) return '';

  const entities: Record<string, string> = {
    '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
    '&apos;': "'", '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"',
    '&mdash;': '-', '&ndash;': '-', '&hellip;': '...',
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
    '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
    '&atilde;': 'ã', '&otilde;': 'õ', '&Atilde;': 'Ã', '&Otilde;': 'Õ',
    '&acirc;': 'â', '&ecirc;': 'ê', '&icirc;': 'î', '&ocirc;': 'ô', '&ucirc;': 'û',
    '&Agrave;': 'À', '&Egrave;': 'È', '&Igrave;': 'Ì', '&Ograve;': 'Ò', '&Ugrave;': 'Ù',
    '&agrave;': 'à', '&egrave;': 'è', '&igrave;': 'ì', '&ograve;': 'ò', '&ugrave;': 'ù',
    '&ccedil;': 'ç', '&Ccedil;': 'Ç', '&ntilde;': 'ñ', '&Ntilde;': 'Ñ',
    '&auml;': 'ä', '&euml;': 'ë', '&iuml;': 'ï', '&ouml;': 'ö', '&uuml;': 'ü',
    '&deg;': '°', '&copy;': '©', '&reg;': '®', '&trade;': '™',
    '&laquo;': '«', '&raquo;': '»', '&iexcl;': '¡', '&iquest;': '¿'
  };

  return text
    .replace(/&#(\d+);/g, (_, dec) => {
      const char = String.fromCharCode(dec);
      // Special handling for smart quotes if charCode doesn't match directly
      if (dec === 8217 || dec === 8216) return "'";
      if (dec === 8220 || dec === 8221) return '"';
      return char;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&[a-z0-9]+;/gi, (match) => {
      return entities[match] || match;
    });
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    
    // REMOVED 's' flag to fix ts(1501). [\\s\\S] already handles multiline.
    let processed = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
      .replace(/<header\b[^>]*>([\s\S]*?)<\/header>/gm, '')
      .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gm, '')
      .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gm, '')
      .replace(/<aside\b[^>]*>([\s\S]*?)<\/aside>/gm, '');

    processed = processed
      .replace(/<(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '); 

    processed = decodeHTMLEntities(processed);

    const cleanText = processed
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');

    const filteredLines = cleanText.split('\n\n').filter(para => {
      return para.length > 40 || (para.length > 10 && !para.includes('|'));
    });

    let finalContent = filteredLines.join('\n\n').slice(0, 8000);

    if (finalContent.includes('Enable JavaScript and cookies to continue') || finalContent.includes('Just a moment...')) {
      finalContent = "SECURE CONNECTION BLOCKED: Target server requires JavaScript/Captcha validation. Cannot extract raw intel automatically.\n\nPlease use the 'View Original Source' button.";
    }

    return NextResponse.json({ 
      content: finalContent || 'No readable content extracted.',
      length: finalContent.length
    });
  } catch (error) {
    console.error('Intel fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch raw intel' }, { status: 500 });
  }
}