import { NextResponse } from 'next/server';
export async function POST(request) {
  try {
    const { clientName, industry, audience } = await request.json();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: `Copywriter Meta Ads México. Headline (8 palabras) + texto (2-3 líneas, emoji, "→ Escríbenos por WhatsApp"). Negocio: ${clientName}, Industria: ${industry}, Audiencia: ${audience}. JSON: {"headline":"...","primaryText":"..."}` }] }),
    });
    const data = await res.json();
    return NextResponse.json(JSON.parse(data.content?.[0]?.text || '{}'));
  } catch { return NextResponse.json({ headline: "Tu mejor versión empieza aquí", primaryText: "Descubre lo que tenemos para ti. ✨\n\n→ Escríbenos por WhatsApp" }); }
}
