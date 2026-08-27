import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PackSure AI Compliance Scanner",
  description: "SIH26034 prototype for evidence-linked packaged commodity compliance screening.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
