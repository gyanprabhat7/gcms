import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    // In a real production scenario, you would use a paid API like Google Cloud Translation
    // or a free alternative like LibreTranslate. 
    // For this prototype, we'll use a public-access translation endpoint.
    const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(text));
    const data = await res.json();
    
    // Extract translated text from Google's response format
    const translatedText = data[0].map((item: any) => item[0]).join('');

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation failed:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
