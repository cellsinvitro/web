import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/AuthContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import BioChemChatbot from "@/components/BioChemChatbot";
import NavigationLoader from "@/components/NavigationLoader";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CellsInVitro",
  description: "CellsInVitro - Cell Biology Learning & Research Platform",
  icons: {
    icon: [
      { url: "/images/logo.png", type: "image/png" },
    ],
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <ConfirmProvider>
            <Suspense fallback={null}>
              <NavigationLoader />
            </Suspense>
            {children}
            <BioChemChatbot />
          </ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}