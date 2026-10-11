"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { concluirOnboarding, PerfilUso, salvarPerfilUso, salvarPlanoLocal } from "../../lib/saas";

const opcoes: Array<{
  id: PerfilUso;
  titulo: string;
  descricao: string;
  detalhe: string;
  icone: string;
}> = [
  {
    id: "negocio",
    titulo: "Quero organizar meu negócio",
    descricao: "Para autônomos, MEIs e pequenos negócios que vendem produtos ou serviços.",
    detalhe: "Vendas, despesas, produtos, clientes e relatórios em um só lugar.",
    icone: "N",
  },
  {
    id: "pessoal",
    titulo: "Quero cuidar das minhas finanças pessoais",
    descricao: "Para acompanhar entradas, saídas e entender melhor para onde o dinheiro está indo.",
    detalhe: "Uma experiência mais simples, focada no seu dinheiro do dia a dia.",
    icone: "P",
  },
  {
    id: "empresa",
    titulo: "Quero usar em uma empresa maior",
    descricao: "Para equipes que precisam dividir o acesso e acompanhar uma operação mais completa.",
    detalhe: "Mais usuários, permissões e visão gerencial conforme o plano evolui.",
    icone: "E",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilUso | null>(null);
  const [etapa, setEtapa] = useState<1 | 2>(1);

  function continuar() {
    if (!perfil) return;
    salvarPerfilUso(perfil);
    setEtapa(2);
  }

  function entrarNoNexo() {
    if (!perfil) return;
    salvarPerfilUso(perfil);
    salvarPlanoLocal("free");
    concluirOnboarding();
    router.push("/");
    router.refresh();
  }

  function verPlanos() {
    if (!perfil) return;
    salvarPerfilUso(perfil);
    router.push("/planos?origem=onboarding");
  }

  return (
    <main className="saas-shell onboarding-shell">
      <section className="saas-brandbar">
        <div className="saas-brand"><span>N</span><div><strong>Nexo</strong><small>Seu espaço financeiro</small></div></div>
        <span className="saas-step">Etapa {etapa} de 2</span>
      </section>

      {etapa === 1 ? (
        <section className="onboarding-card">
          <div className="saas-heading">
            <p className="eyebrow">Bem-vindo ao Nexo</p>
            <h1>Como você pretende usar o Nexo?</h1>
            <p>Isso ajuda a preparar uma experiência mais adequada logo no primeiro acesso.</p>
          </div>

          <div className="use-case-grid">
            {opcoes.map((opcao) => (
              <button
                className={`use-case-card${perfil === opcao.id ? " selected" : ""}`}
                key={opcao.id}
                type="button"
                onClick={() => setPerfil(opcao.id)}
              >
                <span className="use-case-icon">{opcao.icone}</span>
                <span className="use-case-copy">
                  <strong>{opcao.titulo}</strong>
                  <span>{opcao.descricao}</span>
                  <small>{opcao.detalhe}</small>
                </span>
                <span className="use-case-check">{perfil === opcao.id ? "✓" : ""}</span>
              </button>
            ))}
          </div>

          <div className="saas-actions">
            <button className="primary-button saas-primary" type="button" disabled={!perfil} onClick={continuar}>Continuar</button>
          </div>
        </section>
      ) : (
        <section className="onboarding-card onboarding-plan-step">
          <div className="saas-heading">
            <p className="eyebrow">Seu primeiro passo</p>
            <h1>Comece no Free e evolua quando precisar</h1>
            <p>Você pode entrar agora sem pagar nada. Quando quiser recursos extras, os outros planos já ficam disponíveis.</p>
          </div>

          <div className="onboarding-plan-preview">
            <div className="plan-preview-main">
              <span className="plan-mini-label">Plano inicial</span>
              <strong>Free</strong>
              <p>Perfeito para conhecer o fluxo do Nexo e organizar as primeiras informações.</p>
            </div>
            <div className="plan-preview-price"><strong>R$ 0</strong><span>/mês</span></div>
          </div>

          <div className="onboarding-benefits">
            <span>✓ Dashboard financeiro</span>
            <span>✓ Vendas e despesas</span>
            <span>✓ Produtos e clientes</span>
            <span>✓ Relatórios essenciais</span>
          </div>

          <div className="saas-actions split-actions">
            <button className="secondary-button" type="button" onClick={() => setEtapa(1)}>Voltar</button>
            <button className="secondary-button" type="button" onClick={verPlanos}>Conhecer planos</button>
            <button className="primary-button saas-primary" type="button" onClick={entrarNoNexo}>Entrar no Nexo</button>
          </div>
        </section>
      )}
    </main>
  );
}
