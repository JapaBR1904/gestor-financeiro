import { Suspense } from "react";
import AuthCodeForm from "../../components/AuthCodeForm";
export default function VerificarCodigoPage() {
  return <Suspense fallback={<main className="auth-shell" role="status">Carregando...</main>}><AuthCodeForm /></Suspense>;
}
