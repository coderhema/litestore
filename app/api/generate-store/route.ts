import { NextResponse } from 'next/server';
import { slugify } from '@/lib/litestore';

export const runtime = 'nodejs';

function buildFallbackDraft(count: number, title?: string) {
  const basis = title?.trim() || 'Untitled collection';
  return {
    slug: slugify(basis),
    title: basis,
    description:
      count > 1
        ? `A refined collection of ${count} artworks presented as a premium storefront for collectors.`
        : 'A refined single-artwork storefront designed to feel editorial and exclusive.',
    price: count > 3 ? 220 : count > 1 ? 180 : 140,
    currency: 'NGN'
  };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const count = Number(formData.get('count') ?? 0);
  const title = String(formData.get('title') ?? '');
  const description = String(formData.get('description') ?? '');

  const endpoint = process.env.OPENAI_GENERATE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (endpoint && apiKey) {
    try {
      const payload = {
        model,
        count,
        title,
        description,
        instruction:
          'Return JSON with slug, title, description, price, and currency for a luxury artwork storefront. Keep the output concise and editorial.'
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = (await response.json()) as Partial<ReturnType<typeof buildFallbackDraft>>;
        const generated = buildFallbackDraft(count, data.title ?? title);
        return NextResponse.json({
          ...generated,
          ...data,
          slug: data.slug ?? generated.slug,
          title: data.title ?? generated.title,
          description: data.description ?? generated.description,
          price: data.price ?? generated.price,
          currency: data.currency ?? generated.currency
        });
      }
    } catch {
      // fallback below
    }
  }

  return NextResponse.json(buildFallbackDraft(count, title || description));
}
