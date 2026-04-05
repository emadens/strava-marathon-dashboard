import Anthropic from '@anthropic-ai/sdk';

const PLAN_PROMPT = `Analizza questo screenshot dall'app Runna (piano di allenamento running).
Estrai i dati del piano come JSON con questa struttura esatta:
{
  "weekNumber": number | null,
  "sessions": [
    {
      "dayOfWeek": "lunedi" | "martedi" | "mercoledi" | "giovedi" | "venerdi" | "sabato" | "domenica",
      "type": "easy" | "tempo" | "interval" | "long_run" | "recovery" | "rest" | "cross_training",
      "distanceKm": number,
      "targetPaceMinKm": string | null,
      "intervals": string | null,
      "notes": string | null
    }
  ],
  "weeklyTotalKm": number
}
Se sono visibili piu' settimane, ritorna un array di oggetti settimana.
Estrai solo dati chiaramente visibili. Usa null per valori incerti.
Rispondi SOLO con il JSON, senza altro testo.`;

const SESSION_PROMPT = `Analizza questo screenshot di un dettaglio sessione dall'app Runna.
Estrai i dati come JSON con questa struttura:
{
  "sessionType": string,
  "totalDistanceKm": number,
  "segments": [
    {
      "type": "warmup" | "work" | "recovery" | "cooldown",
      "distanceKm": number | null,
      "durationMin": number | null,
      "targetPaceMinKm": string | null
    }
  ],
  "notes": string | null
}
Rispondi SOLO con il JSON, senza altro testo.`;

export async function extractTrainingPlan(imageBase64: string, mimeType: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 },
          },
          { type: 'text', text: PLAN_PROMPT },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}

export async function extractSessionDetail(imageBase64: string, mimeType: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 },
          },
          { type: 'text', text: SESSION_PROMPT },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}
