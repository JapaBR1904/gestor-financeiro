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

## Checkpoint 2 — relatório

Reprodução integrada, em transações sintéticas revertidas: antes, 1 venda fazia 5 consultas e 100 vendas faziam 104; homônimos/snapshots esperados em 3 grupos eram reduzidos a 2. Depois: **4 consultas para 1 e 100 vendas**, com projeção em batch dos itens e clientes carregados junto às vendas. Os tempos medidos nessa passagem (132/163 ms antes, 157/47 ms depois) incluem aquecimento e não constituem benchmark estatístico de latência; o resultado estável é o número de consultas.

Adicionados IDs aos rankings e às chaves React. Ranking completo disponível, com os cinco primeiros mantidos na apresentação e expansão para os demais. Consultas filtram organização; itens conferem também organização da venda e produto. Cliente sem vínculo não entra no ranking, mas sua venda segue nos totais. Precisão, fórmulas e fontes financeiras preservadas.

Os testes de relatório cobrem homônimos, centavos, nomes históricos do produto, cliente atual/inativo/sem vínculo e outra organização. Detectado também um problema antigo no SQL: a FK composta de cliente usa `ON DELETE SET NULL` nas duas colunas, incompatível com organização obrigatória. A aplicação inativa clientes; não foi alterada essa regra nem aplicada migração. Exclusão física com vendas fica como backlog que exige análise/migração autorizada. Nenhum registro existente foi apagado; a tentativa com fixture foi revertida.

## Navegação e direção visual

Financeiro agrupa Visão geral, Lançamentos e Análises. Análises mantém URLs de Fluxo de caixa, Metas e Relatórios comerciais e seus gates Pro, sem bloquear o relatório essencial do Free. Operação aparece apenas para negócio/empresa. Operação e Gestão são recolhíveis; a rota ativa mantém seu grupo expandido. Sidebar navy preservada, seleção azul suave e sem glow. Contexto de organização no cabeçalho é texto; o seletor único continua na sidebar. Drawer abaixo de 1024 px, itens de 44 px, foco nativo/trap/Escape/retorno ao botão e scroll preservados.

Tokens centralizados: fundo neutro, superfícies claras, borda de controle mais contrastante, texto AA, ação azul e ciano pontual. Manrope local permanece. Conteúdo até 1280 px, sidebar 232 px, escala espacial existente. Movimento: 120/180/220 ms, entrada de 4 px, drawer de 16 px; botões não saltam. Fundo de acolhimento estático, sem aurora contínua em telas autenticadas; skeleton usa apenas opacidade durante espera. Não foi adicionada dependência.

Fontes: lançamentos manuais se somam a vendas/despesas comerciais no resumo financeiro, sem replicar registros. Análises usam intervalo escolhido; Relatórios comerciais usam todo o histórico comercial e excluem movimentos manuais. Essa distinção permanece explícita na interface.

Checkpoint 3 validado: TypeScript, lint e build passaram; seis cenários Playwright passaram, incluindo os cinco de confiança e navegação nas sete larguras, grupos recolhidos, foco contido, Escape/retorno e reduced-motion. Capturas sintéticas de dashboard desktop/mobile em `docs/design/ux-navegacao`; o layout financeiro ainda será refinado no próximo checkpoint.

## Checkpoint 4 — financeiro e listas

Saldo vem antes de entradas/saídas, com destaque azul suave; indicadores estáticos não têm hover de botão ou entrada escalonada. Dashboard mostra cinco movimentos, com descrição/data/origem/valor, e cinco categorias; o restante é somado em “Outras categorias”. Período e intervalo são visíveis; ajustes ficam sob “Alterar período”. Os três cards permanentes de propaganda foram removidos. Dados e CSV deixam de aparecer como atuais durante consulta pendente ou erro.

Lançamentos mantêm colunas essenciais no desktop e layout adaptado no celular; ações por linha usam disclosure com nome acessível. Empty state diferencia período filtrado de início de uso. Campos são preservados quando salvar falha. Relatórios indicam todo o histórico comercial e revelam metodologia/rankings sob demanda. Metas ativas vêm primeiro e concluídas ficam em seção recolhível, sem mudar progresso/arquivo. Metas passaram a reutilizar o tratamento comum de rede/500/401, com os mesmos endpoints e contratos.

Validação: 30 testes frontend, TypeScript/lint/build passaram. Oito cenários Playwright passaram: sete cenários isolados de confiança/navegação/edição e a jornada com backend/PostgreSQL reais envolvendo lançamentos, Pro, Business, convite, documentos, duas organizações e downgrade com dados preservados. Capturas sintéticas desktop/mobile em `docs/design/ux-financeiro`.

## Checkpoint 5 — preferências, administração, IA e planos

Onboarding: títulos curtos, uma descrição por perfil, benefício complementar após seleção, três focos atuais por perfil e conclusão “Começar a usar”. Objetivos anteriores permanecem salvos; não há migração. Guia inicial opcional no dashboard usa preferências/dados reais do período e links disponíveis pelo plano/papel. Dispensa fica no navegador, por usuário e organização; não é sincronização entre dispositivos e não grava exemplos.

Organização prioriza nome/papel/plano/espaços, sem buscar ou repetir o dashboard financeiro. Renomear fica em “Configurações do espaço”. Falha na atualização global limpa o contexto anterior e mostra retry/entrada, evitando dados associados ao espaço errado. Equipe tem convite sob demanda, capacidade em uma linha e ajuda de papéis junto à seleção; convites/histórico são recolhíveis. Documentos abrem upload quando solicitado, ou no vazio inicial; limites continuam junto ao envio e o conteúdo não é aberto/enviado à IA automaticamente.

IA: pergunta e três sugestões compactas, leitura de até 72 caracteres, espera apenas durante processamento, resumo desmarcado por padrão e contexto associado à pergunta efetivamente enviada. Timeout preserva a pergunta; consentimento é explícito. Sem novas dependências ou serviço externo.

Planos: até cinco benefícios por card, condições/limites visíveis, catálogo completo em “Comparar todos os recursos”. O Pro indica planejamento individual sem popularidade inventada. Checkout tem formulário principal e resumo lateral compacto, resumo primeiro no celular, benefícios em detalhes e avisos críticos de downgrade visíveis. Sucesso exige escolha explícita do próximo passo, sem redirecionamento automático em quatro segundos. Natureza simulada, backend, idempotência e permissões não mudaram.

Validação deste bloco: frontend 30 testes, TypeScript/lint/build passaram. A suíte de 24 cenários passou em 23 casos; o teste restante foi ajustado para abrir o upload antes de procurar o formulário. A repetição da jornada financeira integrada e das telas públicas/IA/upload passou (2 cenários). Axe passou nas 46 análises da segunda execução completa. A consolidação final repetirá a suíte completa, sem ignorar cenários. Corrigido contraste dos badges de plano nos itens ativos, identificado pelo axe.


## Bugs: evidência e limites

| Prioridade/severidade | Evidência no início | Correção e verificação |
|---|---|---|
| Alta — logout sem confirmação | Estática: `finally` sempre redirecionava, mesmo com fetch rejeitado | Retry fica na tela; POST confirmado/401 permitem saída. Offline, 503, clique repetido e retry cobertos por fixture; revogação real coberta pelos testes HTTP existentes |
| Média — relatório com erro antigo | Estática: sucesso não limpava erro e retry não marcava loading | Fixture 503→200 verifica dados e remoção do alerta; respostas obsoletas ignoradas |
| Alta — análise/exportação ambíguas | Estática: números antigos continuavam visíveis durante filtro novo e exportação permanecia habilitada | Respostas lentas/fora de ordem, atualização explícita, CSV no intervalo aplicado e retry 503→200 verificados |
| Alta — preferências sobrescritas sem leitura | Estática: erro inicial só aparecia na etapa final | Erro visível na etapa atual; opções/progressão/save bloqueados até leitura; fixture verifica zero gravações e preferências recuperadas |
| Alta — homônimos unidos no relatório | Reproduzida: 3 identidades/snapshots esperados viravam 2 grupos | Integração real verifica separação, ID, snapshots, centavos e exclusão de outra organização |
| Média — N+1 de relatório | Reproduzida: 5 consultas para 1 venda, 104 para 100 | 4 consultas no serviço para ambos os tamanhos; batch e clientes carregados juntos |
| Alta — contexto antigo após falha de troca | Estática: erro mantinha usuário/configuração anteriores | Fixture simula mudança de espaço seguida de 503, verifica ausência dos números/contexto anteriores e recuperação no destino |
| Média — badge ativo com baixo contraste | Reproduzida pelo axe em recursos bloqueados | Texto/borda próprios para seleção azul suave; axe passou após ajuste |
| Backlog — exclusão física de cliente vinculado | Reproduzida somente com registro sintético e rollback: FK composta tenta zerar organização obrigatória | Aplicação continua usando inativação; nenhuma migração aplicada. Não se propõe exclusão física nessa etapa |

Os problemas de estado foram identificados estaticamente antes das correções; os testes de navegador demonstram o comportamento corrigido com falhas controladas, não uma reprodução executada do código antigo. As reproduções de agrupamento/N+1 e contraste tiveram resultados antes/depois. A percepção de entendimento em poucos segundos continua sendo hipótese: não houve estudo humano de usabilidade.

## Componentes e preservação

Principais arquivos: `frontend/components/Sidebar.tsx`, `WorkspaceShell.tsx`, `WorkspaceProvider.tsx`, `FinanceiroConteudo.tsx`, `AnaliseConteudo.tsx`, `NavegacaoAnalises.tsx`, `PrimeirosPassos.tsx`, `EmpresaConteudo.tsx`, `EquipeConteudo.tsx`, `DocumentosConteudo.tsx`, `IaConteudo.tsx`, `PlanosConteudo.tsx`, `CheckoutConteudo.tsx`, `AssinaturaConteudo.tsx`; páginas de onboarding/metas/relatórios; helpers auth/metas/relatórios/SaaS. Backend produtivo limitado a `RelatorioService`, `VendaRepository` e `VendaItemRepository`.

CSS refatorado gradualmente: globals, navigation, ambient, auth, product, saas, ia e checkout. Nenhuma biblioteca adicionada. Manrope, lockfile, dependências, layout raiz e migrations preservados. CSS passou de 4.559 para cerca de 4.360 linhas, sem camada extensa de overrides. Controles mantêm foco visível; números extensos recebem espaço próprio no celular. Sem contador animado de valores, loops ambientes, salto de botão ou reanimação de gráfico a cada filtro.

Quick wins entregues: retries claros, filtros coerentes com números/CSV, organização única e identificável, saldo primeiro, listas menores no dashboard, formulários/detalhes sob demanda, tutorial dispensável, respostas IA sem ruído e preços/limites legíveis.

Backlog maior: testes humanos de tarefas/leitor de tela real; agregação/paginação no banco para históricos muito grandes (o benchmark desta etapa usa 100 vendas, não escala de produção); eventual snapshot de cliente requer decisão funcional/migração autorizada; correção da FK de exclusão física exige migração autorizada. Cobrança real e SMTP externo não foram ativados/testados. Não foram implementados recorrência, Open Finance, ERP, app nativo, gamificação ou IA autônoma.


## Validação final e evidências

- `mvn verify`: **234 testes, zero falhas/erros/ignorados**, incluindo integrações em `nexo_test` e o coordenador de navegador; JAR produzido.
- Frontend: **30 testes passaram**, `npx --no-install tsc --noEmit`, `npm run lint` sem erros/avisos e `npm run build` passaram. O build final também iniciou como frontend de produção local.
- Playwright: **25 cenários passaram na suíte completa**, com os 14 existentes preservados e 11 novos. Depois foi acrescentado um cenário para membro no guia vazio; os dois testes de guia passaram em execução focada (26 cenários distintos aprovados no conjunto). Repetidos após refinamento de foco/valores extensos; o cenário de geometria foi repetido com fixture financeiramente coerente (uma receita máxima e despesas que compõem o saldo).
- Axe: 46 análises em desktop/celular e uma com comparação expandida/reflow de 720 CSS px, sem violações. Mais quatro análises nos planos/checkout reais após refinamento final, sem violações.
- Teclado: grupos recolhidos, Tab/Shift+Tab, Enter, Escape, foco contido/retorno e scroll do drawer; foco de campo conferido no produto real (outline sólido de 2 px). Reduced-motion remove animações e transições. Leitor de tela real não estava disponível; isso não é prova de teste com NVDA/VoiceOver.
- Zoom de 200%: reflow equivalente de desktop 1440 para 720 CSS px. Não foi usado zoom da interface gráfica do Chrome; essa distinção é intencional.
- Console/rede: 25 registros sanitizados, nenhuma exceção JavaScript. 11 respostas negativas intencionais (401/503/504) e um aborto offline produziram 12 mensagens de recurso do Chromium. Nenhuma resposta inesperada nos caminhos positivos; [registros](design/ux-observacoes.json). Resend/SMTP/Gemini externos não foram utilizados.

Passagem adicional no JAR real, frontend de produção local e banco exclusivo: 120 capturas, 17 telas em sete larguras (mais login), zero overflow/exceções/erros de console/rede. Tudo com conta/arquivos sintéticos preexistentes em `nexo_test`. E-mail e IA externos desativados; nenhum banco criado, migrado ou recriado.

Uma jornada adicional pelo simulador real executou Business→Free, Free→Pro, Pro→Business, Business→Pro, Pro→Free e Free→Business, com refresh após cada confirmação. Plano final Business. As contagens permaneceram **2 movimentações, 1 meta e 2 documentos** antes/depois. Recursos Pro/Business, permissões/convites/organizações e preservação no downgrade também foram verificados pela suíte integrada. [Evidência dessa passagem](design/ux-integrado/verificacao.json).

### Capturas e comparação

Dados de apresentação interceptados, separados da API real, mesmas dimensões/fixture: [antes](design/ux-antes/), [proposta local](design/ux-proposta/composicao.html), [depois](design/ux-depois/). A apresentação da IA configurada é fixture; a captura integrada mostra o serviço indisponível, sem esconder essa condição.

| Tela | Antes | Depois | Produto/JAR real em banco de testes |
|---|---|---|---|
| Dashboard desktop | [1440](design/ux-antes/dashboard-1440.png) | [1440](design/ux-depois/dashboard-1440.png) | [1440](design/ux-integrado/dashboard-1440.png) |
| Dashboard mobile | [390](design/ux-antes/dashboard-390.png) | [390](design/ux-depois/dashboard-390.png) | [390](design/ux-integrado/dashboard-390.png) |
| Lançamentos | [1440](design/ux-antes/lancamentos-1440.png) | [1440](design/ux-depois/lancamentos-1440.png) | 7 larguras na passagem de 120 capturas |
| IA | [1440](design/ux-antes/ia-1440.png) | [1440](design/ux-depois/ia-1440.png) | [Estado real](design/ux-integrado/ia-1440.png) |
| Planos | [1440](design/ux-antes/planos-1440.png) | [1440](design/ux-depois/planos-1440.png) | [1440](design/ux-integrado/planos-1440.png) |
| Organização | [1440](design/ux-antes/organizacao-1440.png) | [1440](design/ux-depois/organizacao-1440.png) | [1440](design/ux-integrado/organizacao-1440.png) |

Mais evidências reais: [login](design/ux-integrado/login-1440.png), [equipe mobile](design/ux-integrado/equipe-390.png), [documentos](design/ux-integrado/documentos-1440.png), [checkout mobile](design/ux-integrado/checkout-390.png), [foco](design/ux-integrado/formulario-foco-360.png). [Valores altos, fixture coerente](design/ux-finais/valores-altos-360.png).

Além das capturas versionadas, 57 capturas sintéticas das oito telas piloto/públicas nas sete larguras ficaram em `/workspace/nexo-ux/revisao-final`; a passagem integrada completa está em `/workspace/nexo-ux/integrado`. Nenhuma captura versionada contém cookie, senha, código ou documento privado. Arquivos são de apresentação/teste.

### Medição de tempo

Chromium instalado, produção local, viewport 1440/390, mesma fixture, APIs interceptadas, CPU simulada 4× mais lenta, navegação até conteúdo/fontes prontos. Valores abaixo são uma amostra por situação, **não percentis, Core Web Vitals ou estudo de percepção humana**. Sem base estatística para prometer melhora global; telas rápidas variam com aquecimento/escalonamento. Movimentos contínuos, efeitos pesados e parte do DOM visível foram reduzidos.

| Tela/largura | Antes (ms) | Depois (ms) |
| dashboard / 1440 | 1001 | 1101 |
| lancamentos / 1440 | 487 | 580 |
| ia / 1440 | 304 | 295 |
| planos / 1440 | 421 | 261 |
| organizacao / 1440 | 353 | 349 |
| dashboard / 390 | 516 | 510 |
| lancamentos / 390 | 419 | 531 |
| ia / 390 | 319 | 278 |
| planos / 390 | 265 | 251 |
| organizacao / 390 | 332 | 290 |

[Dados antes](design/ux-antes/medidas.json) e [depois](design/ux-depois/medidas.json). O benchmark do relatório mede separadamente número de consultas constante, sem extrapolar latência para escala de produção.

### Reproduzir sem segredos

Em ambiente já preparado, com banco **exclusivo previamente autorizado** e schema existente; nunca `nexo`. Configure `NEXO_TEST_DB_URL`, `NEXO_TEST_DB_USERNAME` e `NEXO_TEST_DB_PASSWORD` de forma segura no processo. Não copie credenciais para este arquivo. Confira `current_database()` em conexão de leitura antes de rodar. Os testes não criam schema; não execute migrations/createdb como parte desta revisão.

```sh
cd backend
mvn verify
```

Para incluir o coordenador Playwright, defina `NEXO_E2E=true` e uma porta livre em `NEXO_E2E_PORT` (esta etapa usou 3100). Defina `NEXO_BROWSER_EXECUTABLE` somente se usar Chromium já instalado. Esse runner inicia Spring em porta aleatória e monta contas sintéticas no banco de testes; sem flags, o navegador é explicitamente ignorado. Um filtro opcional `NEXO_E2E_GREP` permite repetir apenas cenários afetados.

```sh
cd frontend
npm test
npx --no-install tsc --noEmit
npm run lint
npm run build
```

Os cenários `confianca.spec.ts` e `qualidade.spec.ts` interceptam APIs; podem rodar isoladamente para testar apresentação/estado. Não equivalem a validação integrada. `assinatura.spec.ts` exige o coordenador/banco exclusivo. Resend/SMTP externos exigem configuração e destinatário autorizado em uma etapa própria.

Para subir **desenvolvimento local**, `SPRING_PROFILES_ACTIVE=dev` habilita o simulador por padrão em `application-dev.properties`. `prod`/`production` continuam bloqueados mesmo com a flag incorreta; essa política não foi alterada. A conexão com qualquer banco de destino precisa ser definida explicitamente; não use os comandos de inicialização contra `nexo` para esta revisão.

### Commits e entrega

Todos os commits são locais em `nexo-next-spring`; nenhum push, merge, deploy ou publicação. `origin/main` permaneceu em `8247ee36393d4a275f68ee2f14ae738176a31466`; não há checkout de `main` neste ambiente.

| Checkpoint | Hash | Mensagem |
|---|---|---|
| 1 | `7a6e387340e873726f8943e99e53f52ef8541ccf` | Corrige estados de sessão, análise e onboarding |
| 2 | `c191c396218e7e5d9f73f8ecc378a5cbf048787d` | Separa homônimos e elimina N+1 dos relatórios |
| 3 | `69efc9e23aff9826e595315e8071a0b55eec865a` | Organiza navegação e consolida tokens de interface |
| 4 | `5faa092c5c08eae03237c1322bd713a107981a37` | Prioriza saldo e tarefas nas telas financeiras |
| 5 | `f17fbde29be4effecc3255136ddebd25c32f7ad2` | Simplifica onboarding, gestão, IA e escolha de planos |
| Final | Hash de HEAD informado no chat | Conclui revisão de confiança, acessibilidade e UX do Nexo |

O checkout final é revisável localmente. Um bundle local contendo apenas os commits posteriores ao ponto de partida permite preservar os checkpoints sem publicar no GitHub; exige o commit base `8f31555bf18954190efef294b647661c829b1c68`. Não altera o remoto nem inclui a branch main.


Último acabamento: Business mostra documentos entre os cinco benefícios principais; condições repetidas foram reduzidas e resumo mobile do checkout compactado, mantendo preço e avisos. Os quatro checks axe e as seis transições adicionais foram feitos após esses ajustes. O guia vazio recomenda consulta a membros, com teste de papel e sem ação de gestão.

Privacidade dos logs: dois testes independentes adicionais passaram para máscara de cookie completo, código e token base64url com hífens nas extremidades. São testes de arquivo temporário sintético, sem banco. Eles verificam que o diagnóstico não sensível permanece legível. Total backend: suíte completa de 234 e esses 2 testes novos em execução focada; nenhum teste existente removido.
