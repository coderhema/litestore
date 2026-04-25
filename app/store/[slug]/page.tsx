import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StorefrontClient } from '@/components/litestore/storefront-client';
import { demoStore, type StoreRecord } from '@/lib/litestore';
import { getPublishedStoreSnapshot, snapshotToStoreRecord } from '@/lib/litestore-server';

export const dynamic = 'force-dynamic';

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

  const publishedSnapshot = await getPublishedStoreSnapshot(slug);
  const initialStore: StoreRecord | null = publishedSnapshot
    ? snapshotToStoreRecord(publishedSnapshot)
    : demoStore.slug === slug
      ? demoStore
      : null;

  return <StorefrontClient slug={slug} initialStore={initialStore} />;
}
