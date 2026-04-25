'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'iconoir-react';
import { useState } from 'react';
import { demoStore, landingStats, landingTestimonials, storefrontHighlights } from '@/lib/litestore';
import { LoginModal } from '@/components/litestore/login-modal';

const floatingArt = [
  {
    src: demoStore.artworks[0].src,
    title: demoStore.artworks[0].name,
    style: 'lg:-rotate-6'
  },
  {
    src: demoStore.artworks[1].src,
    title: demoStore.artworks[1].name,
    style: 'translate-x-6 translate-y-8 rotate-3'
  },
  {
    src: demoStore.artworks[2].src,
    title: demoStore.artworks[2].name,
    style: '-translate-x-6 translate-y-3 rotate-[-4deg]'
  }
];

export function LandingPage() {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(183,146,255,0.18),_transparent_30%),linear-gradient(180deg,#05040a_0%,#090812_40%,#0d0b15_100%)] text-stone-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-black/25 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/" className="inline-flex items-center gap-3 self-start">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold tracking-[0.28em] text-white/80">
              LS
            </span>
            <span>
              <span className="block text-sm uppercase tracking-[0.35em] text-white/50">Litestore</span>
              <span className="block text-sm text-white/85">Luxury storefronts for art prints</span>
            </span>
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/store/aurora-lane"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
            >
              View demo
            </Link>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 shadow-[0_14px_40px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-white/90 active:translate-y-0"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-24 lg:pt-20">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/60">
            Minimal luxury storefronts
          </p>
          <h1 className="mt-6 text-balance font-[family-name:var(--font-display)] text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Turn artwork into a premium store in minutes.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/72 sm:text-xl">
            Upload 1 to 5 artworks, generate a polished store, edit the copy, publish a public storefront, and take payments through Paystack.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-zinc-950 transition hover:-translate-y-0.5 hover:bg-white/90 active:translate-y-0"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/store/aurora-lane"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/84 transition hover:border-white/20 hover:bg-white/8"
            >
              Explore the storefront <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {landingStats.map((stat) => (
              <div key={stat.label} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">{stat.label}</p>
                <p className="mt-3 text-lg font-medium text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-8 top-6 h-[26rem] rounded-[2.5rem] bg-[radial-gradient(circle,_rgba(187,160,255,0.3),_transparent_58%)] blur-3xl" />
          <div className="relative mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Create flow</p>
                <p className="mt-3 text-2xl font-[family-name:var(--font-display)] text-white">Upload, generate, publish</p>
                <div className="mt-5 space-y-3 text-sm text-white/70">
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">AI store generation</div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">Paystack checkout</div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">Share loop after publish</div>
                </div>
              </div>

              <div className="grid gap-4">
                {floatingArt.map((art, index) => (
                  <div
                    key={art.title}
                    className={`overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0f0e18] shadow-[0_18px_60px_rgba(0,0,0,0.42)] ${art.style}`}
                  >
                    <img src={art.src} alt={art.title} className="h-52 w-full object-cover" />
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-white/45">Artwork {index + 1}</p>
                        <p className="mt-1 text-sm text-white">{art.title}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Ready
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">Why it works</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-white sm:text-4xl">
              Designed like a drop page, built like a store.
            </h2>
            <p className="mt-4 leading-8 text-white/70">
              Clean editorial layout, floating artwork cards, premium typography, and a fast checkout flow that feels calm from first click to publish.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {landingTestimonials.map((item) => (
              <article key={item.name} className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
                <p className="text-sm leading-7 text-white/76">“{item.quote}”</p>
                <div className="mt-5 border-t border-white/8 pt-4">
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">Customer view</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-white sm:text-4xl">
                Gallery, purchase button, and a share loop that keeps the drop moving.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
            >
              Start your store <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {storefrontHighlights.map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5 text-white/78">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          setLoginOpen(false);
          router.push('/create');
        }}
      />
    </main>
  );
}
