"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Icone, type NomeIcone } from "./Icone";

const perfis: {
  id: string;
  nome: string;
  icone: NomeIcone;
  titulo: string;
  texto: string;
  cards: { rotulo: string; valor: string; legenda: string }[];
  passos: string[];
}[] = [
  {
    id: "pessoal", nome: "Para você", icone: "conta",
    titulo: "Seu dinheiro, com uma direção.",
    texto: "Registre suas entradas e gastos. Consulte o período e acompanhe seus objetivos sem informações espalhadas.",
    cards: [
      { rotulo: "Entradas do período", valor: "R$ 4.500", legenda: "Registros de exemplo" },
      { rotulo: "Saídas do período", valor: "R$ 2.800", legenda: "Gastos de exemplo" },
      { rotulo: "Resultado do período", valor: "R$ 1.700", legenda: "Entradas menos saídas" },
    ],
    passos: ["Registre uma entrada ou um gasto", "Confira suas categorias", "Planeje uma meta no Pro"],
  },
  {
    id: "negocio", nome: "Seu negócio", icone: "produto",
    titulo: "Da primeira venda à visão do todo.",
    texto: "Conecte produtos, clientes, vendas e despesas. Consulte custos e histórico comercial para entender seu negócio.",
    cards: [
      { rotulo: "Vendas registradas", valor: "12 vendas", legenda: "Não comprova recebimento" },
      { rotulo: "Produtos no catálogo", valor: "8 produtos", legenda: "Preços e custos organizados" },
      { rotulo: "Clientes cadastrados", valor: "24 clientes", legenda: "Histórico no mesmo espaço" },
    ],
    passos: ["Cadastre seu primeiro produto", "Registre uma venda", "Consulte o histórico comercial"],
  },
  {
    id: "empresa", nome: "Sua equipe", icone: "equipe",
    titulo: "Mais pessoas. O mesmo contexto.",
    texto: "No Business, organize o trabalho da equipe com papéis, convites e documentos do espaço atual.",
    cards: [
      { rotulo: "Pessoas no espaço", valor: "3 de 10", legenda: "Proprietário incluído" },
      { rotulo: "Papéis da equipe", valor: "3 papéis", legenda: "Acessos por responsabilidade" },
      { rotulo: "Documentos", valor: "Um espaço", legenda: "Arquivos da organização" },
    ],
    passos: ["Organize seu espaço", "Convide sua equipe no Business", "Compartilhe documentos do negócio"],
  },
];

export function ApresentacaoNexo() {
  const [selecionado, setSelecionado] = useState("pessoal");
  const prefixo = useId();
  const perfil = perfis.find((item) => item.id === selecionado)!;
  return (
    <section className="nexo-showcase landing-container" aria-labelledby={`${prefixo}-titulo`}>
      <div className="nexo-showcase-heading">
        <div>
          <p className="landing-eyebrow">Veja. Explore. Comece.</p>
          <h2 id={`${prefixo}-titulo`}>Conheça o Nexo em 35 segundos.</h2>
          <p>Uma apresentação rápida para encontrar seu primeiro passo.</p>
        </div>
        <a className="nexo-showcase-jump" href={`#${prefixo}-explorar`}>Explorar por perfil <Icone nome="seta" /></a>
      </div>
      <figure className="nexo-film">
        <video
          controls playsInline preload="none" width="1280" height="720"
          poster="/media/nexo-apresentacao.png"
          aria-label="Apresentação do Nexo em 35 segundos, com textos na tela e sem áudio"
          aria-describedby={`${prefixo}-legenda`}
        >
          <source src="/media/nexo-em-35-segundos.webm" type="video/webm" />
          <track kind="captions" src="/media/nexo-apresentacao.vtt" srcLang="pt-BR" label="Português" />
          Seu navegador não reproduz este vídeo. Leia as etapas da apresentação abaixo.
        </video>
        <figcaption id={`${prefixo}-legenda`}>Vídeo sem áudio, com textos na tela. Demonstração ilustrativa com dados fictícios.</figcaption>
      </figure>
      <div id={`${prefixo}-explorar`} className="nexo-explorer">
        <div className="nexo-explorer-top">
          <span className="nexo-live-label"><span aria-hidden="true" /> Uma prévia do seu espaço</span>
          <span className="nexo-example-label">Dados fictícios</span>
        </div>
        <div className="nexo-profile-picker" role="group" aria-label="Escolha um perfil de demonstração">
          {perfis.map((item) => <button
            key={item.id} type="button" aria-pressed={selecionado === item.id}
            aria-controls={`${prefixo}-preview`} onClick={() => setSelecionado(item.id)}
          ><Icone nome={item.icone} />{item.nome}</button>)}
        </div>
        <div id={`${prefixo}-preview`} className="nexo-preview" aria-live="polite" aria-atomic="true">
          <div className="nexo-preview-copy" key={perfil.id}>
            <h3>{perfil.titulo}</h3><p>{perfil.texto}</p>
            <div className="nexo-preview-cards">
              {perfil.cards.map((card) => <div className="nexo-preview-card" key={card.rotulo}>
                <span>{card.rotulo}</span><strong>{card.valor}</strong><small>{card.legenda}</small>
              </div>)}
            </div>
            <ol className="nexo-preview-steps">{perfil.passos.map((passo, index) => <li key={passo}><span>{index + 1}</span>{passo}</li>)}</ol>
          </div>
        </div>
        <div className="nexo-explorer-bottom">
          <p>Seu resultado do período não é saldo disponível. Os recursos variam conforme o plano.</p>
          <Link className="landing-button" href="/cadastro">Começar no meu ritmo <Icone nome="seta" /></Link>
        </div>
      </div>
      <details className="nexo-film-transcript">
        <summary>Ler a apresentação completa</summary>
        <ol>
          <li><strong>Seu espaço:</strong> escolha Pessoal, Negócio ou Empresa.</li>
          <li><strong>Organize:</strong> registre movimentações e cadastre produtos e clientes.</li>
          <li><strong>Acompanhe:</strong> consulte vendas, despesas, custos e histórico comercial. Uma venda registrada não comprova recebimento.</li>
          <li><strong>Entenda:</strong> escolha o período e consulte entradas, saídas e resultado. Resultado não é saldo disponível; faturamento não é lucro.</li>
          <li><strong>Planeje:</strong> Pro e Business oferecem metas, fluxo, comparativos e CSV.</li>
          <li><strong>Colabore:</strong> Business oferece equipe, papéis e documentos. O assistente IA depende do serviço configurado e usa somente o contexto autorizado.</li>
          <li><strong>Comece:</strong> Free R$ 0, Pro R$ 39 e Business R$ 99 por mês. A página inicial não realiza cobranças.</li>
        </ol>
      </details>
    </section>
  );
}
