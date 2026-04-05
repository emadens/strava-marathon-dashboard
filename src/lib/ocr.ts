import Anthropic from '@anthropic-ai/sdk';

// Claude Haiku pricing (per 1M tokens)
const INPUT_PRICE_PER_M = 0.80;  // $0.80/M input tokens
const OUTPUT_PRICE_PER_M = 4.0;  // $4/M output tokens

/**
 * Estimate the cost of analyzing an image with Claude Vision.
 * Image tokens are roughly: (width * height) / 750 for high-res,
 * plus ~280 tokens base. A typical phone screenshot is ~1170x2532 = ~3950 tokens.
 * We add prompt tokens (~300) and output tokens (~500 estimate).
 */
export function estimateOCRCost(fileSizeBytes: number): { tokens: number; cost: number } {
  // Rough estimate: image tokens scale with file size
  // A 500KB JPEG screenshot ~ 4000 image tokens
  // A 2MB PNG screenshot ~ 8000 image tokens
  const imageTokens = Math.round(Math.max(1000, (fileSizeBytes / 1024) * 8));
  const promptTokens = 350; // system prompt
  const outputTokens = 600; // estimated JSON response

  const inputTokens = imageTokens + promptTokens;
  const cost = (inputTokens / 1_000_000) * INPUT_PRICE_PER_M + (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M;

  return { tokens: inputTokens + outputTokens, cost };
}

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
    model: 'claude-haiku-4-5-20251001',
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
  const usage = response.usage;
  const actualCost = (usage.input_tokens / 1_000_000) * INPUT_PRICE_PER_M + (usage.output_tokens / 1_000_000) * OUTPUT_PRICE_PER_M;

  return { data: JSON.parse(text), usage: { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, cost: actualCost } };
}

export async function extractSessionDetail(imageBase64: string, mimeType: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
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
  const usage2 = response.usage;
  const actualCost2 = (usage2.input_tokens / 1_000_000) * INPUT_PRICE_PER_M + (usage2.output_tokens / 1_000_000) * OUTPUT_PRICE_PER_M;

  return { data: JSON.parse(text), usage: { inputTokens: usage2.input_tokens, outputTokens: usage2.output_tokens, cost: actualCost2 } };
}
