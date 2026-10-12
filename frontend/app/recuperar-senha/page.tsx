import { Suspense } from "react";
import AuthCodeForm from "../../components/AuthCodeForm";
export default function RecuperarSenhaPage() {
  return <Suspense fallback={<main className="auth-shell" role="status">Carregando...</main>}><AuthCodeForm recuperacao /></Suspense>;
}
