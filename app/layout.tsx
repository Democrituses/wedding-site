import type { Metadata } from "next";
import { Monoton, Press_Start_2P, VT323 } from "next/font/google";

import { ArcadeLoader } from "@/components/ArcadeLoader";
import { FloatingPhotos } from "@/components/FloatingPhotos";
import { ScoreProvider } from "@/components/ScoreProvider";
import "./globals.css";

const display = Monoton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const pixel = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

const sans = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Wedding invitation",
    template: "%s",
  },
  description: "A private invitation and the details of the day.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${pixel.variable} ${sans.variable}`}
    >
      <body>
        <ScoreProvider>
          <ArcadeLoader />
          <FloatingPhotos />
          {children}
        </ScoreProvider>
      </body>
    </html>
  );
}
