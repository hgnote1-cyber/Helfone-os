import "./globals.css";

export const metadata = {
  title: "Helfone - Ordens de Serviço",
  description: "Controle de ordens de serviço da Helfone",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
