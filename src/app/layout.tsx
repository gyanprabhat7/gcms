import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'sonner';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GCMS - Global Conflict Monitoring System",
  description: "Real-time tactical intelligence dashboard for monitoring global conflicts.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-hidden`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster position="top-right" toastOptions={{
            style: { background: 'var(--card)', border: '1px solid var(--alert)', color: 'var(--foreground)', fontFamily: 'var(--font-geist-mono)' }
          }} />
        </ThemeProvider>
      </body>
    </html>
  );
}