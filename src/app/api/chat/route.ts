import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { THERON_SYSTEM_PROMPT } from '@/lib/theron';

export async function POST(request: Request) {
  try {
    const { message, conversationHistory = [], baseUrl, model, apiKey } = await request.json();

    // Create a dynamic client per-request to support custom endpoints (Ollama, LM Studio, OpenRouter, etc.)
    // Fallback chain: request body → .env → hardcoded default
    const resolvedBaseUrl = baseUrl || process.env.NEXT_PUBLIC_CHAT_BASE_URL || 'https://api.openai.com/v1';
    const client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || 'no-key',
      baseURL: resolvedBaseUrl,
      defaultHeaders: {
        'HTTP-Referer': 'https://gcms.app',
        'X-Title': 'GCMS Tactical AI',
      },
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: THERON_SYSTEM_PROMPT },
      // Cap at 10 prior turns to keep context manageable
      ...conversationHistory.slice(-10),
      { role: 'user', content: message },
    ];

    const completion = await client.chat.completions.create({
      messages,
      model: model || process.env.NEXT_PUBLIC_CHAT_MODEL || 'gpt-4o-mini',
    });

    return NextResponse.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Chat Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ reply: `Secure Uplink Failed: ${msg}` }, { status: 500 });
  }
}
