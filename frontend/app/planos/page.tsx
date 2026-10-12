import { Suspense } from "react";
import PlanosConteudo from "../../components/PlanosConteudo";
export default function PlanosPage() { return <Suspense fallback={<main className="saas-shell" role="status">Carregando planos...</main>}><PlanosConteudo /></Suspense>; }
