import { Suspense } from "react";
import CheckoutRota from "../../components/CheckoutConteudo";
export default function CheckoutPage() { return <Suspense fallback={<main className="saas-shell" role="status">Carregando checkout...</main>}><CheckoutRota /></Suspense>; }
