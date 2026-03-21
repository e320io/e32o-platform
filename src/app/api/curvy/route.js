import { NextResponse } from 'next/server';

const SUPABASE_URL = "https://fyiukqelspqdvdulczrs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aXVrcWVsc3BxZHZkdWxjenJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzUwMDAsImV4cCI6MjA4OTQ1MTAwMH0.HsZdGoLGCIbKcv3ytWTyjYrWeQ5yRJsp7O1Cj9lWO3g";

async function sbQuery(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  return res.ok ? res.json() : [];
}

async function sbPatch(table, id, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

async function sbInsert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  return res.ok ? res.json() : null;
}

export async function POST(request) {
  try {
    const { transcript, context } = await request.json();
    if (!transcript) return NextResponse.json({ error: 'No transcript' }, { status: 400 });

    // Get current state from DB for context
    const clients = await sbQuery('clients?select=id,name&is_active=eq.true');
    const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const pieces = await sbQuery(`content_pieces?select=id,title,type,status,client_id,deadline,period&period=eq.${period}`);

    // Build context for Claude
    const clientList = clients.map(c => `${c.name} (${c.id})`).join(', ');
    const statusOptions = 'pendiente, research, guion, aprobacion, grabacion, edicion, revision_cliente, publicado';
    const pieceTypes = 'reel, fast_reel, carrusel, video, imagen, gestion_ads, episodio_youtube, reel_episodio, reel_individual, reel_grabacion, reel_predica, clip_predica';

    // Summary of current pieces per client
    const summary = {};
    pieces.forEach(p => {
      const cl = clients.find(c => c.id === p.client_id);
      const name = cl?.name || 'Desconocido';
      if (!summary[name]) summary[name] = { total: 0, byStatus: {} };
      summary[name].total++;
      summary[name].byStatus[p.status] = (summary[name].byStatus[p.status] || 0) + 1;
    });

    const summaryText = Object.entries(summary).map(([name, s]) =>
      `${name}: ${s.total} piezas — ${Object.entries(s.byStatus).map(([st, n]) => `${n} en ${st}`).join(', ')}`
    ).join('\n');

    const systemPrompt = `Eres Curvy, asistente virtual de e.32o, una agencia de contenido digital en México.
Tu trabajo es interpretar instrucciones de voz del founder y convertirlas en acciones concretas sobre las piezas de contenido.

CLIENTES: ${clientList}

STATUS POSIBLES (en orden del flujo): ${statusOptions}

TIPOS DE PIEZA: ${pieceTypes}

ESTADO ACTUAL DEL MES (${period}):
${summaryText || 'Sin piezas registradas este mes.'}

PIEZAS ACTUALES:
${pieces.slice(0, 50).map(p => {
  const cl = clients.find(c => c.id === p.client_id);
  return `- "${p.title}" (${cl?.name || '?'}) → status: ${p.status} [id: ${p.id}]`;
}).join('\n')}

ACCIONES QUE PUEDES EJECUTAR:
1. "update_status" — mover piezas de un status a otro
2. "create_pieces" — crear piezas nuevas para un cliente
3. "mark_published" — marcar piezas como publicadas
4. "report" — reportar el estado actual sin hacer cambios

RESPONDE SIEMPRE EN JSON EXACTO (sin markdown, sin backticks):
{
  "action": "update_status" | "create_pieces" | "mark_published" | "report",
  "message": "Texto amigable confirmando lo que vas a hacer, en español casual",
  "operations": [
    // Para update_status:
    { "piece_id": "uuid", "new_status": "edicion", "piece_title": "nombre para confirmar" }
    // Para create_pieces:
    { "client_id": "uuid", "title": "Reel - nombre", "type": "reel", "deadline": "2026-03-25" }
    // Para mark_published:
    { "piece_id": "uuid", "publish_url": "https://...", "piece_title": "nombre" }
  ],
  "summary": "Resumen breve de lo que hiciste o encontraste"
}

Si el founder dice algo ambiguo, haz tu mejor interpretación basada en el contexto. Si dice "los 4 reels de Brillo ya están en edición", busca los reels de Brillo que estén en grabación y muévelos a edición.
Si pide un reporte, devuelve action "report" con un summary del estado actual.
Si no entiendes, devuelve action "report" con message pidiendo que repita.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: transcript }],
        system: systemPrompt,
      }),
    });

    const data = await res.json();
    const raw = data.content?.[0]?.text || '{}';

    // Parse response
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    } catch {
      return NextResponse.json({ action: 'report', message: 'No entendí bien, ¿puedes repetir?', operations: [], summary: raw });
    }

    // Execute operations
    const results = [];

    if (parsed.action === 'update_status' && parsed.operations?.length) {
      for (const op of parsed.operations) {
        try {
          await sbPatch('content_pieces', op.piece_id, { status: op.new_status });
          results.push(`✓ "${op.piece_title}" → ${op.new_status}`);
        } catch (e) {
          results.push(`✗ Error con "${op.piece_title}": ${e.message}`);
        }
      }
    }

    if (parsed.action === 'create_pieces' && parsed.operations?.length) {
      for (const op of parsed.operations) {
        try {
          const newPiece = await sbInsert('content_pieces', {
            client_id: op.client_id,
            title: op.title,
            type: op.type,
            status: 'pendiente',
            deadline: op.deadline || null,
            period,
          });
          results.push(`✓ Creada: "${op.title}"`);
        } catch (e) {
          results.push(`✗ Error creando "${op.title}": ${e.message}`);
        }
      }
    }

    if (parsed.action === 'mark_published' && parsed.operations?.length) {
      for (const op of parsed.operations) {
        try {
          await sbPatch('content_pieces', op.piece_id, {
            status: 'publicado',
            publish_url: op.publish_url || null,
          });
          results.push(`✓ Publicada: "${op.piece_title}"`);
        } catch (e) {
          results.push(`✗ Error con "${op.piece_title}": ${e.message}`);
        }
      }
    }

    return NextResponse.json({
      action: parsed.action,
      message: parsed.message,
      operations: parsed.operations || [],
      results,
      summary: parsed.summary,
    });

  } catch (err) {
    return NextResponse.json({
      action: 'report',
      message: 'Hubo un error procesando tu mensaje. Intenta de nuevo.',
      operations: [],
      results: [],
      summary: err.message,
    });
  }
}
