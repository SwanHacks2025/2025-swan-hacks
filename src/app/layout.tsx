import type { Metadata } from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import {Roboto} from 'next/font/google';
import {Fugaz_One} from "next/font/google";
import { ThemeProvider } from '@/context';
import './globals.css';
import { AuthProvider } from '@/lib/firebaseAuth';
import { LayoutClient } from '@/components/layout-client';
import { Footer } from '@/components/footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const roboto = Roboto({
    weight: ['300', '400', '700'],
    subsets: ['latin'],
    variable: '--font-roboto',
})

const fugaz = Fugaz_One({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-fugaz',
})

export const metadata: Metadata = {
  title: 'Gather Point',
  description: 'Where communities connect and experiences begin',
  icons: {
    icon: '/GatherPointLogo.svg',
    shortcut: '/GatherPointLogo.svg',
    apple: '/GatherPointLogo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
          className={`${roboto.className} ${fugaz.variable}`}
      >
        <ThemeProvider>
          <AuthProvider>
            <LayoutClient>{children}</LayoutClient>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
