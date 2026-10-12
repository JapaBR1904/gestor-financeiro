"use client";

import Link from "next/link";
import { carregarAssinatura, listarEquipe } from "../../lib/assinatura";
import { useEffect, useState } from "react";
import { planoPermite, PlanoNexo } from "../../lib/planos";

export default function EquipePage() {
  const [plano, setPlano] = useState<PlanoNexo>("free");
  const [membros, setMembros] = useState<Awaited<ReturnType<typeof listarEquipe>>>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [limite, setLimite] = useState(0);

  useEffect(() => {
    carregarAssinatura()
      .then(async dados => { setPlano(dados.plano.id); setLimite(dados.plano.limiteUsuarios); if (planoPermite(dados.plano.id, "business")) setMembros(await listarEquipe()); })
      .catch(error => setErro(error instanceof Error ? error.message : "Não foi possível carregar a equipe."))
      .finally(() => setCarregando(false));
  }, []);

  const liberado = planoPermite(plano, "business");

  return (
    <main className="saas-shell premium-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Equipe e permissões</small></div></Link>
        <Link className="secondary-button compact-button" href="/">Voltar ao Nexo</Link>
      </section>

      {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
      {carregando ? <p role="status">Carregando equipe...</p> : null}
      {!carregando && !liberado ? (
        <section className="premium-lock-card"><span className="premium-lock-icon">◎</span><p className="eyebrow">Recurso Business</p><h1>Equipe e permissões</h1><p>Convide pessoas e defina o que cada uma pode acessar dentro da operação.</p><Link className="primary-button" href="/planos">Ver planos</Link></section>
      ) : liberado ? (
        <>
          <section className="premium-heading"><p className="eyebrow">Plano Business</p><h1>Equipe e permissões</h1><p>Consulte os acessos atuais da organização. Convites e edição de permissões ainda estão em preparação.</p></section>
          <section className="team-summary-grid">
            <article><span>Membros</span><strong>{membros.filter(m => m.ativo).length}</strong><small>limite do plano: {limite} usuários</small></article>
            <article><span>Convites</span><strong>Em preparação</strong><small>Envio e aceite indisponíveis nesta etapa</small></article>
            <article><span>Perfis existentes</span><strong>3</strong><small>Dono · Administrador · Membro</small></article>
          </section>
          <section className="team-card">
            <div className="team-card-header"><div><p className="eyebrow">Acessos</p><h2>Pessoas da organização</h2><p>A tabela de convites já existe no banco. A próxima etapa é ligar envio e aceite por e-mail.</p></div><button className="primary-button" type="button" disabled>+ Convidar pessoa</button></div>
            <div className="team-list">
              {membros.map((membro) => <div className="team-row" key={membro.id}><span className="team-avatar">{membro.nome.charAt(0)}</span><div><strong>{membro.nome}</strong><small>{membro.papel === "proprietario" ? "Dono" : membro.papel === "administrador" ? "Administrador" : "Membro"}</small></div><span className="team-status">{membro.ativo ? "Ativo" : "Inativo"}</span></div>)}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
