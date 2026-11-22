import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <link rel="preconnect" href="https://flow.trimkey.in" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://flow.trimkey.in" />
      </head>
      <body>
        {/* TRUE LIQUID REFRACTION SVG FILTER ENGINE */}
        <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true" focusable="false">
          <filter id="liquid-refraction" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feImage
              href="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cdefs%3E%3CradialGradient id='rg' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' stop-color='rgb(128,128,128)'/%3E%3Cstop offset='100%25' stop-color='rgb(200,200,200)'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='256' height='256' fill='url(%23rg)'/%3E%3C/svg%3E"
              result="LENS_MAP"
              preserveAspectRatio="none"
            />
            <feDisplacementMap in="SourceGraphic" in2="LENS_MAP" scale="30" xChannelSelector="R" yChannelSelector="G" result="BENT_PIXELS" />
            <feGaussianBlur in="BENT_PIXELS" stdDeviation="8" result="FROSTED" />
            <feColorMatrix in="FROSTED" type="saturate" values="1.6" />
          </filter>
        </svg>

        {/* 3. The universal fixed blurred mesh background (Trim Key Flow Formula) */}
        <div 
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(38, 195, 234, 0.08), transparent 35%), radial-gradient(circle at 85% 30%, rgba(40, 195, 229, 0.08), transparent 35%), radial-gradient(circle at 50% 0%, #1a1a24 0%, #0a0a0c 100%)',
            backgroundAttachment: 'fixed'
          }}
        />

        {/* CSS MINIFIER BYPASS: Force Liquid Glass Physics (Trim Key Flow Formula) */}
        <style dangerouslySetInnerHTML={{ __html: `
          .liquid-glass, .panel, .kpi-card, .premium-sticky-header, .glass-box, .nav-pill-box, .fab-action-sheet, .glass-overlay, .profile-dropdown, .notif-dropdown, .glass-title-pill, .tk-toast, .nav-tab.active, button {
            backdrop-filter: blur(40px) saturate(200%) !important;
            -webkit-backdrop-filter: blur(40px) saturate(200%) !important;
          }
        ` }} />

        {children}

        {/* TOAST CONTAINER */}
        <div id="toastContainer" />
      </body>
    </html>
  );
}
