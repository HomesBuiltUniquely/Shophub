import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/components/providers/StoreProvider";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "ShopHub - Offerings Management",
  description: "Enterprise SaaS platform for managing product and service offerings",
  icons: {
    icon: "/images/hub-logo.png",
    apple: "/images/hub-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full antialiased ${manrope.variable} ${manrope.className}`}>
      <body className="min-h-full flex flex-col font-sans">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
