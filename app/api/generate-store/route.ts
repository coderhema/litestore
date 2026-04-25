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
    new RegExp(String.raw`(?:^|[\n,])\s*["']?${key}["']?\s*:\s*["']([^"']+)["']`, 'i'),
    new RegExp(String.raw`(?:^|[\n,])\s*["']?${key}["']?\s*=\s*["']([^"']+)["']`, 'i'),
    new RegExp(String.raw`(?:^|[\n,])\s*["']?${key}["']?\s*:\s*([^\n,}]+)`, 'i'),
    new RegExp(String.raw`(?:^|[\n,])\s*["']?${key}["']?\s*=\s*([^\n,}]+)`, 'i')
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
    new RegExp(String.raw`(?:^|[\n,])\s*["']?${key}["']?\s*:\s*([0-9]+(?:\.[0-9]+)?)`, 'i'),
    new RegExp(String.raw`(?:^|[\n,])\s*["']?${key}["']?\s*=\s*([0-9]+(?:\.[0-9]+)?)`, 'i')
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
  const generationMode = String(formData.get('generationMode') ?? 'generate');
  const redraftIntent = String(formData.get('redraftIntent') ?? '').trim();
  const draftTitle = String(formData.get('draftTitle') ?? title);
  const draftDescription = String(formData.get('draftDescription') ?? description);
  const draftPrice = Number(formData.get('draftPrice') ?? 0);
  const draftSlug = String(formData.get('draftSlug') ?? '');

  const endpointBase = (process.env.NVIDIA_API_URL ?? 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const apiKey = process.env.NVIDIA_API_KEY ?? process.env.NVIDIA_NIM_API_KEY ?? process.env.OPENAI_API_KEY;
  const model = process.env.NVIDIA_TEXT_MODEL ?? process.env.NVIDIA_MODEL ?? 'meta/llama-3.1-8b-instruct';

  if (apiKey) {
    try {
      const promptContext = {
        count,
        title,
        description,
        requirements,
        setupMode,
        generationMode,
        redraftIntent,
        draftTitle,
        draftDescription,
        draftPrice,
        draftSlug,
        artDirection: 'premium, minimal, gallery-grade, modern, high-conviction, commercially clear'
      };

      const payload = {
        model,
        messages: [
          {
            role: 'system',
            content:
              generationMode === 'redraft'
                ? 'You are a luxury brand director and storefront editor. Transform an existing storefront into a meaningfully improved version. Return only valid JSON with slug, title, description, price, and currency. No prose, no markdown, no explanation. Change the name, structure, and wording when needed to make the storefront feel more premium, more specific, and more commercially credible. Do not lightly paraphrase the existing draft. Reimagine it when that improves the result. Keep the output concise and usable.'
                : 'You are a luxury brand director and storefront copywriter. Rewrite raw notes into a high-taste storefront concept. Return only valid JSON with slug, title, description, price, and currency. No prose, no markdown, no explanation. Make the name feel premium, specific, and collectible. Make the description concise, editorial, and confident. Avoid generic AI phrasing, filler words, and overexplaining. If the input is vague, invent a tasteful concept that still matches the brief. Prefer polished, commercially usable names and structure over literal rewrites.'
          },
          {
            role: 'user',
            content:
              generationMode === 'redraft'
                ? `Redraft this storefront into a clearly improved version. Respect the user's intent and change the weak parts rather than echoing them back. If the prompt suggests a better concept, name, or price point, use it.\n\n${JSON.stringify({
                    ...promptContext,
                    instruction:
                      'Create a noticeably better storefront draft. Improve the positioning, tighten the description, and choose a stronger title and slug. Keep the final result premium and minimal, but not generic.'
                  })}`
                : `Transform this brief into a polished storefront draft:\n\n${JSON.stringify({
                    ...promptContext,
                    instruction:
                      'Create a concise, editorial storefront draft for collectible artwork. Keep the tone premium and clean. Use the requirements to shape the brand voice, title, description, and pricing.'
                  })}`
          }
        ],
        temperature: generationMode === 'redraft' ? 0.75 : 0.5,
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
          const baseTitle = generationMode === 'redraft' ? draftTitle || title : title;
          const baseDescription = generationMode === 'redraft' ? draftDescription || description : description;
          const generated = buildFallbackDraft(count, parsed.title ?? baseTitle, parsed.description ?? baseDescription);
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

  const fallbackTitle = generationMode === 'redraft' ? draftTitle || title : title;
  const fallbackDescription = generationMode === 'redraft' ? draftDescription || description : description;
  const fallback = buildFallbackDraft(count, fallbackTitle, fallbackDescription);

  return NextResponse.json({
    ...fallback,
    slug: draftSlug ? slugify(draftSlug) : fallback.slug
  });
}
