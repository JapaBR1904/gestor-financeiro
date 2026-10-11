"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { carregarConfiguracaoSaas, planoPermite, PlanoNexo } from "../../lib/saas";

const membrosExemplo = [
  { nome: "Você", papel: "Dono", status: "Ativo" },
  { nome: "Convite pendente", papel: "Gerente", status: "Aguardando" },
  { nome: "Novo operador", papel: "Operador", status: "Disponível" },
];

export default function EquipePage() {
  const [plano, setPlano] = useState<PlanoNexo>("free");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarConfiguracaoSaas()
      .then((dados) => setPlano(dados.plano))
      .finally(() => setCarregando(false));
  }, []);

  const liberado = planoPermite(plano, "business");

  return (
    <main className="saas-shell premium-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Equipe e permissões</small></div></Link>
        <Link className="secondary-button compact-button" href="/">Voltar ao Nexo</Link>
      </section>

      {!carregando && !liberado ? (
        <section className="premium-lock-card"><span className="premium-lock-icon">◎</span><p className="eyebrow">Recurso Business</p><h1>Equipe e permissões</h1><p>Convide pessoas e defina o que cada uma pode acessar dentro da operação.</p><Link className="primary-button" href="/planos">Conhecer o Business</Link></section>
      ) : liberado ? (
        <>
          <section className="premium-heading"><p className="eyebrow">Plano Business</p><h1>Equipe e permissões</h1><p>Estrutura preparada para dono, gerente e operador trabalharem sem misturar responsabilidades.</p></section>
          <section className="team-summary-grid">
            <article><span>Membros</span><strong>1</strong><small>de até 10 usuários</small></article>
            <article><span>Convites pendentes</span><strong>0</strong><small>nenhum convite enviado</small></article>
            <article><span>Perfis disponíveis</span><strong>3</strong><small>Dono · Gerente · Operador</small></article>
          </section>
          <section className="team-card">
            <div className="team-card-header"><div><p className="eyebrow">Acessos</p><h2>Pessoas da organização</h2><p>A tabela de convites já existe no banco. A próxima etapa é ligar envio e aceite por e-mail.</p></div><button className="primary-button" type="button" disabled>+ Convidar pessoa</button></div>
            <div className="team-list">
              {membrosExemplo.map((membro, indice) => <div className={`team-row${indice > 0 ? " muted" : ""}`} key={`${membro.nome}-${membro.papel}`}><span className="team-avatar">{membro.nome.charAt(0)}</span><div><strong>{membro.nome}</strong><small>{membro.papel}</small></div><span className="team-status">{membro.status}</span></div>)}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
