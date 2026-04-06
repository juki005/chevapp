import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import "../globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { JukeboxWidget } from "@/components/jukebox/JukeboxWidget";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
      default: t("appName"),
      template: `%s | ${t("appName")}`,
    },
    description: t("description"),
    keywords: [
      "ćevapi",
      "cevapi",
      "roštilj",
      "balkan food",
      "sarajevo",
      "banja luka",
      "gastro",
    ],
    openGraph: {
      title: t("appName"),
      description: t("tagline"),
      type: "website",
    },
    // manifest is served automatically from app/manifest.ts by Next.js
    themeColor: "#FF6B00",
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as "hr" | "en" | "de" | "sr" | "bs" | "sl")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Inline script: set .dark class BEFORE any CSS paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('chevapp-theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if((t||p)==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* bg-background uses the CSS-var system → adapts to light/dark automatically */}
      <body suppressHydrationWarning className="bg-background text-foreground min-h-screen antialiased">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {/* Desktop + mobile top nav */}
            <Navbar locale={locale} />

            {/* Main content
                pb-20 = clears the 64px bottom nav + a little breathing room on mobile
                pb-safe adds extra padding for notch/home-indicator devices      */}
            <main className="min-h-[calc(100dvh-64px)] pb-20 md:pb-0" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
              <style>{`@media (min-width: 768px) { main { padding-bottom: 0 !important; } }`}</style>
              <OnboardingGuard>
                {children}
              </OnboardingGuard>
            </main>

            {/* Mobile bottom navigation */}
            <MobileBottomNav locale={locale} />

            {/* Floating Jukebox widget */}
            <JukeboxWidget />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
