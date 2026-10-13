import type { Metadata } from "next";
import "./globals.css";
import "./features.css";
import "./auth.css";
import "./auth-suggestions.css";
import "./polish.css";
import "./tables.css";
import "./refinement.css";
import "./signature.css";
import "./saas.css";
import "./checkout.css";
import "./saas-extra.css";
import "./pro.css";
import "./ia.css";
import "./product.css";
import { WorkspaceProvider } from "../components/WorkspaceProvider";

export const metadata: Metadata = {
  title: "Nexo",
  description: "Gestão simples para pequenos negócios",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><WorkspaceProvider>{children}</WorkspaceProvider></body>
    </html>
  );
}
