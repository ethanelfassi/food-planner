import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0C0E" },
    { media: "(prefers-color-scheme: light)", color: "#F7F7F6" },
  ],
};

export const metadata: Metadata = {
  title: "FoodPlanner • Nutrition & Épicerie",
  description: "Planificateur de repas sportif et d'épicerie Metro Québec",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FoodPlanner",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col transition-colors duration-300 font-sans selection:bg-stone-900/15 selection:text-stone-950 dark:selection:bg-white/20 dark:selection:text-white pb-safe">
        {children}
      </body>
    </html>
  );
}
