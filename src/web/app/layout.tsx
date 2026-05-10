import type { Metadata } from 'next';
import './globals.css';
import { AppSidebar } from '../components/AppSidebar';

export const metadata: Metadata = {
  title: 'PQC Migration Digital Twin Dashboard',
  description: 'Operational dashboard scaffold for PQC migration readiness and risk visibility.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-[#020406] font-sans text-zinc-100 antialiased">
        <AppSidebar />
        <div className="app-main flex min-h-screen flex-1 flex-col overflow-hidden">
          <main className="relative mx-auto w-full max-w-[1400px] flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-12 lg:px-14">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
