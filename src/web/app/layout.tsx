import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppSidebar } from '../components/AppSidebar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PQC Migration Digital Twin Dashboard',
  description: 'Operational dashboard scaffold for PQC migration readiness and risk visibility.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-[#020406] pb-20 font-sans text-zinc-100 antialiased md:flex-row md:pb-0">
        <AppSidebar />
        <div className="app-main flex min-h-screen w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
          <main className="relative mx-auto box-border w-full min-w-0 max-w-[1400px] flex-1 overflow-x-hidden overflow-y-auto px-4 py-8 sm:px-6 md:px-10 md:py-12 lg:px-14">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
