import type { Metadata, Viewport } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import './globals.css';
import PlatformGate from '@/components/platform/PlatformGate';

const display = Cinzel({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "The One Barber — It's more than a haircut. It's the One.",
  description:
    'Precision cuts, beard services and colour in Arcadia, Pretoria. Online booking with secure PayFast payments, walk-ins welcome, and a loyalty card where your 10th cut is free. Shop 22, Michael House, 472 Stanza Bopape Street. 081 487 5017.',
  icons: {
    icon: '/images/logo-icon.png',
    apple: '/images/logo-apple.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen">
        <PlatformGate>{children}</PlatformGate>
      </body>
    </html>
  );
}
