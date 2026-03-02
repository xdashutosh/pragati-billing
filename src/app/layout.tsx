import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LPW Echur — RA Bill System',
  description: 'Running Account Billing & Contract Management — LPW Warehousing & Logistic Park, Echur',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
