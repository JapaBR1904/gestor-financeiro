import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./brand.css";
import "./motion.css";
import "./navigation.css";
import "./features.css";
import "./auth.css";
import "./auth-suggestions.css";
import "./tables.css";
import "./refinement.css";
import "./saas.css";
import "./checkout.css";
import "./pro.css";
import "./ia.css";
import "./product.css";
import "./ambient.css";
import "./adaptativa.css";
import "./dashboard.css";
import "./copiloto.css";
import { WorkspaceProvider } from "../components/WorkspaceProvider";

const manrope = localFont({
  src: "./fonts/manrope-latin-variable.woff2",
  variable: "--font-nexo",
  weight: "200 800",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Nexo",
  description: "Gestão simples para pequenos negócios",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={manrope.variable} data-scroll-behavior="smooth">
      <body>
        <div className="nexo-ambient" aria-hidden="true" />
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
