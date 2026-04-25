import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function extractTranscript(payload: unknown): string {
  if (!payload) return '';

  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (typeof payload !== 'object') {
    return '';
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.text, record.transcript, record.transcription, record.output_text];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  const choices = Array.isArray(record.choices) ? record.choices : null;
  if (choices?.length) {
    const choice = choices[0] as Record<string, unknown>;
    const message = choice.message as Record<string, unknown> | undefined;
    const nested = [choice.text, message?.content, choice.transcript, choice.transcription];
    for (const candidate of nested) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
  }

  const segments = Array.isArray(record.segments) ? record.segments : null;
  if (segments?.length) {
    const combined = segments
      .map((segment) => {
        if (typeof segment === 'string') return segment.trim();
        if (segment && typeof segment === 'object' && 'text' in segment) {
          const textValue = (segment as { text?: unknown }).text;
          return typeof textValue === 'string' ? textValue.trim() : '';
        }
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .trim();

    if (combined) return combined;
  }

  return '';
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Audio file is required.' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ message: 'Audio file is empty.' }, { status: 400 });
  }

  const apiKey = process.env.NVIDIA_API_KEY ?? process.env.NVIDIA_NIM_API_KEY ?? process.env.OPENAI_API_KEY;
  const endpointBase = (process.env.NVIDIA_API_URL ?? 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const model = process.env.NVIDIA_STT_MODEL ?? process.env.NVIDIA_VOICE_MODEL ?? 'whisper-large-v3';

  if (!apiKey) {
    return NextResponse.json({ message: 'Missing NVIDIA_API_KEY for voice transcription.' }, { status: 500 });
  }

  try {
    const payload = new FormData();
    payload.append('file', file, file.name || 'voice.webm');
    payload.append('model', model);

    const response = await fetchWithTimeout(`${endpointBase}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: 'application/json'
      },
      body: payload
    });

    const rawText = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { message: rawText || 'Voice transcription failed.' },
        { status: response.status }
      );
    }

    let parsed: unknown = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        parsed = rawText;
      }
    }

    return NextResponse.json({ text: extractTranscript(parsed ?? rawText) });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json(
      { message: timedOut ? 'Voice transcription timed out.' : error instanceof Error ? error.message : 'Voice transcription failed.' },
      { status: timedOut ? 504 : 500 }
    );
  }
}
