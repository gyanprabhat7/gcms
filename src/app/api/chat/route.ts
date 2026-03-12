import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a military intelligence AI assistant. Keep answers concise, tactical, and focused on geopolitical risks. Use NATO terminology where appropriate." },
        { role: "user", content: message }
      ],
      model: "gpt-4o-mini",
    });

    return NextResponse.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Chat Error:', error);
    return NextResponse.json({ reply: "Secure Uplink Failed. Check API Configuration." }, { status: 500 });
  }
}
