import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ventastack",
  description: "Plataforma SaaS de ventas en ruta y punto de venta",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
