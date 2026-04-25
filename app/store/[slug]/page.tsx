import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StorefrontClient } from '@/components/litestore/storefront-client';
import { demoStore } from '@/lib/litestore';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = slug === demoStore.slug ? demoStore.title : 'Storefront';

  return {
    title: `${title} | Litestore`,
    description: 'A public storefront for collectible artwork prints.'
  };
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  return <StorefrontClient slug={slug} />;
}
