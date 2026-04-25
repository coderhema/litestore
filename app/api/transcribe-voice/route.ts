import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Audio file is required.' }, { status: 400 });
  }

  const apiKey = process.env.NVIDIA_API_KEY ?? process.env.NVIDIA_NIM_API_KEY ?? process.env.OPENAI_API_KEY;
  const endpointBase = (process.env.NVIDIA_API_URL ?? 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const model = process.env.NVIDIA_STT_MODEL ?? 'whisper-large-v3';

  if (!apiKey) {
    return NextResponse.json({ message: 'Missing NVIDIA_API_KEY for voice transcription.' }, { status: 500 });
  }

  try {
    const payload = new FormData();
    payload.append('file', file, file.name || 'voice.webm');
    payload.append('model', model);

    const response = await fetch(`${endpointBase}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      body: payload
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json(
        { message: message || 'Voice transcription failed.' },
        { status: response.status }
      );
    }

    const data = (await response.json()) as { text?: string };
    return NextResponse.json({ text: data.text ?? '' });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Voice transcription failed.' },
      { status: 500 }
    );
  }
}
