import { ContextProviders } from "@/context/ContextProviders";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Adapta Motorista",
  description: "App do motorista — viagens, ofertas e entregas Adapta.",
  manifest: "/manifest.webmanifest",
  applicationName: "Adapta Motorista",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Adapta Motorista",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ed6842",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${poppins.variable}`}>
        <ContextProviders>
          <OfflineBanner />
          {children}
          <UpdatePrompt />
        </ContextProviders>
      </body>
    </html>
  );
}
