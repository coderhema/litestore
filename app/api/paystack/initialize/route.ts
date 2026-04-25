import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

  const slug = body.slug || 'demo-store';
  return NextResponse.json({
    authorization_url: `${siteUrl}/store/${slug}?status=demo-checkout`,
    message: 'Paystack env vars were not available, so a demo checkout URL was returned.'
  });
}
