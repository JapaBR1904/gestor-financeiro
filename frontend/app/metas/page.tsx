"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { carregarConfiguracaoSaas, planoPermite, PlanoNexo } from "../../lib/saas";

const metasExemplo = [
  { titulo: "Faturamento mensal", atual: 62, descricao: "R$ 6.200 de R$ 10.000" },
  { titulo: "Margem de lucro", atual: 48, descricao: "12% de uma meta de 25%" },
  { titulo: "Novos clientes", atual: 80, descricao: "8 de 10 clientes" },
];

export default function MetasPage() {
  const [plano, setPlano] = useState<PlanoNexo>("free");
  const [carregandoPlano, setCarregandoPlano] = useState(true);

  useEffect(() => {
    carregarConfiguracaoSaas()
      .then((dados) => setPlano(dados.plano))
      .finally(() => setCarregandoPlano(false));
  }, []);

  const liberado = planoPermite(plano, "pro");

  return (
    <main className="saas-shell premium-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Metas e crescimento</small></div></Link>
        <Link className="secondary-button compact-button" href="/">Voltar ao Nexo</Link>
      </section>

      {!carregandoPlano && !liberado ? (
        <section className="premium-lock-card"><span className="premium-lock-icon">◇</span><p className="eyebrow">Recurso Pro</p><h1>Metas e comparativos</h1><p>Defina objetivos financeiros e comerciais e acompanhe a evolução ao longo do mês.</p><Link className="primary-button" href="/planos">Conhecer o Pro</Link></section>
      ) : liberado ? (
        <>
          <section className="premium-heading"><p className="eyebrow">Plano Pro</p><h1>Metas e comparativos</h1><p>Uma central para transformar números em objetivos claros.</p></section>
          <section className="premium-kpi-grid">
            {metasExemplo.map((meta) => <article className="premium-kpi-card" key={meta.titulo}><div><span>{meta.titulo}</span><strong>{meta.atual}%</strong></div><div className="premium-progress"><span style={{ width: `${meta.atual}%` }} /></div><small>{meta.descricao}</small></article>)}
          </section>
          <section className="premium-placeholder-card"><div><p className="eyebrow">Próxima etapa</p><h2>Criação e edição de metas</h2><p>A interface está pronta para receber metas reais quando criarmos a tabela específica de metas.</p></div><button className="primary-button" type="button" disabled>+ Nova meta</button></section>
        </>
      ) : null}
    </main>
  );
}
