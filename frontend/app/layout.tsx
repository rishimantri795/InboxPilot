import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "sonner";
import "react-toastify/dist/ReactToastify.css";
import { SWRConfig } from "swr";
import { UserProvider } from "@/contexts/UserContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});


export const metadata: Metadata = {
  title: "InboxPilot",
  description: "Intelligent email management for your inbox.",
  icons: '/favicon.ico', // Update this if using a different file
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SWRConfig
          value={{
            revalidateOnFocus: false,
          }}
        >
        <UserProvider>
          <Toaster />
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </UserProvider>
          </SWRConfig>
      </body>
    </html>
  );
}
