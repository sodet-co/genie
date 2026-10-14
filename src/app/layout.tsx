import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  weight: ["400", "600"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Generador de certificados · Genie",
  description:
    "Genera certificados en PDF a partir de una plantilla HTML, a mano o desde Excel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface font-sans text-body text-ink">
        {children}
      </body>
    </html>
  );
}
