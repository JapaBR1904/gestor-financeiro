"use client";
import { useWorkspace, avisarWorkspace } from "../../lib/workspace";
import { Icone } from "../../components/Icone";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  OBJETIVOS_POR_PERFIL,
  PerfilUso,
  carregarConfiguracaoSaas,
  nomePlano,
  salvarOnboardingNoBackend,
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
  const router = useRouter(); const { assinatura, usuario, config } = useWorkspace(); const trava = useRef(false);
  const [perfil, setPerfil] = useState<PerfilUso | null>(null);
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { let ativo = true; carregarConfiguracaoSaas().then(dados => { if (ativo) { setPerfil(dados.perfilUso); setObjetivos(dados.objetivos); } }).catch(e => { if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível carregar suas preferências."); }); return () => { ativo = false; }; }, []);

  const objetivosDisponiveis = useMemo(() => (perfil ? OBJETIVOS_POR_PERFIL[perfil] : []), [perfil]);

  function escolherPerfil(novoPerfil: PerfilUso) {
    setPerfil(novoPerfil);
    if (novoPerfil !== perfil) setObjetivos([]);
    setErro("");
  }

  function alternarObjetivo(objetivo: string) {
    setObjetivos((atuais) => atuais.includes(objetivo) ? atuais.filter((item) => item !== objetivo) : [...atuais, objetivo]);
  }

  function continuarPerfil() {
    if (!perfil) return;
    setEtapa(2);
  }

  function continuarObjetivos() {
    setEtapa(3);
  }

  function destinoInicial(perfilEscolhido: PerfilUso) {
    if (perfilEscolhido === "pessoal") return "/pessoal";
    if (perfilEscolhido === "empresa") return "/empresa";
    return "/";
  }

  async function persistir(concluido: boolean) {
    if (!perfil || trava.current) return false;
    trava.current = true;
    setErro("");
    setSalvando(true);
    try {
      await salvarOnboardingNoBackend(perfil, objetivos, concluido);
      avisarWorkspace();
      return true;
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar suas preferências.");
      return false;
    } finally {
      trava.current = false; setSalvando(false);
    }
  }

  async function entrarNoNexo() {
    if (!perfil) return;
    if (!await persistir(true)) return;
    router.push(destinoInicial(perfil));
    router.refresh();
  }

  async function verPlanos() {
    if (!perfil) return;
    if (!await persistir(false)) return;
    router.push("/planos?origem=onboarding");
  }

  if (usuario?.papel === "membro") return <main className="saas-shell"><section className="product-lock"><h1>Preferências do espaço</h1><p>O proprietário ou administrador define as preferências compartilhadas. Consulte sua conta para ver as escolhas atuais.</p><a className="primary-button" href="/conta">Voltar à conta</a></section></main>;
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
          <div className="saas-heading"><p className="eyebrow">Bem-vindo ao Nexo</p><h1>Como você pretende usar o Nexo?</h1><p>Essa escolha prepara sua experiência inicial. Você pode alterar depois nas configurações.</p></div>
          <div className="use-case-grid">
            {opcoes.map((opcao) => (
              <button className={`use-case-card${perfil === opcao.id ? " selected" : ""}`} key={opcao.id} aria-pressed={perfil === opcao.id} type="button" onClick={() => escolherPerfil(opcao.id)}>
                <span className="use-case-icon"><Icone nome={opcao.id === "pessoal" ? "movimentos" : opcao.id === "empresa" ? "empresa" : "venda"} /></span>
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
          <div className="saas-heading"><p className="eyebrow">Personalização</p><h1>O que você mais quer melhorar agora?</h1><p>Escolha quantos objetivos quiser. Isso vai ajudar o Nexo a destacar as informações mais úteis.</p></div>
          <div className="goal-choice-grid">
            {objetivosDisponiveis.map((objetivo) => (
              <button className={`goal-choice${objetivos.includes(objetivo) ? " selected" : ""}`} key={objetivo} aria-pressed={objetivos.includes(objetivo)} type="button" onClick={() => alternarObjetivo(objetivo)}>
                <span className="goal-choice-check">{objetivos.includes(objetivo) ? "✓" : "+"}</span><strong>{objetivo}</strong>
              </button>
            ))}
          </div>
          <div className="saas-actions split-actions"><button className="secondary-button" type="button" onClick={() => setEtapa(1)}>Voltar</button><button className="primary-button saas-primary" type="button" onClick={continuarObjetivos}>Continuar</button></div>
        </section>
      ) : null}

      {etapa === 3 ? (
        <section className="onboarding-card onboarding-plan-step">
          <div className="saas-heading"><p className="eyebrow">Tudo pronto</p><h1>Continue com seu plano e evolua quando precisar</h1><p>Suas preferências serão salvas no espaço atual. Compare os planos se precisar de mais recursos.</p></div>
          <div className="onboarding-plan-preview"><div className="plan-preview-main"><span className="plan-mini-label">Plano atual</span><strong>{config ? nomePlano(config.plano) : "Seu plano"}</strong><p>Operação essencial para conhecer o Nexo e organizar suas primeiras informações.</p></div><div className="plan-preview-price"><strong>{assinatura ? assinatura.plano.valorMensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</strong><span>/mês</span></div></div>
          <div className="onboarding-benefits"><span>✓ Dashboard financeiro</span><span>✓ Vendas e despesas</span><span>✓ Produtos e clientes</span><span>✓ Relatórios essenciais</span></div>
          {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
          <div className="saas-actions split-actions"><button className="secondary-button" type="button" onClick={() => setEtapa(2)} disabled={salvando}>Voltar</button><button className="secondary-button" type="button" onClick={verPlanos} disabled={salvando}>Conhecer planos</button><button className="primary-button saas-primary" type="button" onClick={entrarNoNexo} disabled={salvando}>{salvando ? "Salvando..." : "Entrar no Nexo"}</button></div>
        </section>
      ) : null}
    </main>
  );
}
