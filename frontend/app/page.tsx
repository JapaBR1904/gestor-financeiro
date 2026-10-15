import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "../components/Marca";
import { Icone, type NomeIcone } from "../components/Icone";
import { LandingMenu } from "../components/LandingMenu";
import "./landing.css";
import { LandingMotion } from "../components/LandingMotion";
import { BrandReveal } from "../components/BrandReveal";

export const metadata: Metadata = {
  title: "Nexo — Suas finanças, finalmente claras",
  description:
    "Organize receitas e despesas, acompanhe seu dinheiro e planeje os próximos passos. Um espaço para você, seu negócio e sua equipe.",
};
const recursos: {
  icone: NomeIcone;
  grupo: string;
  titulo: string;
  texto: string;
  detalhes: string;
}[] = [
  {
    icone: "movimentos",
    grupo: "Finanças",
    titulo: "Cada movimento faz sentido.",
    texto:
      "Saiba o que entrou, o que saiu e o que ficou. Sem juntar informações espalhadas.",
    detalhes:
      "Visão financeira e lançamentos no Free. Registre receitas e despesas, organize categorias e consulte seus relatórios comerciais.",
  },
  {
    icone: "meta",
    grupo: "Planejamento",
    titulo: "O próximo passo, à vista.",
    texto:
      "Encontre espaço para seus objetivos e acompanhe o caminho até eles.",
    detalhes:
      "No Pro e Business: metas, fluxo de caixa, comparativos e exportação CSV para aprofundar sua análise.",
  },
  {
    icone: "ia",
    grupo: "Inteligência",
    titulo: "Uma boa pergunta muda a visão.",
    texto:
      "Explore seus números com um assistente conectado ao contexto financeiro que você escolher compartilhar.",
    detalhes:
      "Assistente disponível nos planos Pro e Business, quando o serviço de IA estiver configurado. Você decide quando incluir o resumo financeiro. As respostas apoiam sua análise; a decisão continua sendo sua.",
  },
  {
    icone: "equipe",
    grupo: "Negócios",
    titulo: "Cresça sem perder o controle.",
    texto:
      "Um espaço organizado para trabalhar com outras pessoas, cada uma com seu acesso.",
    detalhes:
      "O Business reúne equipe de até 10 pessoas, proprietário incluído, papéis, convites, organizações e documentos. Free e Pro são de uso individual.",
  },
];

function Demonstracao() {
  return (
    <div className="landing-demo-wrap">
      <div className="landing-orbit" aria-hidden="true" />
      <section
        className="landing-demo"
        aria-label="Demonstração do painel com dados fictícios"
      >
        <div className="demo-top">
          <span className="demo-mark">
            <Marca /> Nexo <span>/ Visão geral</span>
          </span>
          <span className="demo-label">Demonstração</span>
        </div>
        <div className="demo-heading">
          <span>Seu mês, em perspectiva</span>
          <span>Junho · exemplo</span>
        </div>
        <div className="demo-balance">
          <div>
            <span>Saldo do mês</span>
            <strong>
              R$ 8.420<span>,00</span>
            </strong>
            <small>Entradas menos saídas</small>
          </div>
          <span className="demo-balance-icon">
            <Icone nome="fluxo" />
          </span>
        </div>
        <div className="demo-totals">
          <div>
            <span>
              <Icone nome="venda" /> Entradas
            </span>
            <strong>R$ 12.500,00</strong>
          </div>
          <div>
            <span>
              <Icone nome="despesa" /> Saídas
            </span>
            <strong>R$ 4.080,00</strong>
          </div>
        </div>
        <div className="demo-chart">
          <div>
            <strong>O dinheiro em movimento</strong>
            <span>Entradas no mês</span>
          </div>
          <svg
            viewBox="0 0 420 100"
            role="img"
            aria-label="Gráfico ilustrativo de entradas, sem dados reais"
          >
            <defs>
              <linearGradient
                id="landing-chart-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop stopColor="currentColor" stopOpacity=".2" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="demo-grid" d="M0 20H420 M0 55H420 M0 90H420" />
            <path
              fill="url(#landing-chart-fill)"
              d="M0 88 42 74 84 80 126 55 168 64 210 41 252 48 294 22 336 32 378 12 420 5V100H0Z"
            />
            <path
              className="demo-line"
              d="m0 88 42-14 42 6 42-25 42 9 42-23 42 7 42-26 42 10 42-20 42-7"
            />
          </svg>
          <div className="demo-axis">
            <span>01 jun</span>
            <span>15 jun</span>
            <span>30 jun</span>
          </div>
        </div>
        <div className="demo-bottom">
          <div>
            <span>Última movimentação</span>
            <strong>Projeto entregue</strong>
            <small>Receita · Serviços</small>
          </div>
          <strong>+ R$ 2.400,00</strong>
        </div>
        <div className="demo-goal">
          <span>
            <Icone nome="meta" /> Reserva do negócio <strong>70%</strong>
          </span>
          <div>
            <i />
          </div>
          <small>R$ 7.000 de R$ 10.000 · exemplo</small>
        </div>
      </section>
      <div className="demo-insight">
        <span>
          <Icone nome="ia" /> Uma perspectiva a mais
        </span>
        <p>Quanto posso reservar para o próximo mês?</p>
        <small>Perguntas melhores. Decisões mais claras.</small>
      </div>
      <p className="demo-caption">
        Uma prévia do Nexo. Todos os valores são fictícios.
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="landing">
      <BrandReveal />
      <LandingMotion />
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link
            href="/"
            className="landing-brand"
            aria-label="Nexo — página inicial"
          >
            <Marca />
            Nexo<span>Clareza para ir além.</span>
          </Link>
          <nav className="landing-desktop-nav" aria-label="Navegação pública">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
          </nav>
          <div className="landing-header-actions">
            <Link href="/login">Entrar</Link>
            <Link className="landing-button" href="/cadastro">
              Criar conta <Icone nome="seta" />
            </Link>
          </div>
          <LandingMenu />
        </div>
      </header>
      <main id="conteudo" tabIndex={-1}>
        <section className="landing-hero">
          <div className="landing-aurora" aria-hidden="true" />
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">
                <span /> Um novo olhar para o seu dinheiro
              </p>
              <h1>
                Suas finanças,
                <br />
                finalmente <em>claras.</em>
              </h1>
              <p className="landing-lead">
                Organize o que entra e sai, entenda seus resultados e planeje o
                próximo passo. Para sua vida, seu negócio e sua equipe.
              </p>
              <div className="landing-cta-row">
                <Link href="/cadastro" className="landing-button">
                  Começar agora <Icone nome="seta" />
                </Link>
                <Link className="landing-secondary" href="/login">
                  Já tenho conta <span>Entrar</span>
                </Link>
              </div>
              <p className="landing-hero-note">
                Comece no Free. Evolua quando fizer sentido.
              </p>
              <a className="landing-explore" href="#como-funciona">
                Conhecer o Nexo <span aria-hidden="true">↓</span>
              </a>
            </div>
            <Demonstracao />
          </div>
        </section>
        <section
          data-reveal
          id="como-funciona"
          className="landing-section landing-container"
        >
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Menos ruído. Mais direção.</p>
            <h2>
              Do registro à decisão.
              <br />
              Sem perder o fio.
            </h2>
            <p>
              Você não precisa de mais uma planilha. Precisa de uma visão que
              conecte as peças.
            </p>
          </div>
          <ol className="landing-steps">
            {[
              [
                "01",
                "Organize",
                "Tudo começa com o que acontece hoje.",
                "Registre suas receitas e despesas e mantenha sua movimentação no mesmo lugar.",
              ],
              [
                "02",
                "Entenda",
                "Transforme números em perspectiva.",
                "Acompanhe saldo e resultados. Avance para metas, fluxo e comparativos quando precisar.",
              ],
              [
                "03",
                "Decida",
                "Escolha seu próximo passo com clareza.",
                "Enxergue prioridades e use o assistente como apoio para explorar suas perguntas.",
              ],
            ].map(([numero, titulo, chamada, texto]) => (
              <li key={numero}>
                <span className="landing-step-number">{numero}</span>
                <h3>{titulo}</h3>
                <strong>{chamada}</strong>
                <p>{texto}</p>
              </li>
            ))}
          </ol>
        </section>
        <section data-reveal id="recursos" className="landing-features">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">
                Um espaço. Diferentes possibilidades.
              </p>
              <h2>
                O essencial no centro.
                <br />O resto, ao seu alcance.
              </h2>
              <p>
                Comece pelo controle do dia a dia. Acrescente planejamento e
                colaboração no seu ritmo.
              </p>
            </div>
            <div className="landing-feature-grid">
              {recursos.map((item) => (
                <article className="landing-feature" key={item.grupo}>
                  <span className="landing-feature-icon">
                    <Icone nome={item.icone} />
                  </span>
                  <p className="landing-eyebrow">{item.grupo}</p>
                  <h3>{item.titulo}</h3>
                  <p>{item.texto}</p>
                  <details>
                    <summary>Explorar recursos</summary>
                    <p>{item.detalhes}</p>
                  </details>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section data-reveal className="landing-container landing-benefit">
          <div>
            <p className="landing-eyebrow">Clareza muda a rotina</p>
            <h2>
              Menos tempo juntando números.
              <br />
              Mais tempo olhando adiante.
            </h2>
          </div>
          <ul>
            <li>
              <Icone nome="check" />
              <span>Saiba para onde seu dinheiro está indo.</span>
            </li>
            <li>
              <Icone nome="check" />
              <span>Perceba diferenças antes que virem surpresa.</span>
            </li>
            <li>
              <Icone nome="check" />
              <span>Acompanhe seu negócio sem informações espalhadas.</span>
            </li>
          </ul>
        </section>
        <section data-reveal id="planos" className="landing-section landing-container">
          <div className="landing-section-heading landing-heading-centered">
            <p className="landing-eyebrow">Seu momento. Seu plano.</p>
            <h2>
              Espaço para começar.
              <br />
              Estrutura para crescer.
            </h2>
            <p>
              Crie sua conta no Free. Conheça as opções de evolução dentro do
              Nexo.
            </p>
          </div>
          <div className="landing-plans">
            {[
              {
                id: "free",
                nome: "Free",
                preco: "0",
                descricao: "Seu primeiro passo, bem organizado.",
                recursos: [
                  "Receitas, despesas e visão financeira",
                  "Relatórios comerciais",
                  "Uso individual",
                ],
                cta: "Começar no Free",
              },
              {
                id: "pro",
                nome: "Pro",
                preco: "39",
                descricao: "Perspectiva para planejar melhor.",
                recursos: [
                  "Tudo do Free",
                  "Metas, fluxo, comparativos e CSV",
                  "Assistente IA · uso individual",
                ],
                cta: "Conhecer o Pro",
              },
              {
                id: "business",
                nome: "Business",
                preco: "99",
                descricao: "Seu negócio, trabalhando em sintonia.",
                recursos: [
                  "Tudo do Pro",
                  "Equipe de até 10 pessoas e permissões",
                  "Organizações e documentos",
                ],
                cta: "Conhecer o Business",
              },
            ].map((plano) => (
              <article
                key={plano.id}
                data-plan={plano.id}
                className="landing-plan"
                aria-label={`Plano ${plano.nome}`}
              >
                <div className="landing-plan-top">
                  <h3>{plano.nome}</h3>
                  {plano.id === "pro" ? (
                    <span>Para ir além</span>
                  ) : plano.id === "business" ? (
                    <Icone nome="empresa" />
                  ) : (
                    <Icone nome="conta" />
                  )}
                </div>
                <p>{plano.descricao}</p>
                <div className="landing-price">
                  <span>R$</span> {plano.preco}
                  <small>/mês</small>
                </div>
                <ul>
                  {plano.recursos.map((recurso) => (
                    <li key={recurso}>
                      <Icone nome="check" />
                      {recurso}
                    </li>
                  ))}
                </ul>
                <Link
                  className={
                    plano.id === "pro" ? "landing-button" : "landing-plan-link"
                  }
                  href="/cadastro"
                >
                  {plano.cta}
                  <Icone nome="seta" />
                </Link>
              </article>
            ))}
          </div>
          <p className="landing-plan-note">
            Business: proprietário incluído no limite de pessoas. IA depende da
            disponibilidade do serviço.
            <br />A assinatura é apresentada dentro do produto; esta página não
            realiza cobranças.
          </p>
        </section>
        <section
          className="landing-trust landing-container"
          aria-label="Seus dados e seu espaço"
        >
          <span>
            <Icone nome="cadeado" /> Acesso vinculado à sua conta
          </span>
          <span>
            <Icone nome="documento" /> Downgrade preserva seus dados
          </span>
          <span>
            <Icone nome="empresa" /> Espaços com acessos separados
          </span>
        </section>
        <section data-reveal className="landing-final landing-container">
          <div>
            <p className="landing-eyebrow">O próximo passo é seu</p>
            <h2>
              Comece a enxergar suas
              <br />
              finanças com clareza.
            </h2>
            <p>
              Um lugar para organizar o presente e pensar no que vem depois.
            </p>
          </div>
          <div>
            <Link href="/cadastro" className="landing-button">
              Criar conta <Icone nome="seta" />
            </Link>
            <Link href="/login" className="landing-final-login">
              Já tem uma conta? Entrar
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <Link href="/" className="landing-brand">
          <Marca />
          Nexo
        </Link>
        <p>Clareza para ir além.</p>
        <nav aria-label="Rodapé">
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <Link href="/login">Entrar</Link>
        </nav>
        <small>© {new Date().getFullYear()} Nexo</small>
      </footer>
    </div>
  );
}
