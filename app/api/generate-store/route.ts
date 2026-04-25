import { NextResponse } from 'next/server';
import { slugify } from '@/lib/litestore';

export const runtime = 'nodejs';

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 75000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function buildFallbackDraft(count: number, title?: string, description?: string) {
  const basis = title?.trim() || description?.trim() || 'Untitled collection';
  return {
    slug: slugify(basis),
    title: basis,
    description:
      description?.trim() ||
      (count > 1
        ? `A refined collection of ${count} artworks presented as a premium storefront for collectors.`
        : 'A refined single-artwork storefront designed to feel editorial and exclusive.'),
    price: count > 3 ? 220 : count > 1 ? 180 : 140,
    currency: 'NGN'
  };
}

function stripJsonFences(content: string) {
  return content.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

function extractTextField(candidate: string, key: string) {
  const patterns = [
    new RegExp(`(?:^|[\n,])\s*["']?${key}["']?\s*:\s*["']([^"']+)["']`, 'i'),
    new RegExp(`(?:^|[\n,])\s*["']?${key}["']?\s*=\s*["']([^"']+)["']`, 'i'),
    new RegExp(`(?:^|[\n,])\s*["']?${key}["']?\s*:\s*([^\n,}]+)`, 'i'),
    new RegExp(`(?:^|[\n,])\s*["']?${key}["']?\s*=\s*([^\n,}]+)`, 'i')
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(candidate);
    if (match?.[1]) {
      return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  return undefined;
}

function extractNumberField(candidate: string, key: string) {
  const patterns = [
    new RegExp(`(?:^|[\n,])\s*["']?${key}["']?\s*:\s*([0-9]+(?:\.[0-9]+)?)`, 'i'),
    new RegExp(`(?:^|[\n,])\s*["']?${key}["']?\s*=\s*([0-9]+(?:\.[0-9]+)?)`, 'i')
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(candidate);
    if (match?.[1]) return Number(match[1]);
  }

  return undefined;
}

function parseDraftFields(raw: string) {
  const cleaned = stripJsonFences(raw);
  const candidate = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;

  const partial = {
    slug: extractTextField(candidate, 'slug'),
    title: extractTextField(candidate, 'title'),
    description: extractTextField(candidate, 'description'),
    price: extractNumberField(candidate, 'price'),
    currency: extractTextField(candidate, 'currency')
  };

  return Object.values(partial).some((value) => value !== undefined && value !== '') ? partial : null;
}

function parseGeneratedDraft(content: unknown) {
  if (!content) return null;

  if (typeof content === 'object') {
    return content as Partial<ReturnType<typeof buildFallbackDraft>>;
  }

  if (typeof content === 'string') {
    const cleaned = stripJsonFences(content);

    try {
      return JSON.parse(cleaned) as Partial<ReturnType<typeof buildFallbackDraft>>;
    } catch {
      try {
        const candidate = cleaned.match(/\{[\s\S]*\}/)?.[0];
        if (candidate) {
          return JSON.parse(candidate) as Partial<ReturnType<typeof buildFallbackDraft>>;
        }
      } catch {
        // fall through
      }

      return parseDraftFields(cleaned);
    }
  }

  return null;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const count = Number(formData.get('count') ?? 0);
  const title = String(formData.get('title') ?? '');
  const description = String(formData.get('description') ?? '');
  const requirements = String(formData.get('requirements') ?? description);
  const setupMode = String(formData.get('setupMode') ?? 'chat');

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
              'You are a luxury brand director and storefront copywriter. Rewrite raw notes into a high-taste storefront concept. Return only valid JSON with slug, title, description, price, and currency. No prose, no markdown, no explanation. Make the name feel premium, specific, and collectible. Make the description concise, editorial, and confident. Avoid generic AI phrasing, filler words, and overexplaining. If the input is vague, invent a tasteful concept that still matches the brief.'
          },
          {
            role: 'user',
            content: `Transform this brief into a polished storefront draft:\n\n${JSON.stringify({
              count,
              title,
              description,
              requirements,
              setupMode,
              artDirection: 'premium, minimal, gallery-grade, modern, high-conviction, commercially clear',
              outputRequirements: {
                slug: 'short kebab-case slug',
                title: 'better than the raw input',
                description: '1-2 sentences that feel editorial and high-end',
                price: 'a sensible integer price in NGN unless the prompt clearly implies otherwise',
                currency: 'use NGN unless the user asked for another currency'
              }
            })}`
          }
        ],
        temperature: 0.5,
        max_tokens: 360,
        response_format: { type: 'json_object' }
      };

      const response = await fetchWithTimeout(`${endpointBase}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = (await response.json().catch(async () => JSON.parse(await response.text()))) as {
          choices?: Array<{ message?: { content?: unknown } }>;
        };

        const parsed = parseGeneratedDraft(data.choices?.[0]?.message?.content);
        if (parsed) {
          const generated = buildFallbackDraft(count, parsed.title ?? title, parsed.description ?? description);
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
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      if (timedOut) {
        return NextResponse.json({ message: 'Store generation timed out.' }, { status: 504 });
      }
    }
  }

  return NextResponse.json(buildFallbackDraft(count, title, description));
}
