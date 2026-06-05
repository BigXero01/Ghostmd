import type { Metadata } from 'next';
import { Cinzel_Decorative, Cinzel, IM_Fell_English, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import './globals.css';

const cinzelDecorative = Cinzel_Decorative({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-cinzel-decorative',
  display: 'swap',
});

const cinzel = Cinzel({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
});

const imFellEnglish = IM_Fell_English({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-im-fell',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GhostMD — Phantom Markets Division',
  description: 'Automated crypto trading powered by algorithmic intelligence. Gothic. Precise. Relentless.',
  keywords: ['crypto', 'trading', 'automated', 'algorithmic', 'bitcoin', 'ethereum'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${cinzelDecorative.variable} ${cinzel.variable} ${imFellEnglish.variable} ${jetbrainsMono.variable} bg-ink text-bone font-mono antialiased`}
      >
        <Providers>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: '#1a1528',
                border: '1px solid rgba(155,109,255,0.3)',
                color: '#e8e0f0',
                fontFamily: 'var(--font-jetbrains-mono)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
