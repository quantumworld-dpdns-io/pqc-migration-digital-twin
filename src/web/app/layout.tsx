import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PQC Migration Digital Twin Dashboard',
  description: 'Operational dashboard scaffold for PQC migration readiness and risk visibility.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
