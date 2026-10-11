"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  concluirOnboarding,
  OBJETIVOS_POR_PERFIL,
  PerfilUso,
  salvarObjetivos,
  salvarPerfilUso,
  salvarPlanoLocal,
} from "../../lib/saas";

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
    detalhe: "Vendas, despesas, produtos, clientes e resultado em um só lugar.",
    icone: "↗",
  },
  {
    id: "pessoal",
    titulo: "Quero cuidar das minhas finanças pessoais",
    descricao: "Para acompanhar entradas, gastos, saldo e metas com uma visão simples.",
    detalhe: "Uma experiência mais direta, focada no seu dinheiro do dia a dia.",
    icone: "◉",
  },
  {
    id: "empresa",
    titulo: "Quero usar em uma empresa maior",
    descricao: "Para equipes que precisam dividir acessos e acompanhar uma operação mais completa.",
    detalhe: "Permissões, equipe e visão gerencial entram conforme o plano evolui.",
    icone: "◇",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilUso | null>(null);
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);

  const objetivosDisponiveis = useMemo(() => (perfil ? OBJETIVOS_POR_PERFIL[perfil] : []), [perfil]);

  function escolherPerfil(novoPerfil: PerfilUso) {
    setPerfil(novoPerfil);
    setObjetivos([]);
  }

  function alternarObjetivo(objetivo: string) {
    setObjetivos((atuais) => atuais.includes(objetivo) ? atuais.filter((item) => item !== objetivo) : [...atuais, objetivo]);
  }

  function continuarPerfil() {
    if (!perfil) return;
    salvarPerfilUso(perfil);
    setEtapa(2);
  }

  function continuarObjetivos() {
    salvarObjetivos(objetivos);
    setEtapa(3);
  }

  function destinoInicial(perfilEscolhido: PerfilUso) {
    if (perfilEscolhido === "pessoal") return "/pessoal";
    if (perfilEscolhido === "empresa") return "/empresa";
    return "/";
  }

  function entrarNoNexo() {
    if (!perfil) return;
    salvarPerfilUso(perfil);
    salvarObjetivos(objetivos);
    salvarPlanoLocal("free");
    concluirOnboarding();
    router.push(destinoInicial(perfil));
    router.refresh();
  }

  function verPlanos() {
    if (!perfil) return;
    salvarPerfilUso(perfil);
    salvarObjetivos(objetivos);
    router.push("/planos?origem=onboarding");
  }

  return (
    <main className="saas-shell onboarding-shell">
      <section className="saas-brandbar">
        <div className="saas-brand"><span>N</span><div><strong>Nexo</strong><small>Seu espaço financeiro</small></div></div>
        <div className="onboarding-progress" aria-label={`Etapa ${etapa} de 3`}>
          <span className={etapa >= 1 ? "active" : ""} />
          <span className={etapa >= 2 ? "active" : ""} />
          <span className={etapa >= 3 ? "active" : ""} />
          <small>Etapa {etapa} de 3</small>
        </div>
      </section>

      {etapa === 1 ? (
        <section className="onboarding-card">
          <div className="saas-heading">
            <p className="eyebrow">Bem-vindo ao Nexo</p>
            <h1>Como você pretende usar o Nexo?</h1>
            <p>Essa escolha prepara sua experiência inicial. Você pode alterar depois nas configurações.</p>
          </div>

          <div className="use-case-grid">
            {opcoes.map((opcao) => (
              <button className={`use-case-card${perfil === opcao.id ? " selected" : ""}`} key={opcao.id} type="button" onClick={() => escolherPerfil(opcao.id)}>
                <span className="use-case-icon">{opcao.icone}</span>
                <span className="use-case-copy"><strong>{opcao.titulo}</strong><span>{opcao.descricao}</span><small>{opcao.detalhe}</small></span>
                <span className="use-case-check">{perfil === opcao.id ? "✓" : ""}</span>
              </button>
            ))}
          </div>

          <div className="saas-actions"><button className="primary-button saas-primary" type="button" disabled={!perfil} onClick={continuarPerfil}>Continuar</button></div>
        </section>
      ) : null}

      {etapa === 2 ? (
        <section className="onboarding-card">
          <div className="saas-heading">
            <p className="eyebrow">Personalização</p>
            <h1>O que você mais quer melhorar agora?</h1>
            <p>Escolha quantos objetivos quiser. Isso vai ajudar o Nexo a destacar as informações mais úteis.</p>
          </div>

          <div className="goal-choice-grid">
            {objetivosDisponiveis.map((objetivo) => (
              <button className={`goal-choice${objetivos.includes(objetivo) ? " selected" : ""}`} key={objetivo} type="button" onClick={() => alternarObjetivo(objetivo)}>
                <span className="goal-choice-check">{objetivos.includes(objetivo) ? "✓" : "+"}</span>
                <strong>{objetivo}</strong>
              </button>
            ))}
          </div>

          <div className="saas-actions split-actions">
            <button className="secondary-button" type="button" onClick={() => setEtapa(1)}>Voltar</button>
            <button className="primary-button saas-primary" type="button" onClick={continuarObjetivos}>Continuar</button>
          </div>
        </section>
      ) : null}

      {etapa === 3 ? (
        <section className="onboarding-card onboarding-plan-step">
          <div className="saas-heading">
            <p className="eyebrow">Tudo pronto</p>
            <h1>Comece no Free e evolua quando precisar</h1>
            <p>Você pode entrar agora sem pagar nada. Pro e Business já têm a experiência preparada para quando fizer sentido.</p>
          </div>

          <div className="onboarding-plan-preview">
            <div className="plan-preview-main"><span className="plan-mini-label">Plano inicial</span><strong>Free</strong><p>Operação essencial para conhecer o Nexo e organizar suas primeiras informações.</p></div>
            <div className="plan-preview-price"><strong>R$ 0</strong><span>/mês</span></div>
          </div>

          <div className="onboarding-benefits"><span>✓ Dashboard financeiro</span><span>✓ Vendas e despesas</span><span>✓ Produtos e clientes</span><span>✓ Relatórios essenciais</span></div>

          <div className="saas-actions split-actions">
            <button className="secondary-button" type="button" onClick={() => setEtapa(2)}>Voltar</button>
            <button className="secondary-button" type="button" onClick={verPlanos}>Conhecer planos</button>
            <button className="primary-button saas-primary" type="button" onClick={entrarNoNexo}>Entrar no Nexo</button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
