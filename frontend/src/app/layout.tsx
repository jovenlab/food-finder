import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Food Finder",
  description: "Search packaged food products from Open Food Facts",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // lang="en" is the value rendered on the SERVER, where we cannot know the
    // user's stored preference. LanguageProvider corrects it in the browser as
    // soon as it mounts. Getting it right matters for screen-reader
    // pronunciation and for the browser's translate offer.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* This layout stays a Server Component. React context does not work in
            Server Components, so the provider is a Client Component that simply
            wraps `children` - the pattern Next.js documents for exactly this. */}
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
