import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/nunito-sans";
import "@fontsource/caveat/700.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { FixedBackgroundGate, MobileCTA, PageFade, Splash, Toasts } from "@/components/chrome";
import { LangProvider } from "@/lib/i18n";
import { ShopProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: {
    default: "Kuopio Bites — Grilli, Pizzeria & Asian Cuisine · Kuopio",
    template: "%s · Kuopio Bites",
  },
  description:
    "Kuopio Bites at Jalkasenkatu 7, 70820 Kuopio — wood-fired pizzas, kebabs, wings, Karachi biryani and halwa puri. Order online or book a table. ☎ 044 981 6223",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F3D3E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="pb-16 lg:pb-0">
        <FixedBackgroundGate />
        <LangProvider>
          <ShopProvider>
            <Splash />
            <Header />
            <PageFade>
              <main className="min-h-[70vh]">{children}</main>
            </PageFade>
            <Footer />
            <CartDrawer />
            <MobileCTA />
            <Toasts />
          </ShopProvider>
        </LangProvider>
      </body>
    </html>
  );
}
