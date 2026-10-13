"use client";
import { Marca } from "../../components/Marca";
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
  const etapaAnterior = useRef(etapa);
  useEffect(() => { if (etapaAnterior.current !== etapa) { document.querySelector<HTMLElement>(".onboarding-card h1")?.focus(); etapaAnterior.current = etapa; } }, [etapa]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [preferenciasCarregadas, setPreferenciasCarregadas] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    carregarConfiguracaoSaas().then(dados => {
      if (ativo) { setPerfil(dados.perfilUso); setObjetivos(dados.objetivos); setErroCarregamento(""); setPreferenciasCarregadas(true); }
    }).catch(e => { if (ativo) setErroCarregamento(e instanceof Error ? e.message : "Não foi possível carregar suas preferências."); });
    return () => { ativo = false; };
  }, [tentativa]);

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
    if (!perfil || !preferenciasCarregadas) return;
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
    if (!perfil || !preferenciasCarregadas || trava.current) return false;
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
    if (!perfil || !preferenciasCarregadas) return;
    if (!await persistir(true)) return;
    router.push(destinoInicial(perfil));
    router.refresh();
  }

  async function verPlanos() {
    if (!perfil || !preferenciasCarregadas) return;
    if (!await persistir(false)) return;
    router.push("/planos?origem=onboarding");
  }

  if (usuario?.papel === "membro") return <main id="conteudo" tabIndex={-1} className="saas-shell"><section className="product-lock"><h1 tabIndex={-1}>Preferências do espaço</h1><p>O proprietário ou administrador define as preferências compartilhadas. Consulte sua conta para ver as escolhas atuais.</p><a className="primary-button" href="/conta">Voltar à conta</a></section></main>;
  return (
    <main id="conteudo" tabIndex={-1} className="saas-shell onboarding-shell">
      <section className="saas-brandbar">
        <div className="saas-brand"><span><Marca /></span><div><strong>Nexo</strong><small>Seu espaço financeiro</small></div></div>
        <div className="onboarding-progress" aria-label={`Etapa ${etapa} de 3`}>
          <span className={etapa >= 1 ? "active" : ""} />
          <span className={etapa >= 2 ? "active" : ""} />
          <span className={etapa >= 3 ? "active" : ""} />
          <small>Etapa {etapa} de 3</small>
        </div>
      </section>

      {erroCarregamento ? <p className="form-error-banner" role="alert">{erroCarregamento} Suas preferências não foram alteradas. <button className="text-button" onClick={() => { setErroCarregamento(""); setTentativa(t => t + 1); }}>Tentar novamente</button></p> : !preferenciasCarregadas ? <p role="status">Carregando suas preferências…</p> : null}
      {etapa === 1 ? (
        <section className="onboarding-card" key={etapa}>
          <div className="saas-heading"><p className="eyebrow">Bem-vindo ao Nexo</p><h1 tabIndex={-1}>Como você pretende usar o Nexo?</h1><p>Essa escolha prepara sua experiência inicial. Você pode alterar depois nas configurações.</p></div>
          <div className="use-case-grid">
            {opcoes.map((opcao) => (
              <button className={`use-case-card${perfil === opcao.id ? " selected" : ""}`} key={opcao.id} aria-pressed={perfil === opcao.id} type="button" disabled={!preferenciasCarregadas} onClick={() => escolherPerfil(opcao.id)}>
                <span className="use-case-icon"><Icone nome={opcao.id === "pessoal" ? "movimentos" : opcao.id === "empresa" ? "empresa" : "venda"} /></span>
                <span className="use-case-copy"><strong>{opcao.titulo}</strong><span>{opcao.descricao}</span><small>{opcao.detalhe}</small></span>
                <span className="use-case-check">{perfil === opcao.id ? <Icone nome="check" /> : null}</span>
              </button>
            ))}
          </div>
          <div className="saas-actions"><button className="primary-button saas-primary" type="button" disabled={!perfil || !preferenciasCarregadas} onClick={continuarPerfil}>Continuar</button></div>
        </section>
      ) : null}

      {etapa === 2 ? (
        <section className="onboarding-card" key={etapa}>
          <div className="saas-heading"><p className="eyebrow">Personalização</p><h1 tabIndex={-1}>O que você mais quer melhorar agora?</h1><p>Escolha quantos objetivos quiser. Isso vai ajudar o Nexo a destacar as informações mais úteis.</p></div>
          <div className="goal-choice-grid">
            {objetivosDisponiveis.map((objetivo) => (
              <button className={`goal-choice${objetivos.includes(objetivo) ? " selected" : ""}`} key={objetivo} aria-pressed={objetivos.includes(objetivo)} type="button" onClick={() => alternarObjetivo(objetivo)}>
                <span className="goal-choice-check">{objetivos.includes(objetivo) ? <Icone nome="check" /> : <Icone nome="mais" />}</span><strong>{objetivo}</strong>
              </button>
            ))}
          </div>
          <div className="saas-actions split-actions"><button className="secondary-button" type="button" onClick={() => setEtapa(1)}>Voltar</button><button className="primary-button saas-primary" type="button" onClick={continuarObjetivos} disabled={!preferenciasCarregadas}>Continuar</button></div>
        </section>
      ) : null}

      {etapa === 3 ? (
        <section className="onboarding-card onboarding-plan-step" key={etapa}>
          <div className="saas-heading"><p className="eyebrow">Tudo pronto</p><h1 tabIndex={-1}>Continue com seu plano e evolua quando precisar</h1><p>Suas preferências serão salvas no espaço atual. Compare os planos se precisar de mais recursos.</p></div>
          <div className="onboarding-plan-preview"><div className="plan-preview-main"><span className="plan-mini-label">Plano atual</span><strong>{config ? nomePlano(config.plano) : "Seu plano"}</strong><p>Seu plano acompanha este espaço. Comece agora e compare opções quando precisar.</p></div><div className="plan-preview-price"><strong>{assinatura ? assinatura.plano.valorMensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</strong><span>/mês</span></div></div>
          <div className="onboarding-benefits"><span><Icone nome="check" />Dashboard financeiro</span><span><Icone nome="check" />Vendas e despesas</span><span><Icone nome="check" />Produtos e clientes</span><span><Icone nome="check" />Relatórios essenciais</span></div>
          {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
          <div className="saas-actions split-actions"><button className="secondary-button" type="button" onClick={() => setEtapa(2)} disabled={salvando || !preferenciasCarregadas}>Voltar</button><button className="secondary-button" type="button" onClick={verPlanos} disabled={salvando || !preferenciasCarregadas}>Conhecer planos</button><button className="primary-button saas-primary" type="button" onClick={entrarNoNexo} disabled={salvando || !preferenciasCarregadas}>{salvando ? "Salvando..." : "Entrar no Nexo"}</button></div>
        </section>
      ) : null}
    </main>
  );
}
