import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B111E',
  interactiveWidget: 'resizes-content',
};

export const metadata: Metadata = {
  title: 'ED TRIMKEY OS — Academic Operations Platform',
  description: 'Enterprise Academic Digital Workflow System powered by Trim Key',
  applicationName: 'ED TRIMKEY OS',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ED TRIMKEY OS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/etk-logo.png',
    apple: '/etk-logo.png',
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <link rel="apple-touch-icon" href="/etk-logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Overpass:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://flow.trimkey.in" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://flow.trimkey.in" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
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

        {children}

        {/* TOAST CONTAINER */}
        <div id="toastContainer" />
      </body>
    </html>
  );
}
