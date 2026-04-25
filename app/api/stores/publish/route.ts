import { NextResponse } from 'next/server';
import { buildPublishedStoreSnapshot, savePublishedStoreSnapshot } from '../../../../lib/litestore-server';
import type { StoreRecord } from '@/lib/litestore';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | (Pick<StoreRecord, 'slug' | 'title' | 'description' | 'price' | 'currency' | 'publishedAt' | 'artworks'> & { source?: 'client' | 'paystack' })
    | null;

  if (!body?.slug || !body.title || !body.description || typeof body.price !== 'number' || !body.currency) {
    return NextResponse.json({ message: 'Invalid publish payload.' }, { status: 400 });
  }

  const snapshot = buildPublishedStoreSnapshot(
    {
      slug: body.slug,
      title: body.title,
      description: body.description,
      price: body.price,
      currency: body.currency,
      publishedAt: body.publishedAt || new Date().toISOString(),
      artworks: body.artworks || []
    },
    body.source ?? 'client'
  );

  await savePublishedStoreSnapshot(snapshot);

  return NextResponse.json({
    ok: true,
    slug: snapshot.slug,
    published: true,
    publishedAt: snapshot.publishedAt
  });
}
