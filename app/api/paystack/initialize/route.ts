import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type CheckoutStatus = 'success' | 'demo-checkout';

function buildCheckoutReturnUrl(siteUrl: string, slug: string, status: CheckoutStatus) {
  const safeSlug = slug || 'new';
  const encodedSlug = encodeURIComponent(safeSlug);

  if (siteUrl.includes('localhost:3000')) {
    return `http://localhost:3000/store/${encodedSlug}?status=${status}&store=${encodedSlug}`;
  }

  if (siteUrl.includes('litestore-eight.vercel.app')) {
    return `https://litestore-eight.vercel.app/store/${encodedSlug}?status=${status}&store=${encodedSlug}`;
  }

  return `${siteUrl}/store/${encodedSlug}?status=${status}&store=${encodedSlug}`;
}

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    amount?: number;
    currency?: string;
    slug?: string;
    title?: string;
  };

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const endpoint = process.env.PAYSTACK_INITIALIZE_URL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const demoCallbackUrl = buildCheckoutReturnUrl(siteUrl, body.slug || 'new', 'demo-checkout');
  const successReturnUrl = buildCheckoutReturnUrl(siteUrl, body.slug || 'new', 'success');

  if (endpoint && secretKey && body.email && body.amount) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secretKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: body.email,
          amount: Math.round(body.amount * 100),
          currency: body.currency || 'NGN',
          callback_url: successReturnUrl,
          metadata: {
            slug: body.slug,
            title: body.title,
            source: 'litestore'
          }
        })
      });

      if (response.ok) {
        const data = (await response.json().catch(async () => JSON.parse(await response.text()))) as { data?: { authorization_url?: string } };
        const authorizationUrl = data.data?.authorization_url;
        if (authorizationUrl) {
          return NextResponse.json({
            authorization_url: authorizationUrl,
            callback_url: successReturnUrl,
            checkout_status: 'success' as CheckoutStatus,
            message: 'Paystack checkout initialized.'
          });
        }

        return NextResponse.json({ message: 'Paystack did not return an authorization URL.' }, { status: 502 });
      }

      const message = await response.text();
      return NextResponse.json({ message: message || 'Paystack checkout failed.' }, { status: response.status });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      return NextResponse.json(
        { message: timedOut ? 'Paystack checkout timed out.' : 'Paystack checkout failed.' },
        { status: timedOut ? 504 : 502 }
      );
    }
  }

  return NextResponse.json({
    authorization_url: demoCallbackUrl,
    callback_url: demoCallbackUrl,
    checkout_status: 'demo-checkout' as CheckoutStatus,
    message: 'Demo checkout ready.'
  });
}
