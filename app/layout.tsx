import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B111E',
};

export const metadata: Metadata = {
  title: 'Ed-Trim Key Command Center',
  description: 'Enterprise Academic Digital Workflow System powered by Trim Key',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ed-Trim Key',
  },
  icons: {
    icon: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/apple-ETK-icon.png',
    apple: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/apple-ETK-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Overpass:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://backend-ed.trimkey.in" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://backend-ed.trimkey.in" />
        <link rel="preconnect" href="https://flow.trimkey.in" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://flow.trimkey.in" />
      </head>
      <body>{children}</body>
    </html>
  );
}
