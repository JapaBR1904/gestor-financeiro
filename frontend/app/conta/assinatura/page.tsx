import { Suspense } from "react";
import AssinaturaConteudo from "../../../components/AssinaturaConteudo";
export default function AssinaturaPage() { return <Suspense fallback={<main className="saas-shell" role="status">Carregando assinatura...</main>}><AssinaturaConteudo /></Suspense>; }
