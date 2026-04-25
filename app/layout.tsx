import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap'
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap'
});

export const metadata: Metadata = {
  title: {
    default: 'Litestore',
    template: '%s | Litestore'
  },
  description: 'Create luxury storefronts for artwork drops, publish them instantly, and sell prints with Paystack.',
  metadataBase: new URL('https://litestore.local'),
  openGraph: {
    title: 'Litestore',
    description: 'Create luxury storefronts for artwork drops, publish them instantly, and sell prints with Paystack.',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
