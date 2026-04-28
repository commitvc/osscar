import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://osscar.dev"
  ),
  title: {
    default: "OSSCAR — Fastest-Growing Open Source Orgs",
    template: "%s — OSSCAR",
  },
  description:
    "A quarterly ranking of the fastest-growing open-source organizations, by Supabase and >commit.",
  openGraph: {
    type: "website",
    siteName: "OSSCAR",
    title: "OSSCAR — Fastest-Growing Open Source Orgs",
    description:
      "A quarterly ranking of the fastest-growing open-source organizations, by Supabase and >commit.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "OSSCAR" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OSSCAR — Fastest-Growing Open Source Orgs",
    description:
      "A quarterly ranking of the fastest-growing open-source organizations, by Supabase and >commit.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/favicon/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon/favicon-256.png", sizes: "256x256", type: "image/png" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: { url: "/favicon/apple-touch-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceCodePro.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
