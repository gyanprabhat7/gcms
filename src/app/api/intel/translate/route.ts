import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    // Split text into paragraphs (or standard single line breaks)
    const paragraphs = text.split(/\n\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    // Group paragraphs into chunks of ~1200 characters to stay safely under URI limits
    for (const paragraph of paragraphs) {
      if ((currentChunk + '\n\n' + paragraph).length > 1200) {
        if (currentChunk) chunks.push(currentChunk);
        
        // If a single paragraph is still huge, it will be its own chunk.
        // We could split that further, but for most markdown it will suffice.
        currentChunk = paragraph;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    let fullTranslatedText = '';

    for (const chunk of chunks) {
      const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(chunk));

      if (!res.ok) {
        // If one chunk fails, just append an error tag and stop processing the rest
        fullTranslatedText += '\n\n[TRANSLATION ERROR: UPSTREAM API FAILED]';
        break;
      }

      const rawText = await res.text();
      let data;

      try {
        data = JSON.parse(rawText);
      } catch {
        fullTranslatedText += '\n\n[TRANSLATION UNAVAILABLE: UPSTREAM RATE LIMIT REACHED]';
        break;
      }

      // data[0] is an array of translation segments [translatedSegment, originalSegment, ...]
      const translatedChunk = data[0].map((item: [string]) => item[0]).join('');
      fullTranslatedText += (fullTranslatedText ? '\n\n' : '') + translatedChunk;
    }

    return NextResponse.json({
      translatedText: fullTranslatedText
    });
  } catch (error) {
    console.error('Translation failed:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}