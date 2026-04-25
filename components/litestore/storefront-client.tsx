'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Copy } from 'iconoir-react';
import {
  demoStore,
  formatCurrency,
  publishedStoresKey,
  shareLinks,
  storefrontHighlights,
  storeStorageKey,
  type StoreRecord
} from '@/lib/litestore';

async function readStore(slug: string) {
  if (typeof window === 'undefined') return null;
  const direct = localStorage.getItem(storeStorageKey(slug));
  if (direct) return JSON.parse(direct) as StoreRecord;

  const published = JSON.parse(localStorage.getItem(publishedStoresKey()) || '[]') as string[];
  if (published.includes(slug)) {
    const fallback = localStorage.getItem(storeStorageKey(slug));
    if (fallback) return JSON.parse(fallback) as StoreRecord;
  }

  if (demoStore.slug === slug) return demoStore;
  return null;
}

export function StorefrontClient({ slug }: { slug: string }) {
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [email, setEmail] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    readStore(slug)
      .then((value) => {
        if (mounted) {
          setStore(value ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/store/${slug}`;
  }, [slug]);

  const share = useMemo(() => {
    if (!shareUrl) return null;
    return shareLinks(shareUrl, store?.title ?? 'Litestore storefront');
  }, [shareUrl, store?.title]);

  async function handleCopy() {
    if (!share) return;
    await navigator.clipboard.writeText(share.copyText);
    setCopyStatus('Copied share link.');
  }

  async function handleCheckout() {
    if (!store) return;
    if (!email.trim()) {
      setCheckoutStatus('Add an email to continue to checkout.');
      return;
    }

    setCheckoutStatus('Preparing Paystack checkout...');
    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          slug: store.slug,
          title: store.title,
          amount: store.price,
          currency: store.currency
        })
      });

      const payload = (await response.json()) as { authorization_url?: string; message?: string };
      if (!response.ok || !payload.authorization_url) {
        throw new Error(payload.message || 'Checkout could not be started.');
      }

      window.location.href = payload.authorization_url;
    } catch (error) {
      setCheckoutStatus(error instanceof Error ? error.message : 'Checkout failed.');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#05040a_0%,#0d0b15_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white/70">Loading storefront...</div>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#05040a_0%,#0d0b15_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">Store not found</p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-white">This storefront is not published yet.</h1>
            <p className="mt-4 max-w-2xl text-white/68">
              Go back to the creator flow, publish a collection, and then revisit this route.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(183,146,255,0.14),_transparent_30%),linear-gradient(180deg,#05040a_0%,#090812_38%,#0e0c16_100%)] text-white">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">Litestore</p>
            <p className="text-sm text-white/74">Public storefront</p>
          </div>
          <a href="/create" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/75">
            Create another store <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/55">
              Newly published
            </div>
            <h1 className="mt-6 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              {store.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">{store.description}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {storefrontHighlights.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/68">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Buy print</p>
                <h2 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">{formatCurrency(store.price, store.currency)}</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/60">Secure checkout</span>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="text-sm text-white/60">Email for receipt</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/25"
                  placeholder="collector@example.com"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleCheckout()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white/90"
              >
                Buy print
              </button>

              {checkoutStatus ? <p className="text-sm text-white/65">{checkoutStatus}</p> : null}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Share</p>
                  <p className="mt-1 text-sm text-white/76">Collectors can repost the drop.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
              </div>
              {copyStatus ? <p className="mt-3 text-sm text-emerald-200">{copyStatus}</p> : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={share?.x ?? '#'} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75">
                  Share on X
                </a>
                <a href={share?.whatsapp ?? '#'} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75">
                  Share on WhatsApp
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="grid gap-4 md:grid-cols-3">
          {store.artworks.map((artwork, index) => (
            <article key={artwork.id} className={`overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
              <img src={artwork.src} alt={artwork.name} className={`w-full object-cover ${index === 0 ? 'h-[32rem]' : 'h-80'}`} />
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Artwork</p>
                  <p className="mt-1 text-sm text-white">{artwork.name}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/60">Available</span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Artist</p>
            <p className="mt-3 text-lg text-white">{store.artistName}</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Published</p>
            <p className="mt-3 text-lg text-white">{new Date(store.publishedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Proof of taste</p>
            <p className="mt-3 text-lg text-white">{store.testimonial}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
