import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const titleFont = Space_Grotesk({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Sistema Órbita - Unicauca",
  description: "Consolidado de programas con seguimiento de Registro Calificado y Acreditacion.",
  icons: {
    icon: "/programa.png",
    shortcut: "/programa.png",
    apple: "/programa.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${titleFont.variable} ${monoFont.variable} h-full antialiased`}
      translate="no"
    >
      <head>
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="es" />
      </head>
      <body className="min-h-full flex flex-col" translate="no">
        {children}
      </body>
    </html>
  );
}
