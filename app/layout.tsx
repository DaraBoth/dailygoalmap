import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "DailyGoalMap - Track Your Goals Daily",
  description: "A powerful goal tracking and task management app with real-time collaboration",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon/maskable_icon_x96.png",
    apple: "/icon/maskable_icon_x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
