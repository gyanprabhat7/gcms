import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Apple) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edge/121.0.0.0'
];

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    let response: Response | null = null;
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        response = await fetch(url, {
          headers: {
            'User-Agent': randomUA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          next: { revalidate: 3600 }
        });

        if (response.ok) break;
        if (response.status === 403 || response.status === 429) {
          // Wait longer on rate limits
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        break; // Other errors don't retry for now
    } catch (err) {
      lastError = err as Error;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    }

    if (!response || !response.ok) {
        throw new Error(`Failed to fetch: ${response?.status || lastError?.message || 'Unknown error'}`);
    }

    const html = await response.text();
    
    // Strip <style> and <link> tags from the raw HTML string before giving it to JSDOM.
    // This prevents fatal CSS parsing crashes (e.g. TypeError: Cannot create property 'border-width') 
    // when JSDOM encounters malformed external stylesheets or inline blocks.
    const cleanHtml = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                          .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '');

    // Create a virtual DOM, but disable scripts and stylesheets to prevent parser crashes
    // on malformed external CSS blocks (e.g. TypeError: Cannot create property 'border-width').
    const dom = new JSDOM(cleanHtml, { url });
    
    // Use Mozilla Readability to extract the core content
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.content) {
      return NextResponse.json({ 
        content: 'No readable content could be extracted from this source.',
        length: 0
      });
    }

    // Convert the extracted HTML to Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      hr: '---'
    });

    // Remove unwanted elements from the Markdown conversion if needed
    turndownService.remove(['script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav', 'aside']);

    let markdown = turndownService.turndown(article.content);

    // Clean up excessive newlines
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

    // Check for blocking messages
    if (markdown.includes('Enable JavaScript and cookies to continue') || markdown.includes('Just a moment...')) {
      markdown = "SECURE CONNECTION BLOCKED: Target server requires JavaScript/Captcha validation. Cannot extract raw intel automatically.\n\nPlease use the 'View Original Source' button.";
    }

    return NextResponse.json({ 
      content: markdown,
      title: article.title,
      length: markdown.length
    });
  } catch (error) {
    console.error('Intel fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch and process intel' }, { status: 500 });
  }
}
