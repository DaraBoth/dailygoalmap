import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: "DailyGoalMap - Track Your Goals Daily",
  description: "A powerful goal tracking and task management app with real-time collaboration",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon/maskable_icon_x96.png",
    apple: "/icon/maskable_icon_x192.png",
  },
};

// Inline script to fix Next.js 16 + React 19 performance.measure errors
// Must run before React hydrates to catch early errors
const performanceFixScript = `
(function() {
  if (typeof performance === 'undefined' || performance.__patched) return;
  var originalMeasure = performance.measure.bind(performance);
  performance.measure = function(name, startOrOptions, endMark) {
    try {
      return originalMeasure(name, startOrOptions, endMark);
    } catch (e) {
      if (e && e.message && e.message.includes('negative time stamp')) {
        return { name: name, entryType: 'measure', startTime: 0, duration: 0, detail: null, toJSON: function() { return {}; } };
      }
      throw e;
    }
  };
  performance.__patched = true;
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: performanceFixScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js')
                  .then(function(registration) {
                    console.log('SW registered:', registration.scope);
                  })
                  .catch(function(error) {
                    console.log('SW registration failed:', error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
