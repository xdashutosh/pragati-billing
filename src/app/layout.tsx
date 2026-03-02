import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Billing Management System',
  description: 'Running Account Billing & Contract Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
