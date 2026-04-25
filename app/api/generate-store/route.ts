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

function parseGeneratedDraft(content: unknown) {
  if (!content) return null;

  if (typeof content === 'string') {
    try {
      return JSON.parse(content) as Partial<ReturnType<typeof buildFallbackDraft>>;
    } catch {
      return null;
    }
  }

  if (typeof content === 'object') {
    return content as Partial<ReturnType<typeof buildFallbackDraft>>;
  }

  return null;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const count = Number(formData.get('count') ?? 0);
  const title = String(formData.get('title') ?? '');
  const description = String(formData.get('description') ?? '');

  const endpointBase = (process.env.NVIDIA_API_URL ?? 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const apiKey = process.env.NVIDIA_API_KEY ?? process.env.NVIDIA_NIM_API_KEY ?? process.env.OPENAI_API_KEY;
  const model = process.env.NVIDIA_MODEL ?? 'z-ai/glm4.7';

  if (apiKey) {
    try {
      const payload = {
        model,
        messages: [
          {
            role: 'system',
            content:
              'You write compact JSON for luxury storefronts. Return only valid JSON with slug, title, description, price, and currency.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              count,
              title,
              description,
              instruction:
                'Create a concise, editorial storefront draft for collectible artwork. Keep the tone premium and clean.'
            })
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      };

      const response = await fetch(`${endpointBase}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: unknown } }>;
        };

        const parsed = parseGeneratedDraft(data.choices?.[0]?.message?.content);
        if (parsed) {
          const generated = buildFallbackDraft(count, parsed.title ?? title);
          return NextResponse.json({
            ...generated,
            ...parsed,
            slug: parsed.slug ?? generated.slug,
            title: parsed.title ?? generated.title,
            description: parsed.description ?? generated.description,
            price: parsed.price ?? generated.price,
            currency: parsed.currency ?? generated.currency
          });
        }
      }
    } catch {
      // fallback below
    }
  }

  return NextResponse.json(buildFallbackDraft(count, title || description));
}
