import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getDemoCheckoutUrl(siteUrl: string) {
  if (siteUrl.includes('localhost:3000')) {
    return 'http://localhost:3000/store/new?status=demo-checkout';
  }

  if (siteUrl.includes('litestore-eight.vercel.app')) {
    return 'https://litestore-eight.vercel.app/store/new?status=demo-checkout';
  }

  return `${siteUrl}/store/new?status=demo-checkout`;
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
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || getDemoCheckoutUrl(siteUrl);

  if (endpoint && secretKey && body.email && body.amount) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secretKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: body.email,
          amount: Math.round(body.amount * 100),
          currency: body.currency || 'NGN',
          callback_url: callbackUrl,
          metadata: {
            slug: body.slug,
            title: body.title,
            source: 'litestore'
          }
        })
      });

      if (response.ok) {
        const data = (await response.json()) as { data?: { authorization_url?: string } };
        const authorizationUrl = data.data?.authorization_url;
        if (authorizationUrl) {
          return NextResponse.json({ authorization_url: authorizationUrl });
        }
      }
    } catch {
      // fall through to demo redirect
    }
  }

  return NextResponse.json({
    authorization_url: callbackUrl,
    message: 'Paystack env vars were not available, so a demo checkout URL was returned.'
  });
}
