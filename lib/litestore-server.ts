import { demoStore, type ArtworkAsset, type StoreRecord } from '@/lib/litestore';

export type PublishedStoreSnapshot = {
  slug: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  publishedAt: string;
  artworkCount: number;
  artworkNames: string[];
  status: 'published' | 'verified';
  source: 'client' | 'paystack';
  paymentReference?: string;
  verifiedAt?: string;
};

type KvConfig = {
  baseUrl: string;
  token: string;
};

const memoryStore = globalThis as typeof globalThis & {
  __litestoreSnapshots?: Map<string, PublishedStoreSnapshot>;
};

function getMemoryStore() {
  if (!memoryStore.__litestoreSnapshots) {
    memoryStore.__litestoreSnapshots = new Map<string, PublishedStoreSnapshot>();
  }

  return memoryStore.__litestoreSnapshots;
}

function getKvConfig(): KvConfig | null {
  const baseUrl = process.env.KV_REST_API_URL?.replace(/\/+$/, '');
  const token = process.env.KV_REST_API_TOKEN;

  if (!baseUrl || !token) return null;

  return { baseUrl, token };
}

function snapshotKey(slug: string) {
  return `litestore:published:${slug}`;
}

async function kvRequest(path: string, init?: RequestInit) {
  const config = getKvConfig();
  if (!config) return null;

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  return response;
}

export function buildPublishedStoreSnapshot(store: Pick<StoreRecord, 'slug' | 'title' | 'description' | 'price' | 'currency' | 'publishedAt' | 'artworks'>, source: PublishedStoreSnapshot['source'] = 'client'): PublishedStoreSnapshot {
  return {
    slug: store.slug,
    title: store.title,
    description: store.description,
    price: store.price,
    currency: store.currency,
    publishedAt: store.publishedAt,
    artworkCount: store.artworks.length,
    artworkNames: store.artworks.map((artwork) => artwork.name),
    status: 'published',
    source
  };
}

export function snapshotToStoreRecord(snapshot: PublishedStoreSnapshot): StoreRecord {
  const artworkNames = snapshot.artworkNames.length ? snapshot.artworkNames : demoStore.artworks.map((artwork) => artwork.name);
  const artworkAssets: ArtworkAsset[] = demoStore.artworks.map((artwork, index) => ({
    id: `${snapshot.slug}-${index}`,
    name: artworkNames[index] ?? artwork.name,
    src: artwork.src
  }));

  return {
    id: `store-${snapshot.slug}`,
    slug: snapshot.slug,
    title: snapshot.title,
    description: snapshot.description,
    price: snapshot.price,
    currency: snapshot.currency,
    artworks: artworkAssets.length ? artworkAssets : demoStore.artworks,
    testimonial: snapshot.source === 'paystack' ? 'Checkout verified by Paystack.' : 'A premium storefront generated from your brief.',
    artistName: snapshot.source === 'paystack' ? 'Litestore checkout mode' : 'Published with Litestore',
    publishedAt: snapshot.verifiedAt ?? snapshot.publishedAt
  };
}

export async function getPublishedStoreSnapshot(slug: string) {
  const key = snapshotKey(slug);

  try {
    const response = await kvRequest(`/get/${encodeURIComponent(key)}`);
    if (response?.ok) {
      const payload = (await response.json().catch(async () => JSON.parse(await response.text()))) as { result?: string | null };
      if (payload?.result) {
        return JSON.parse(payload.result) as PublishedStoreSnapshot;
      }
    }
  } catch {
    // fall through to memory store
  }

  return getMemoryStore().get(slug) ?? null;
}

export async function savePublishedStoreSnapshot(snapshot: PublishedStoreSnapshot) {
  getMemoryStore().set(snapshot.slug, snapshot);

  const config = getKvConfig();
  if (!config) return snapshot;

  try {
    await kvRequest(`/set/${encodeURIComponent(snapshotKey(snapshot.slug))}/${encodeURIComponent(JSON.stringify(snapshot))}`, {
      method: 'POST'
    });
  } catch {
    // persist in memory only when KV is unavailable
  }

  return snapshot;
}

export async function markPublishedStoreVerified(slug: string, reference: string, metadata?: Partial<PublishedStoreSnapshot>) {
  const existing = (await getPublishedStoreSnapshot(slug)) ?? {
    slug,
    title: metadata?.title ?? demoStore.title,
    description: metadata?.description ?? demoStore.description,
    price: metadata?.price ?? demoStore.price,
    currency: metadata?.currency ?? demoStore.currency,
    publishedAt: metadata?.publishedAt ?? new Date().toISOString(),
    artworkCount: metadata?.artworkCount ?? demoStore.artworks.length,
    artworkNames: metadata?.artworkNames ?? demoStore.artworks.map((artwork) => artwork.name),
    status: 'published' as const,
    source: 'paystack' as const
  };

  return await savePublishedStoreSnapshot({
    ...existing,
    ...metadata,
    slug: metadata?.slug ?? existing.slug,
    status: 'verified',
    source: 'paystack',
    paymentReference: reference,
    verifiedAt: new Date().toISOString()
  });
}
