'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Copy, Check } from 'iconoir-react';
import {
  demoStore,
  formatCurrency,
  publishedStoresKey,
  shareLinks,
  storefrontHighlights,
  storeStorageKey,
  type StoreRecord
} from '@/lib/litestore';

async function readStore(slug: string, checkoutStatus: 'success' | 'demo-checkout' | null, storeSlug: string) {
  if (typeof window === 'undefined') return null;
  const direct = localStorage.getItem(storeStorageKey(slug)) || localStorage.getItem(storeStorageKey(storeSlug));
  if (direct) return JSON.parse(direct) as StoreRecord;

  const published = JSON.parse(localStorage.getItem(publishedStoresKey()) || '[]') as string[];
  if (published.includes(storeSlug)) {
    const fallback = localStorage.getItem(storeStorageKey(storeSlug));
    if (fallback) return JSON.parse(fallback) as StoreRecord;
  }

  if (checkoutStatus) {
    const successLabel = checkoutStatus === 'success' ? 'Payment successful' : 'Demo checkout successful';
    return {
      ...demoStore,
      id: `checkout-${storeSlug || 'new'}`,
      slug: storeSlug || slug,
      title: successLabel,
      description:
        checkoutStatus === 'success'
          ? 'Payment confirmation returned from Paystack. The storefront is ready for collectors to continue browsing.'
          : 'This is the hackathon demo success state. The payment flow completed and the storefront is ready for collectors to continue browsing.',
      testimonial: checkoutStatus === 'success' ? 'Paystack checkout completed successfully.' : 'Paystack demo checkout completed successfully.',
      artistName: 'Litestore checkout mode'
    } satisfies StoreRecord;
  }

  if (demoStore.slug === slug) return demoStore;
  return null;
}

const sectionMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 }
};

export function StorefrontClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('status') === 'success' || searchParams.get('status') === 'demo-checkout' ? (searchParams.get('status') as 'success' | 'demo-checkout') : null;
  const checkoutStoreSlug = searchParams.get('store') || slug;
  const demoCheckout = checkoutStatus === 'demo-checkout';
  const hasCheckoutStatus = checkoutStatus !== null;
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [email, setEmail] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState(checkoutStatus === 'success' ? 'Payment confirmed.' : demoCheckout ? 'Demo checkout confirmed.' : '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    readStore(slug, checkoutStatus, checkoutStoreSlug)
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
  }, [checkoutStatus, checkoutStoreSlug, slug]);

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
      setCheckoutMessage('Add an email to continue to checkout.');
      return;
    }

    setCheckoutMessage('Preparing Paystack checkout...');
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

      const payload = (await response.json()) as { authorization_url?: string; callback_url?: string; checkout_status?: 'success' | 'demo-checkout'; message?: string };
      if (!response.ok) {
        throw new Error(payload.message || 'Checkout could not be started.');
      }

      const redirectUrl = payload.checkout_status === 'demo-checkout' ? payload.callback_url || payload.authorization_url : payload.authorization_url || payload.callback_url;
      if (!redirectUrl) {
        throw new Error(payload.message || 'Checkout could not be started.');
      }

      window.location.href = redirectUrl;
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : 'Checkout failed.');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#05040a_0%,#0d0b15_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-white/70 sm:p-8">Loading storefront...</div>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#05040a_0%,#0d0b15_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
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
        <motion.div
          {...sectionMotion}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:p-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">Litestore</p>
            <p className="text-sm text-white/74">Public storefront</p>
          </div>
          <a
            href="/create"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/10"
          >
            Create another store <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.div {...sectionMotion} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.35em] ${
                demoCheckout ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/5 text-white/55'
              }`}
            >
              {hasCheckoutStatus ? <Check className="h-4 w-4" /> : null}
              {checkoutStatus === 'success' ? 'Payment successful' : demoCheckout ? 'Demo checkout successful' : 'Newly published'}
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
          </motion.div>

          <motion.aside
            {...sectionMotion}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
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

              {hasCheckoutStatus ? (
                <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-50">
                  <p className="font-medium">{checkoutStatus === 'success' ? 'Payment successful' : 'Demo checkout successful'}</p>
                  <p className="mt-2 leading-6 text-emerald-50/80">
                    {checkoutStatus === 'success'
                      ? 'The payment returned from Paystack and the storefront is now in success mode.'
                      : 'The checkout returned through the demo callback and the storefront is now in success mode.'}
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleCheckout()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-medium text-zinc-950 shadow-[0_14px_40px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-white/90 active:translate-y-0"
              >
                {demoCheckout ? 'Continue demo checkout' : 'Buy print'}
              </button>

              {checkoutMessage ? <p className={`text-sm ${hasCheckoutStatus ? 'text-emerald-200' : 'text-white/65'}`}>{checkoutMessage}</p> : null}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Share</p>
                  <p className="mt-1 text-sm text-white/76">Collectors can repost the drop.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
              </div>
              {copyStatus ? <p className="mt-3 text-sm text-emerald-200">{copyStatus}</p> : null}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <a
                  href={share?.x ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/10"
                >
                  Share on X
                </a>
                <a
                  href={share?.whatsapp ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/10"
                >
                  Share on WhatsApp
                </a>
              </div>
            </div>
          </motion.aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="grid gap-4 md:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {store.artworks.map((artwork, index) => (
              <motion.article
                key={artwork.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.04 }}
                className={`overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
              >
                <img src={artwork.src} alt={artwork.name} className={`w-full object-cover ${index === 0 ? 'h-[32rem]' : 'h-80'}`} />
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">Artwork</p>
                    <p className="mt-1 text-sm text-white">{artwork.name}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/60">
                    {demoCheckout ? 'Success state' : 'Available'}
                  </span>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <motion.div {...sectionMotion} transition={{ duration: 0.45, ease: 'easeOut' }} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Artist</p>
            <p className="mt-3 text-lg text-white">{store.artistName}</p>
          </motion.div>
          <motion.div {...sectionMotion} transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Published</p>
            <p className="mt-3 text-lg text-white">{new Date(store.publishedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </motion.div>
          <motion.div {...sectionMotion} transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Proof of taste</p>
            <p className="mt-3 text-lg text-white">{store.testimonial}</p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
