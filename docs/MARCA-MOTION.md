# Identidade e motion do Nexo

## Ponto de partida e preservação

Base: `59594f9414b892a4aa0184e2a53f28865e6c2111`, “Finaliza landing premium, responsividade e testes de entrada”. O checkout estava limpo em `nexo-next-spring`, com diff normal e staged vazios; o SHA remoto correspondia ao local. Nenhum trabalho anterior foi descartado.

Esta etapa modifica apresentação, componentes de marca, navegação visual, ícones e testes de navegador. Backend, migrations, bibliotecas de API, dependências/lockfiles e contratos de autenticação permanecem iguais à base. `/`, `/dashboard`, login, cadastro e demais destinos preservados. A conferência `git diff --name-only 59594f9 -- backend database frontend/lib frontend/package.json frontend/package-lock.json` não retorna arquivos.

## Identidade integrada

Não havia assets finais da nova marca no checkout. Foi construída uma versão vetorial conforme a descrição recebida: N de conexão, dois pontos circulares, gradiente azul/cyan e wordmark Nexo em Manrope. Não se trata de comparação pixel a pixel com um desenho externo, que não foi fornecido.

| Token | Valor / uso |
| --- | --- |
| `--brand-navy` | `#071426`, navegação, saldo, assinatura da marca |
| `--brand-blue` | `#2563EB`, ações e destaques |
| `--brand-blue-secondary` | `#3882F6`, gradiente e luz discreta |
| `--brand-cyan` | `#22D3EE`, pontos, indicadores e detalhes sobre navy |
| Branco | Superfícies e texto sobre fundos escuros |

Cyan não substitui texto de leitura sobre branco. Verde/vermelho continuam reservados a informações financeiras e estados semânticos. A fonte Manrope local foi preservada.

`Marca.tsx` é compartilhado por landing, header, login/cadastro, sidebar, planos, estados de carregamento e reveal. `useId` produz referências únicas de gradiente para as múltiplas instâncias. O wordmark continua sendo texto acessível. `app/icon.svg` entrega o favicon/app icon; `app/apple-icon.png` é a exportação de 180 px do mesmo vetor, e `app/manifest.ts` aponta para o SVG. O SVG tem 635 bytes e o PNG 5.529 bytes.

## Brand reveal

`BrandReveal.tsx` aparece somente na landing e usa `sessionStorage["nexo:brand-intro-seen"] = "1"`. A marcação acontece ao iniciar o frame da apresentação, evitando perder a animação no ciclo duplo de efeitos do Strict Mode em dev.

A sequência dura 1.200 ms em CSS, com remoção do nó em até 1.250 ms: halo discreto, traço do símbolo, dois pontos e wordmark, seguido da saída. A animação é decorativa, `aria-hidden`, não recebe foco, não bloqueia scroll e usa `pointer-events: none`. Um gesto de teclado ou ponteiro a dispensa imediatamente. Frames, timer e listeners são limpos; não há navegação, API ou sessão de autenticação envolvidos.

Refresh e retorno à landing na mesma sessão não repetem a apresentação. Com reduced-motion, ela não aparece. Se sessionStorage estiver indisponível, a interface abre diretamente. Nada aguarda o timer para funcionar.

O loading real do workspace e o “Preparando seu espaço…” já existente no cadastro usam a nova marca. Não foi inserido atraso nos redirects ou nas respostas de login/cadastro; se o dashboard estiver pronto, entra imediatamente.

## Sidebar e motion system

- Navy profundo, marca sobre navy, superfície ativa azul/navy e indicador cyan com entrada curta.
- Hover com deslocamento de 2 px e ícone em scale 1.04, mantendo targets e labels.
- Grupos existentes preservados, com chevron, `aria-controls` único, `aria-expanded` e conteúdo recolhido com `inert` + `aria-hidden`.
- A expansão usa grid de 0fr/1fr para acomodar o conteúdo; é uma transição pequena, acionada pelo usuário, sem leituras JS por frame. A opacidade/deslocamento do conteúdo complementa essa transição. Não se afirma que essa exceção de layout rode apenas no compositor.
- Drawer nativo, Escape, contenção/restauração do foco, papéis, locks, troca de organização e logout preservados.

| Movimento | Token |
| --- | --- |
| Feedback rápido / fechamento | `--motion-fast: 120ms` |
| Estados e interação | `--motion-normal: 260ms` |
| Entrada de destaque / progresso | `--motion-slow: 560ms` |
| Curvas | `--ease-standard`, `--ease-emphasized` |

Os tokens anteriores de duração/easing apontam para esse sistema. O reveal de marca tem sua própria sequência curta. `motion.css` concentra entrada escalonada das métricas e crescimento por scaleX das barras/metas, mantendo os valores reais finais. Botões têm hover discreto e compressão ao pressionar. Cartões financeiros informativos não saltam no hover.

## Landing, autenticação e dashboard

A estrutura e a copy da landing foram mantidas. O mock ganhou profundidade, tratamento navy/cyan no saldo, contorno suave, ponto de conexão decorativo, resposta discreta ao hover e entrada da meta. Seus dados fictícios continuam identificados e não há APIs.

`LandingMotion.tsx` usa dois IntersectionObservers: um para o header e outro para cinco grupos de seções. O header é transparente no topo e navy translúcido ao rolar. Sem JS/observer, conserva uma superfície clara legível. As seções já são visíveis antes da observação; a entrada é decorativa, sem esconder conteúdo abaixo da dobra. Observers e eventos são desconectados ao sair. Não há listener de scroll que atualize React a cada pixel.

Na revisão de contraste foram corrigidos dois problemas reais: a interpolação entre texto/fundo claros e escuros do header, e o fade de textos azuis abaixo de 4.5:1 durante o reveal. A mudança de tema do header agora é atômica; os reveals de seções/métricas usam deslocamento sem reduzir a opacidade do texto. A entrada geral mantém leitura desde o primeiro frame. Foco em popover claro permanece azul; sobre navy, cyan. A revisão da captura mobile encontrou ainda a interpolação de cor do ícone do menu, que agora muda junto com o fundo e tem uma verificação explícita no navegador. O foco dos botões de grupos fica dentro do componente, sem ser cortado pelo scroll do menu.

Login/cadastro reutilizam o AuthCard, a marca sobre navy, campos e mensagens existentes. A entrada do card e o foco usam os tokens comuns; não alteram autenticação, verificação ou recuperação. O dashboard destaca o saldo em navy, mantém entradas/saídas em superfícies claras e preserva verde/vermelho, números tabulares e hierarquia. Planos Pro/Business receberam acabamento coerente e hover; preço, recursos e checkout não foram alterados. A IA recebeu somente superfície, ícone e borda discretos, sem alteração de requisições, consentimento ou disponibilidade.

## Reduced-motion, mobile e performance

Movimento reduzido elimina intro, deslocamentos, progresso animado, efeitos ambientais e transições. Nenhuma informação depende de animação. Mobile reduz movimento ambiental e glow, mantém o drawer e conserva a informação essencial. A revisão cobre 1440, 1280, 1024, 768, 430, 390 e 360 px.

Não há dependência nova de aplicação, vídeo, canvas, WebGL ou partículas. O movimento usa principalmente transform/opacity; traçado SVG é pequeno e finito, e o acordeão é a exceção controlada de layout. O header não muda dimensões ao trocar de tema, e o reveal não ocupa espaço no fluxo. Isso não constitui uma medição de Core Web Vitals em produção.

## Validação e evidências

Validação final em 15/10/2026, no checkout desta etapa:

| Verificação | Resultado |
| --- | --- |
| `cd frontend && npm test` | 30 aprovados; zero falhas/ignorados |
| `npx --no-install tsc --noEmit` | Aprovado |
| `npm run lint` | Aprovado |
| `npm run build` | Aprovado; todas as rotas compiladas |
| `git diff --check` | Aprovado |
| Java completo + JAR (`mvn ... -Duser.timezone=America/Sao_Paulo verify`) | 243 testes aprovados; zero falhas, erros ou ignorados; JAR reempacotado |
| Playwright completo, verificação ON | 35 aprovados; 1 ignorado por exigir OFF |
| Playwright, verificação OFF | 3 aprovados; inclui cadastro direto real, refresh, logout/login e recuperação indisponível |
| Playwright após acabamento do menu | 8 aprovados; seis de marca, entrada pública e qualidade |

Os 36 cenários distintos de navegador foram exercitados entre os modos ON/OFF; as reexecuções não são contadas como cenários novos. O primeiro modo ignora somente o teste que exige cadastro direto OFF. A passagem completa incluiu planos (seis transições e persistência), checkout, financeiro, Pro, Business, equipe, documentos, downgrade preservando dados, autenticação, confirmação e recuperação, além de navegação/estados de erro.

A primeira execução Java em UTC terminou com 240 sucessos, 1 falha e 2 erros nos três testes de produto dependentes do fuso. A reexecução de `ProdutoIntegrationTest` em São Paulo passou os 18 casos; depois a suíte completa foi repetida com o mesmo fuso e passou os 243. Nenhuma asserção foi removida, relaxada ou alterada. A causa está documentada em “Limites e pendências reais”.

Para reproduzir a validação Java com a configuração existente de banco de teste:

```bash
mvn -f backend/pom.xml -Duser.timezone=America/Sao_Paulo verify
```

Os testes de integração exigem `NEXO_TEST_DB_URL` apontando para banco exclusivo de testes e suas credenciais locais; o coordenador Playwright exige a configuração de navegador descrita em [DEVELOPMENT.md](../DEVELOPMENT.md). Nesta execução foram usados `nexo_test`, Chromium headless, verificação ON/OFF por configuração de teste e transporte externo substituído pelas fixtures já existentes. Nenhuma credencial real foi necessária.

O novo `marca.spec.ts` verifica duração/remoção da intro, repetição por sessão, clique/teclado durante a apresentação, armazenamento bloqueado, reduced-motion, ícones/manifesto servidos, grupos com IDs únicos/inert, foco restaurado, navegação ativa, header claro/escuro, contraste do ícone mobile, Axe e ausência de overflow nas sete larguras. Os testes existentes continuam cobrindo valores máximos e zoom equivalente a 200%.

Evidências estruturadas, sem respostas privadas, cookies ou propriedades de ambiente:

- [Playwright ON completo](design/marca-motion/playwright-on.json), [OFF](design/marca-motion/playwright-off.json) e [refinamento final](design/marca-motion/playwright-refinamento-final.json).
- [Java inicial em UTC](design/marca-motion/backend-verify-inicial.json), [reexecução do produto](design/marca-motion/backend-reexecucao-fuso.json) e [Java completo final](design/marca-motion/backend-verify-final.json).

Nenhuma exceção JavaScript foi registrada. Os cenários de erro intencionais incluem HTTP 401/503/504 e falhas de transporte; não são apresentados como erros inesperados. Os novos cenários de marca terminaram sem erros de console. As verificações de apresentação usam fixtures sintéticas sem encaminhar APIs desconhecidas ao banco. A jornada integrada usa contas sintéticas no PostgreSQL `nexo_test`. Não foram usados dados de produção.

## Arquivos principais

- Marca: `frontend/components/Marca.tsx`, `BrandReveal.tsx`, `frontend/app/brand.css`, `icon.svg`, `apple-icon.png`, `manifest.ts`.
- Navegação: `frontend/components/Sidebar.tsx`, `Icone.tsx`, `frontend/app/navigation.css`.
- Sistema visual: `frontend/app/globals.css`, `motion.css` e imports em `layout.tsx`.
- Landing: `frontend/components/LandingMotion.tsx`, `frontend/app/page.tsx`, `landing.css`.
- Autenticação/carregamento: `frontend/app/auth.css`, `frontend/components/AuthCredentialsForm.tsx`, `WorkspaceProvider.tsx`.
- Componentes do produto: `frontend/app/product.css`, `saas.css`, `ia.css`.
- Verificação: `frontend/tests/e2e/marca.spec.ts` (seis cenários novos), `entrada.spec.ts` (flag visual para estabilizar os testes existentes), este relatório e `docs/design/marca-motion/`.

## Capturas revisadas

As imagens foram abertas e inspecionadas; os testes também percorreram as sete larguras. As capturas do app usam dados sintéticos. Dashboard mobile/sidebar usam fixtures de apresentação; dashboard desktop, financeiro, equipe, IA e planos vêm da jornada integrada com PostgreSQL de teste.

| Tela | Evidência |
| --- | --- |
| Landing desktop | [1440 px](design/marca-motion/landing-1440.png) |
| Landing mobile | [390 px](design/marca-motion/landing-390.png) |
| Hero | [Desktop](design/marca-motion/hero-1440.png) · [Mobile](design/marca-motion/hero-390.png) |
| Apresentação da marca | [Frame durante a animação](design/marca-motion/brand-intro.png) |
| Header ao rolar | [Desktop](design/marca-motion/header-recursos.png) · [Mobile](design/marca-motion/header-mobile-390.png) |
| Login | [Desktop](design/marca-motion/login-1440.png) · [Mobile](design/marca-motion/login-390.png) |
| Cadastro | [Desktop](design/marca-motion/cadastro-1440.png) · [Mobile](design/marca-motion/cadastro-390.png) |
| Dashboard | [Desktop](design/marca-motion/dashboard-1440.png) · [Mobile](design/marca-motion/dashboard-390.png) |
| Sidebar | [Desktop](design/marca-motion/sidebar-1440.png) · [Drawer mobile](design/marca-motion/sidebar-390.png) |
| Planos | [Comparação Free / Pro / Business](design/marca-motion/planos-1440.png) |
| Financeiro | [Despesas e navegação ativa](design/marca-motion/financeiro-1440.png) |
| Business | [Equipe](design/marca-motion/equipe-1440.png) |
| IA sem configuração externa | [Estado de indisponibilidade](design/marca-motion/ia-1440.png) |

## Limites e pendências reais

- Sem asset vetorial externo da marca, a versão implementada segue a descrição aprovada; um arquivo oficial futuro pode substituir o símbolo compartilhado.
- A suíte Java original tem três testes de produto dependentes do fuso local da JVM. Entre 00h e 03h UTC, os fixtures com `LocalDate.now()` podem cair no dia seguinte ao período padrão do serviço, que usa explicitamente São Paulo. O backend e os testes existentes não foram alterados nesta etapa visual; o comando de validação usa `-Duser.timezone=America/Sao_Paulo`. Os resultados iniciais e a reexecução estão preservados nas evidências.
- Envio externo de e-mail e IA real não foram reconfigurados nem exercitados com credenciais reais. Seus fluxos locais/estados e testes existentes foram preservados.
- Não houve medição de Core Web Vitals em produção ou revisão em dispositivos físicos; a revisão visual e funcional foi feita em Chromium real nas larguras descritas.
- Não há pendência visual conhecida que bloqueie esta entrega.

## Checkpoints

1. `9352de1c518dca1e85b1f0fe6b884197a9a22858` — Integra identidade oficial e brand reveal do Nexo.
2. `b0794a279df15e0c837bf943a0aadcb4ca674eb9` — Refina sidebar e motion system da interface.
3. `75583bbf627402ca597db8ec5d717de12b35917b` — Eleva landing, autenticação e dashboard visualmente.
4. Fechamento: **Finaliza polish futurista, acessibilidade e responsividade** — SHA completo e link entregues na mensagem final, após o push.

Cada checkpoint foi validado e enviado exclusivamente para `nexo-next-spring`, com SHA remoto confirmado. O commit final consolida a revisão e as evidências. Não houve merge, force push ou deploy. A referência remota inicial de main é `8247ee36393d4a275f68ee2f14ae738176a31466`.
