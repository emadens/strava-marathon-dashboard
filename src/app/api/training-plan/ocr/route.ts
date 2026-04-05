import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { extractTrainingPlan, extractSessionDetail, estimateOCRCost } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurata' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const type = formData.get('type') as string || 'plan';
    const estimateOnly = formData.get('estimate_only') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Nessuna immagine caricata' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo file non supportato. Usa JPG, PNG, GIF o WebP.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File troppo grande (max 10MB)' }, { status: 400 });
    }

    // Estimate-only mode: return cost without calling API
    if (estimateOnly) {
      const estimate = estimateOCRCost(file.size);
      return NextResponse.json({ estimate });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const result = type === 'session'
      ? await extractSessionDetail(base64, file.type)
      : await extractTrainingPlan(base64, file.type);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore elaborazione immagine' },
      { status: 500 }
    );
  }
}
