export type ArtworkAsset = {
  id: string;
  name: string;
  src: string;
};

export type StoreRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  artworks: ArtworkAsset[];
  testimonial: string;
  artistName: string;
  publishedAt: string;
};

export type GeneratedStoreDraft = {
  slug: string;
  title: string;
  description: string;
  price: number;
  currency: string;
};

export const MAX_ARTWORKS = 5;
export const MIN_ARTWORKS = 1;

export const demoStore: StoreRecord = {
  id: 'demo-aurora-lane',
  slug: 'aurora-lane',
  title: 'Aurora Lane',
  description:
    'A quiet, gallery-like storefront for limited prints, sculptural posters, and collectible artwork drops.',
  price: 140,
  currency: 'NGN',
  artworks: [
    {
      id: 'demo-1',
      name: 'Midnight Bloom',
      src:
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'demo-2',
      name: 'Paper Light',
      src:
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'demo-3',
      name: 'Warm Frame',
      src:
        'https://images.unsplash.com/photo-1459908676235-d5f02a50184b?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  testimonial: 'It feels like a premium drop page instead of a generic store.',
  artistName: 'Naomi Adebayo',
  publishedAt: new Date('2026-04-01T10:00:00.000Z').toISOString()
};

export const landingStats = [
  { label: 'Artwork uploads', value: '1–5 images' },
  { label: 'Checkout', value: 'Paystack' },
  { label: 'Share loop', value: 'One-click publish' }
];

export const landingTestimonials = [
  {
    quote:
      'Litestore turns a simple collection into a premium storefront that feels like a curated launch.',
    name: 'Collector note',
    role: 'Independent buyer'
  },
  {
    quote:
      'The flow is clean: upload, generate, edit, publish, then share. It removes the busywork.',
    name: 'Maker note',
    role: 'Digital artist'
  },
  {
    quote:
      'Dark, elegant, and direct. It looks closer to a luxury drop than a software demo.',
    name: 'Studio note',
    role: 'Creative director'
  }
];

export const storefrontHighlights = [
  'Limited edition print runs',
  'Fast Paystack checkout',
  'Mobile-first gallery layout'
];

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'new-drop';
}

export function createStoreId() {
  return `store-${crypto.randomUUID()}`;
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function buildShareText(store: Pick<StoreRecord, 'title'> & { id?: string; slug?: string }) {
  const identifier = store.id ?? store.slug ?? 'new-drop';
  return `I just published ${store.title} on Litestore: /store/${identifier}`;
}

export function storeStorageKey(identifier: string) {
  return `litestore:store:${identifier}`;
}

export function publishedStoresKey() {
  return 'litestore:published-stores';
}

export function shareLinks(url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} is live on Litestore`);

  return {
    copyText: `${title} is live on Litestore — ${url}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title} is live on Litestore\n\n${url}`)}`
  };
}

export function buildDemoPublishedStore(title: string, description: string, price: number, artworks: ArtworkAsset[]): StoreRecord {
  const resolvedTitle = title.trim() || demoStore.title;
  return {
    id: createStoreId(),
    slug: slugify(resolvedTitle),
    title: resolvedTitle,
    description: description.trim() || demoStore.description,
    price,
    currency: 'NGN',
    artworks: artworks.length ? artworks : demoStore.artworks,
    testimonial: 'A beautiful balance of editorial presentation and easy purchasing.',
    artistName: 'Published with Litestore',
    publishedAt: new Date().toISOString()
  };
}
