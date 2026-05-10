import type { Metadata } from "next";
import { LanguageProvider } from "@/lib/i18n/context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vannamei Shrimp Profit Optimizer",
  description: "Smart analytics platform for shrimp farmers to maximize profit through data-driven decisions.",
  keywords: ["shrimp farming", "vannamei", "aquaculture", "FCR", "profit optimizer"],
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
      </head>
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
