import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const PARSE_PROMPT = `Sei un assistente che struttura piani di allenamento running.

L'utente ti fornira' il testo di un piano di allenamento (estratto da screenshot dell'app Runna o simili).
Il piano puo' coprire molte settimane.

Analizza il testo e restituisci un JSON con questa struttura ESATTA:

{
  "weeks": [
    {
      "weekNumber": 1,
      "sessions": [
        {
          "dayOfWeek": "lunedi",
          "type": "easy" | "tempo" | "interval" | "long_run" | "recovery" | "rest" | "cross_training",
          "distanceKm": 8.0,
          "targetPaceMinKm": "5:30" | null,
          "intervals": "6x800m @ 4:15" | null,
          "notes": "qualsiasi nota" | null
        }
      ],
      "weeklyTotalKm": 45.0
    }
  ]
}

Regole:
- dayOfWeek DEVE essere in italiano minuscolo: lunedi, martedi, mercoledi, giovedi, venerdi, sabato, domenica
- type DEVE essere uno dei valori elencati
- Se un giorno non ha allenamento, mettilo come type "rest" con distanceKm 0
- weeklyTotalKm e' la somma dei km di tutte le sessioni della settimana
- Se il testo e' ambiguo, fai del tuo meglio e metti note per i punti incerti
- Se la distanza non e' specificata ma c'e' un tempo, stima i km in base al ritmo se possibile
- Rispondi SOLO con il JSON, nessun altro testo`;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurata' }, { status: 500 });
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json({ error: 'Testo troppo corto o mancante' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000, // 33 weeks can be large
      messages: [
        { role: 'user', content: `${PARSE_PROMPT}\n\n---\n\nEcco il testo del piano:\n\n${text}` },
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const usage = response.usage;
    const cost = (usage.input_tokens / 1_000_000) * 0.80 + (usage.output_tokens / 1_000_000) * 4.0;

    // Try to parse the JSON
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from the response if it has surrounding text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Risposta non valida dal modello. Riprova.', raw: responseText }, { status: 500 });
      }
    }

    return NextResponse.json({
      data: parsed,
      usage: { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, cost },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore parsing piano' },
      { status: 500 }
    );
  }
}
