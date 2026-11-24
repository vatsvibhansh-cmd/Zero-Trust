import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Geeta University · Secure Document Portal',
  description: 'College documents, safely shared. Time-boxed, device-locked, single-use 60-second access.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-[#f6f9fc] text-slate-900 antialiased">{children}</body>
    </html>
  );
}
