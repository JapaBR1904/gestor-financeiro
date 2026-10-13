# Sistema visual do Nexo

Direção: verde profundo, superfícies claras e acolhedoras, tipografia editorial contida e leitura financeira precisa. Profundidade por contraste, borda e sombras leves; movimento apenas para navegação, estados e elementos interativos.

## Organização

- `frontend/app/globals.css`: tokens, reset, tipografia, botões, campos e superfícies compartilhadas.
- `navigation.css`: navegação, contexto da organização e drawer mobile nativo de `dialog`.
- `product.css`: módulos financeiros, metas, estados vazios, organização e Business.
- `tables.css` e `refinement.css`: históricos comerciais e relatórios.
- `auth.css`, `saas.css`, `checkout.css`, `pro.css` e `ia.css`: composição dos respectivos fluxos.

As antigas camadas `polish.css`, `signature.css` e `saas-extra.css` foram removidas. Estilos utilizados do onboarding foram incorporados a `saas.css`. Novos estilos devem usar os tokens, em vez de acrescentar overrides decorativos ao final de outra folha.

## Tipografia e movimento

Manrope variável, subset Latin (acentos portugueses incluídos), hospedada localmente via `next/font/local`, com `display: swap` e fallback ajustado pelo Next. Arquivo WOFF2 de 24,8 KB proveniente de `@fontsource-variable/manrope@5.3.0`, obtido pelo npm com verificação de integridade; licença SIL OFL em `frontend/app/fonts/OFL.txt`. Não há dependência JavaScript nova nem requisição externa de fontes em runtime ou build.

Tokens de movimento: 140, 220 e 320 ms. Entrada de conteúdo, mensagens e progressos usa opacity/transform; os estados interativos usam transições curtas. `prefers-reduced-motion: reduce` desativa animações e transições globalmente.

## Preservação

APIs, autorização, planos, contratos de autenticação e provedores de e-mail são preservados. Revisão visual usa apenas o banco dedicado `nexo_test`, contas sintéticas e serviços locais, sem publicação.

## Checkpoint da base

TypeScript, lint, build de todas as rotas e 25 testes unitários passaram. Primeira inspeção no Chromium em 1440 e 390 px verificou a fonte carregada, ausência de overflow horizontal e fechamento por Escape com retorno de foco no menu mobile. A passagem completa das telas e demais larguras continua nos próximos blocos.

## Checkpoint financeiro

Cards de saldo com contraste próprio e ícones funcionais, tabela móvel com data/categoria/ações preservadas e gráficos baseados nos valores retornados pelo backend. O gráfico diário possui eixos legíveis, legenda, consulta por ponteiro, controle de dia operável por teclado/toque e tabela alternativa. Metas concluídas recebem tratamento discreto e progresso animado.

Os 10 cenários de Playwright passaram contra backend e PostgreSQL reais de teste, incluindo as seis transições de plano, persistência, permissões, convite, documentos, cadastro e recuperação. O teste de membro foi direcionado à lista de equipe: o novo nome de usuário na navegação tornou o antigo seletor global ambíguo. Nenhuma asserção funcional foi removida.
