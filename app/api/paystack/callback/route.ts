import { NextResponse } from 'next/server';
import { demoStore } from '@/lib/litestore';
import { getPublishedStoreSnapshot, markPublishedStoreVerified } from '../../../../lib/litestore-server';

export const runtime = 'nodejs';

const CANONICAL_SITE_URL = 'https://litestore-eight.vercel.app';

function resolveSiteUrl(siteUrl?: string) {
  if (!siteUrl || siteUrl.includes('localhost:3000')) return siteUrl || CANONICAL_SITE_URL;
  if (siteUrl.includes('litestore-eight.vercel.app')) return CANONICAL_SITE_URL;
  return siteUrl;
}

function buildStorefrontUrl(siteUrl: string, slug: string, status: 'success' | 'demo-checkout' | 'failed' = 'success') {
  const encodedSlug = encodeURIComponent(slug || demoStore.slug);
  return new URL(`/store/${encodedSlug}?status=${status}&store=${encodedSlug}`, siteUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || url.searchParams.get('store') || demoStore.slug;
  const reference = url.searchParams.get('reference') || url.searchParams.get('trxref') || '';
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_SITE_URL);
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const isDemo = url.searchParams.get('demo') === '1' || !secretKey;

  if (isDemo) {
    const existing = await getPublishedStoreSnapshot(slug);
    await markPublishedStoreVerified(slug, reference || `demo-${slug}`, {
      slug,
      title: existing?.title || demoStore.title,
      description: existing?.description || demoStore.description,
      price: existing?.price || demoStore.price,
      currency: existing?.currency || demoStore.currency,
      publishedAt: existing?.publishedAt || demoStore.publishedAt,
      artworkCount: existing?.artworkCount || demoStore.artworks.length,
      artworkNames: existing?.artworkNames || demoStore.artworks.map((artwork) => artwork.name)
    });

    return NextResponse.redirect(buildStorefrontUrl(siteUrl, slug, 'demo-checkout'), { status: 302 });
  }

  if (!reference) {
    return NextResponse.redirect(buildStorefrontUrl(siteUrl, slug, 'failed'), { status: 302 });
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        authorization: `Bearer ${secretKey}`,
        'content-type': 'application/json'
      }
    });

    const payload = (await response.json().catch(async () => JSON.parse(await response.text()))) as {
      data?: {
        status?: string;
        reference?: string;
        metadata?: {
          slug?: string;
          title?: string;
          description?: string;
          amount?: number;
          currency?: string;
        };
      };
      message?: string;
    };

    const verified = response.ok && payload.data?.status === 'success';
    const resolvedSlug = payload.data?.metadata?.slug || slug;
    const existing = await getPublishedStoreSnapshot(resolvedSlug);

    if (!verified || !existing) {
      return NextResponse.redirect(buildStorefrontUrl(siteUrl, resolvedSlug, 'failed'), { status: 302 });
    }

    await markPublishedStoreVerified(resolvedSlug, payload.data?.reference || reference, {
      slug: resolvedSlug,
      title: existing.title,
      description: existing.description,
      price: existing.price,
      currency: existing.currency,
      publishedAt: existing.publishedAt,
      artworkCount: existing.artworkCount,
      artworkNames: existing.artworkNames
    });

    return NextResponse.redirect(buildStorefrontUrl(siteUrl, resolvedSlug, 'success'), { status: 302 });
  } catch {
    return NextResponse.redirect(buildStorefrontUrl(siteUrl, slug, 'failed'), { status: 302 });
  }
}
