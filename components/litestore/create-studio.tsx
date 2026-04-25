'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Copy, Edit, Plus, Trash } from 'iconoir-react';
import {
  MAX_ARTWORKS,
  buildDemoPublishedStore,
  buildShareText,
  formatCurrency,
  publishedStoresKey,
  shareLinks,
  slugify,
  storeStorageKey,
  type ArtworkAsset,
  type GeneratedStoreDraft,
  type StoreRecord
} from '@/lib/litestore';

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const initialDraft: GeneratedStoreDraft = {
  slug: 'new-drop',
  title: 'Untitled collection',
  description: 'Describe the collection and let Litestore turn it into a premium storefront.',
  price: 120,
  currency: 'NGN'
};

export function CreateStudio() {
  const [artworks, setArtworks] = useState<ArtworkAsset[]>([]);
  const [draft, setDraft] = useState<GeneratedStoreDraft>(initialDraft);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [status, setStatus] = useState('Upload 1 to 5 artworks to begin.');
  const [lastError, setLastError] = useState('');

  const share = useMemo(() => {
    if (!publishedUrl) return null;
    return shareLinks(publishedUrl, draft.title);
  }, [draft.title, publishedUrl]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    const selected = Array.from(files).slice(0, MAX_ARTWORKS);
    const nextArtworks = await Promise.all(
      selected.map(async (file, index) => ({
        id: `${file.name}-${index}-${crypto.randomUUID()}`,
        name: file.name.replace(/\.[^.]+$/, '') || `Artwork ${index + 1}`,
        src: await fileToDataUrl(file)
      }))
    );

    setArtworks(nextArtworks);
    setLastError('');
    setStatus(`${nextArtworks.length} artwork${nextArtworks.length > 1 ? 's' : ''} ready for generation.`);
  }

  async function handleGenerate() {
    if (!artworks.length) {
      setLastError('Upload at least one artwork first.');
      return;
    }

    setIsGenerating(true);
    setLastError('');
    setStatus('Generating storefront copy...');

    try {
      const formData = new FormData();
      artworks.forEach((artwork) => formData.append('artworks', artwork.src));
      formData.append('count', String(artworks.length));
      formData.append('title', draft.title);
      formData.append('description', draft.description);

      const response = await fetch('/api/generate-store', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Store generation failed.');
      }

      const generated = (await response.json()) as Partial<GeneratedStoreDraft>;
      setDraft((current) => ({
        ...current,
        slug: generated.slug ?? slugify(generated.title ?? current.title),
        title: generated.title ?? current.title,
        description: generated.description ?? current.description,
        price: generated.price ?? current.price,
        currency: generated.currency ?? current.currency
      }));
      setStatus('Generated. Edit the preview, then publish your store.');
    } catch (error) {
      setDraft((current) => ({
        ...current,
        slug: slugify(current.title),
        title: current.title || 'Untitled collection'
      }));
      setLastError(error instanceof Error ? error.message : 'Something went wrong.');
      setStatus('Using a local draft while the API is unavailable.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePublish() {
    if (!artworks.length) {
      setLastError('Add artworks before publishing.');
      return;
    }

    setIsPublishing(true);
    setLastError('');
    setStatus('Publishing and preparing share links...');

    try {
      const publishedStore = buildDemoPublishedStore(draft.title, draft.description, draft.price, artworks);
      const slug = slugify(draft.slug || publishedStore.slug || draft.title);
      const resolvedStore: StoreRecord = {
        ...publishedStore,
        slug,
        title: draft.title,
        description: draft.description,
        price: draft.price
      };

      localStorage.setItem(storeStorageKey(slug), JSON.stringify(resolvedStore));

      const existingPublished = JSON.parse(localStorage.getItem(publishedStoresKey()) || '[]') as string[];
      const nextPublished = Array.from(new Set([slug, ...existingPublished]));
      localStorage.setItem(publishedStoresKey(), JSON.stringify(nextPublished));

      const url = `${window.location.origin}/store/${slug}`;
      setPublishedUrl(url);
      setDraft((current) => ({ ...current, slug }));
      setStatus('Published. Share the store link with collectors.');
      window.history.replaceState({}, '', `/create?published=${slug}`);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Could not publish the store.');
      setStatus('Publishing failed.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    setStatus('Copied to clipboard.');
  }

  function removeArtwork(id: string) {
    setArtworks((current) => current.filter((artwork) => artwork.id !== id));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(183,146,255,0.16),_transparent_30%),linear-gradient(180deg,#05040a_0%,#0a0913_45%,#0e0c16_100%)] text-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">Create store</p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-white sm:text-5xl">
                Upload, generate, edit, publish.
              </h1>
              <p className="mt-4 max-w-2xl text-white/70">
                Build a polished storefront from up to five artworks, then let collectors buy prints through Paystack.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/70">
              {status}
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <section className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Step 1</p>
                  <h2 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">Upload artwork</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  {artworks.length}/{MAX_ARTWORKS}
                </span>
              </div>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center transition hover:border-white/25 hover:bg-white/7">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleUpload(event.target.files)}
                />
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/30 text-2xl text-white/75">
                  +
                </span>
                <span className="mt-4 text-lg font-medium text-white">Drop 1 to 5 artwork images</span>
                <span className="mt-2 max-w-sm text-sm leading-6 text-white/55">
                  PNG, JPG, or WebP. The images are used for the gallery, preview cards, and publish flow.
                </span>
              </label>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={!artworks.length || isGenerating}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? 'Generating store...' : 'Generate store'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArtworks([]);
                    setDraft(initialDraft);
                    setPublishedUrl('');
                    setLastError('');
                    setStatus('Reset. Upload a new collection.');
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
                >
                  Reset collection
                </button>
              </div>

              {lastError ? <p className="mt-4 text-sm text-rose-300">{lastError}</p> : null}

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {artworks.map((artwork) => (
                  <article key={artwork.id} className="group overflow-hidden rounded-[1.3rem] border border-white/10 bg-white/5">
                    <div className="relative">
                      <img src={artwork.src} alt={artwork.name} className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeArtwork(artwork.id)}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm text-white">{artwork.name}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Step 2 & 3</p>
                  <h2 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">Preview and publish</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  AI draft
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.98fr_1.02fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/45">
                    <Edit className="h-4 w-4" /> Editable fields
                  </div>

                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="text-sm text-white/65">Store title</span>
                      <input
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-white/25"
                        placeholder="Collection title"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-white/65">Description</span>
                      <textarea
                        rows={5}
                        value={draft.description}
                        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/25"
                        placeholder="Store description"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm text-white/65">Slug</span>
                        <input
                          value={draft.slug}
                          onChange={(event) => setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-white/25"
                          placeholder="store-slug"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm text-white/65">Price</span>
                        <input
                          type="number"
                          min={1}
                          value={draft.price}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, price: Number(event.target.value || 0) }))
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-white/25"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handlePublish()}
                      disabled={!artworks.length || isPublishing}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPublishing ? 'Publishing...' : 'Publish storefront'}
                    </button>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/45">Output preview</p>
                      <h3 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">{draft.title}</h3>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-white">
                      {formatCurrency(draft.price, draft.currency)}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-white/72">{draft.description}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/45">Slug</p>
                      <p className="mt-2 text-sm text-white/85">/store/{slugify(draft.slug || draft.title)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/45">Images</p>
                      <p className="mt-2 text-sm text-white/85">{artworks.length} selected</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {artworks.slice(0, 3).map((artwork) => (
                      <div key={artwork.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                        <img src={artwork.src} alt={artwork.name} className="h-12 w-12 rounded-xl object-cover" />
                        <div>
                          <p className="text-sm text-white">{artwork.name}</p>
                          <p className="text-xs text-white/45">Artwork included in storefront gallery</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {publishedUrl && share ? (
            <section className="mt-6 rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/10 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/75">Published</p>
                  <h2 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-white">Share your storefront</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">{buildShareText({ title: draft.title, slug: draft.slug })}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopy(share.copyText)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15"
                  >
                    <Copy className="h-4 w-4" /> Copy link
                  </button>
                  <a href={share.x} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-950">
                    Share on X
                  </a>
                  <a href={share.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-950">
                    Share on WhatsApp
                  </a>
                  <a href={publishedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white">
                    Open storefront <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
