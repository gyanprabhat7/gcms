import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    const textToTranslate = text.slice(0, 1500);
    const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(textToTranslate));
    
    const rawText = await res.text();
    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ 
        translatedText: text + '\n\n[TRANSLATION UNAVAILABLE: UPSTREAM RATE LIMIT REACHED]' 
      });
    }

    if (!res.ok) {
      throw new Error(`Upstream API error: ${res.status}`);
    }
    
    const translatedText = data[0].map((item: [string]) => item[0]).join('');

    return NextResponse.json({ 
      translatedText: translatedText + (text.length > 1500 ? '\n\n[TRUNCATED FOR TRANSLATION LIMITS]' : '') 
    });
  } catch (error) {
    console.error('Translation failed:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}