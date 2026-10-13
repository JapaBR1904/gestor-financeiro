# Nexo — revisão local de confiança e UX

## Checkpoint 0: escopo e critérios

Ponto de partida: `nexo-next-spring`, commit `8f31555bf18954190efef294b647661c829b1c68`, checkout limpo. Apenas esta branch existe localmente; `origin/main` aponta para `8247ee36393d4a275f68ee2f14ae738176a31466` e será apenas conferida. Sem push, merge, deploy ou publicação.

Ambiente: Java 21.0.12.1, Maven 3.9.11, Node 24.19, npm 11.9; Next 16.4/React 19.3/TypeScript 5.9 e lockfile existente. Serviços já presentes nas portas 3000, 8080, 55432 e 1040 foram preservados. As jornadas desta etapa usam uma porta de frontend separada (3100) e Spring em porta aleatória.

O banco exclusivo já utilizado e autorizado nas etapas anteriores respondeu como `nexo_test`, em loopback:55432, com 20 tabelas. Nenhum banco foi criado, migrado ou recriado. O banco `nexo` não é utilizado. Variáveis de testes e datasource são explicitamente direcionadas a `nexo_test` por processo. Nenhuma credencial é registrada neste relatório.

**GET pode escrever:** autenticação de sessão registra acesso e garante associação original; configuração SaaS e assinatura garantem registros auxiliares. Portanto, nem visitas autenticadas de leitura serão feitas nos servidores existentes, cujo destino não foi confirmado. Capturas de apresentação interceptam todas as APIs e bloqueiam qualquer chamada não prevista.

Baseline executada: `mvn verify`: 230 testes passaram, 1 teste de navegador ignorado por flag; frontend: 30 testes passaram, TypeScript, lint e build passaram. Integrações do backend executadas exclusivamente em `nexo_test`; nenhuma entrega externa de e-mail.

Plano de aceite:

1. Logout com confirmação real ou sessão expirada; retry visível; relatórios recuperam de 503; análise nunca associa números anteriores a filtro novo, e CSV só usa intervalo aplicado; onboarding bloqueia gravação quando preferências não carregaram.
2. Relatórios separam identidades homônimas, preservam snapshots, BigDecimal e isolamento; consultas em batch, com teste de crescimento constante.
3. Tokens e navegação: manter Manrope/azul, AA, drawer a partir de tablet e administração recolhível; URLs e recursos essenciais preservados.
4. Piloto Visão geral e listas: saldo primeiro, até cinco movimentos e categorias, um CTA, detalhes sob demanda e primeira tarefa opcional; captura e medição com a mesma fixture.
5. Onboarding, administração, IA, planos e checkout: menos ruído, consentimento explícito, condições essenciais sempre visíveis, objetivos ligados a próximas ações reais; nenhuma cobrança real.
6. Verificações backend/frontend/Playwright, sete larguras, teclado, zoom, reduced-motion, axe, rede/console e revisão do diff. Commits separados **somente locais**.

Capturas `antes` e proposta utilizam apenas dados sintéticos de apresentação; não comprovam persistência ou autorização. A validação integrada será relatada separadamente. Não houve teste humano de usabilidade.

## Checkpoint 1 — confiança

Corrigidos logout com retry sem falso sucesso, relatório com limpeza de erro/controle de resposta obsoleta, análise com atualização explícita e CSV bloqueado enquanto filtros não correspondem ao resultado, e preferências de onboarding com erro visível e gravação bloqueada até leitura bem-sucedida. A trava de logout impede envios simultâneos. HTTP 401 no logout aceita sessão já expirada; offline/503 não redirecionam.

Validação: 30 testes frontend, TypeScript e lint passaram; build de produção passou dentro do Playwright. Cinco novos cenários isolados de navegador passaram: offline/503/duplo clique/retry de logout, sessão expirada, relatório 503→200, análise lenta/fora de ordem/503→200/exportação, e onboarding 503→200 sem gravação. Esses cenários usam fixtures de apresentação e não comprovam revogação real do cookie; os testes HTTP existentes do backend e a jornada integrada final verificam esse contrato.

O runner passou a aceitar porta de frontend de teste explícita para não encerrar serviços existentes. Sem alteração no CORS de produção. Os seletores dos novos testes foram limitados ao conteúdo da aplicação para não confundir o anunciador de rotas do Next com alertas do produto.

## Semântica definida para checkpoint 2, antes dos cálculos

Produtos: identidade composta por ID do produto e nome registrado no item da venda. Renomear o catálogo não reescreve vendas; snapshots de nomes distintos continuam separados. Produtos diferentes com o mesmo nome deixam de se juntar. Clientes: ID estável e nome atual, pois não existe snapshot de nome de cliente. Clientes removidos/sem vínculo não entram no ranking de clientes; as vendas continuam nos totais. Um cliente legitimamente chamado “Sem cliente identificado” deve aparecer. Todo o histórico comercial e fórmulas de faturamento, custo, lucro bruto e resultado permanecem iguais, com BigDecimal.
