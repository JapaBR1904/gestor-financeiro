# Confiabilidade e integridade financeira — Fase 1

## Base e escopo

Base `109e1e7e0798a5210709fcdcbb894cb0199a12df`, branch `nexo-next-spring`. Checkout inicialmente limpo, atualizado por fast-forward a partir de `b3c09a5`. O relatório **REVISAO-SENIOR-NEXO.md** de 15/10/2026 foi lido integralmente, incluindo critérios e limites das evidências. Somente A01, A02, A03, A04, A05, A07, A09 e A18 fazem parte desta implementação. Recomendações dos demais achados não foram incorporadas.

## A01 — Modelo de contexto

Antes, o cookie compartilhava uma sessão cuja organização podia mudar em outra aba. A operação resolvia a organização atual no servidor, sem saber qual espaço a tela exibia.

As APIs de operação agora exigem `X-Nexo-Organizacao`. O interceptor autentica a sessão, valida o vínculo ativo no espaço informado e compara com o espaço selecionado. O cabeçalho não concede acesso: espaço sem vínculo recebe 403; sessão ausente/expirada, 401; contexto ausente/desatualizado, 409 com `erro=contexto_desatualizado`; ID malformado, 400. CORS permite explicitamente o cabeçalho.

O usuário autorizado fica vinculado à requisição, impedindo que uma segunda leitura da sessão no controller escolha outra organização. Uma operação aceita antes da troca pode concluir no espaço original autorizado; nunca é redirecionada ao destino novo. Operações que chegam com o contexto antigo após a troca recebem conflito. A regressão concorrente verifica esse ponto de corte e o destino no banco.

A proteção cobre criação/edição/exclusão financeira, vendas, despesas, produtos, clientes, metas, relatórios, CSV, IA e documentos (incluindo upload/download), assinatura e equipe. Autenticação e comandos intencionais de selecionar/criar/listar espaços e aceitar/consultar convite mantêm seus controles próprios e não dependem de uma tela operacional já carregada.

No frontend, a identidade é carregada antes de configuração/assinatura, que levam o mesmo espaço esperado. A camada comum captura espaço/geração no envio, cancela operações em andamento e descarta respostas antigas, inclusive leitura do corpo e arquivos. CSV e download de documento ainda validam a geração imediatamente antes de disparar o download, sem outro await entre a validação e o efeito no navegador. Troca entre abas usa BroadcastChannel/storage, com revalidação ao voltar à aba; listeners são removidos no cleanup. Um conflito do servidor também invalida a tela. Formulários e consentimentos do espaço anterior são desmontados, com aviso explícito, antes de mostrar o destino. Não há reenvio automático de gravações ou de consentimento da IA.

### Validação deste bloco

- Java focado: `ContextoOrganizacaoIntegrationTest`, `AssinaturaIntegrationTest`, `ProdutoIntegrationTest`: **44 aprovados**.
- Cenários novos: header ausente/forjado, A → B e B → A, operações/CSV/IA/documentos desatualizados e troca durante gravação com verificação no PostgreSQL.
- Testes HTTP anteriores passam a declarar explicitamente o contexto esperado. As asserções de autorização permanecem.
- Chromium com banco real: **4 aprovados**, incluindo os dois cenários novos de duas abas/IA e as regressões existentes de troca com erro e deep link. A primeira execução identificou somente um seletor novo com rótulo antigo; foi corrigido para “Nova movimentação”, sem alterar o produto.
- TypeScript/lint e build de produção usados pelo Playwright aprovados. Capturas em `docs/design/confiabilidade/`.
- Fechamento geral será consolidado após os próximos blocos.

## A02 — Ficha técnica não registra compra

Removido o acoplamento de `ProdutoService` com `DespesaService` e a chamada de criação implícita de despesas. Criar/editar ingredientes só persiste referência de custo e consumo. Uma compra continua sendo registrada explicitamente no módulo de despesas, com data/valor definidos pelo usuário; nenhum novo workflow de compras foi inventado. Despesas históricas não são apagadas ou reinterpretadas.

A regressão cria um produto de R$ 50, referência de farinha de R$ 20/kg e consumo de 100 g: custo R$ 2, nenhuma despesa nova. Repetir a edição mantém o mesmo resultado e preserva a compra histórica sintética já existente.

## A03 — Custo incompleto, desconhecido e zero

Criação/edição reutilizam `validarFicha`: somente linha completamente vazia é ignorada. Nome/preço sem quantidades deixa os campos inválidos, com descrição de erro associada, preserva o texto digitado e impede a requisição. Preço zero explícito é aceito; unidade incompatível recebe validação. Os textos falam em referência de custo, não em compra.

Sem ficha, custo/lucro/margem aparecem como **Custo não informado**, inclusive nos resumos, em vez de assumir margem igual ao preço. A API representa custo desconhecido por NULL e zero conhecido por 0. A venda preserva essa distinção no snapshot; atualizar a ficha depois não reescreve custo das vendas anteriores. Se o histórico agregado contém venda sem custo, custo total/lucro bruto são desconhecidos, enquanto faturamento e resultado antes dos custos continuam calculados. O contexto da IA identifica a incompletude e não interpreta NULL como zero.

A migração nova `12_custo_desconhecido.sql` permite NULL nos campos de custo/lucro de vendas/itens e exige coerência entre esses campos. Não muda valores existentes. Foi aplicada somente em `nexo_test`; requer aplicação administrativa uma vez no banco de destino antes de usar o backend atualizado. Os scripts 01–11 não foram modificados.

## A18 — Contrato monetário e estrutural

`ValidacaoFinanceira` define NUMERIC(14,2): até 12 dígitos inteiros, 2 casas e máximo 999.999.999.999,99. Valores enviados com casas extras são rejeitados, sem arredondamento implícito. Quantidades de ficha seguem NUMERIC(14,4), positivas. Resultados derivados mantêm HALF_UP em duas casas e também passam pelo limite antes de persistir snapshots/totais. Despesas, produto, lançamento manual, metas e vendas seguem essas regras comuns.

Listas de ingredientes/itens exigem elementos não nulos. A resposta 400 identifica `campos`, incluindo `ingredientes[0]`/`itens[0]`; campos estruturais/tipos inválidos mantêm 400, sem SQL/stack trace. A camada comum frontend apresenta a primeira mensagem de campo. O banco mantém suas constraints de faixa/coerência.

### Validação de custo/contrato

- Frontend: **45 testes aprovados**, incluindo 15 novos casos de ficha, zero/ausência, unidades, precisão e limite; TypeScript/lint aprovados.
- Navegador real: fluxo completo de criação parcial → validação sem POST → ficha válida com custo R$ 2 e zero despesas → edição parcial → custo zero explícito → produto sem ficha com custo/lucro NULL; aprovado. A grade da ficha foi ajustada localmente para caberem os erros de campo; os controles e mensagens foram conferidos sem cortes nas sete larguras.
- Java: precisão/faixa/null e totais derivados, snapshots desconhecidos preservados, custo zero e contexto de IA incompleto. **32 aprovados** nas suítes focadas de integridade financeira, produto, relatório e contexto IA.
- A primeira execução nova de teste Java omitia a data obrigatória da despesa; a fixture foi completada para verificar o campo monetário de fato. No E2E, o seletor de alert foi restringido para distinguir a mensagem da aplicação do anunciador de rota do Next. Nenhuma asserção de domínio foi enfraquecida.

## A04 — Venda idempotente

`POST /api/vendas` exige `Idempotency-Key` (UUID). A chave é escopada à organização e à operação de venda, com constraint de unicidade no banco. Um lock transacional por organização/chave serializa concorrência antes de criar qualquer venda/item. O fingerprint SHA-256 usa o payload normalizado versionado; o resultado original completo fica em JSONB junto da venda, no mesmo commit. Payload diferente com a mesma chave recebe 409 `idempotencia_conflitante`, sem disparar a troca de contexto do frontend.

Retry idêntico devolve o resultado original, mesmo se o catálogo mudou depois. Uma falha de validação não reserva a chave. O formulário gera uma chave na primeira tentativa e a conserva nos retries, inclusive após resposta perdida; não troca automaticamente a chave para contornar um conflito de payload. Após conflito, é possível restaurar o payload original e recuperar o resultado. Uma nova abertura do formulário representa outra intenção e recebe outra chave. Vendas legítimas com chaves diferentes não são deduplicadas por valor/data.

Se uma criação for repetida após cancelamento, o snapshot de criação continua sendo o resultado original; GET/detalhe devolve o estado atual cancelado. O retry não reativa nem duplica a venda.

## A05 — Cancelamento rastreável

`POST /api/vendas/{id}/cancelamento` exige motivo de 3–500 caracteres e gestão autorizada. A contagem mínima considera pontos de código Unicode: dois emojis são rejeitados com 400, antes de chegar à constraint SQL. Proprietário pode cancelar; administrador somente no contexto Business válido; membro e usuário de outro espaço são recusados pelo servidor. O serviço revalida o papel, além do interceptor.

A venda original e seus itens/valores permanecem. São gravados status `cancelada`, motivo, ator e timestamp UTC com precisão de microssegundos do PostgreSQL. Um lock na venda serializa confirmações; repetir o cancelamento preserva o primeiro autor/motivo/data. Não há DELETE nem lançamento manual negativo de compensação.

Vendas canceladas são excluídas do faturamento, custos/lucro agregados, itens/rankings comerciais, consultas por período e exportação financeira. Lançamentos manuais, despesas e outras vendas permanecem. A exclusão vale nas consultas de qualquer período; o registro original segue no histórico com badge e motivo. Isso corrige registros do produto; não representa devolução bancária ou cancelamento de cobrança externa.

A UI oferece “Cancelar venda”, confirmação com motivo, estado ocupado, erro recuperável, Escape/foco e histórico após refresh. A migração incremental `13_vendas_idempotencia_cancelamento.sql` adiciona unicidade/snapshot e metadados de cancelamento com constraints. Foi aplicada apenas em `nexo_test`; deve ser aplicada uma vez no destino após a `12`, antes do backend atualizado.

### Validação de vendas

- Cinco testes Java novos: POSTs concorrentes + retry após edição de catálogo; payload diferente 409; chave independente por organização; chave obrigatória/validação; cancelamento com preservação e reflexo nas análises; permissões de proprietário/administrador/membro e isolamento. **Todos aprovados**.
- As outras 27 regressões focadas de custo/produto/relatório passaram na primeira execução. O teste novo de timestamp revelou diferença nanosegundo/microssegundo na repetição; a gravação foi corrigida e os cinco testes foram reexecutados com sucesso, sem relaxar a comparação.
- E2E com PostgreSQL: servidor confirma e a resposta é abortada; alteração de payload recebe conflito; restauração + clique duplo recupera a única venda com a mesma chave; confirmação de cancelamento, Escape/foco, refresh, histórico e exclusão dos totais. **Aprovado**. Erro de transporte/409 nesse caso são intencionais.
- TypeScript/lint e build de produção usados pelo navegador aprovados. Capturas de confirmação/cancelamento mobile em `docs/design/confiabilidade/`.

## A07 — Contexto operacional comum

Quinze páginas de produtos, vendas, despesas e clientes passaram a usar `WorkspaceShell`, inclusive estados de carregamento/erro (18 estruturas anteriores). Foram preservados os cabeçalhos, ações, campos e estados dos formulários; o shell aceita o cabeçalho já existente para evitar reconstruir cada tela. A barra compartilhada mostra nome do espaço, plano/conta e copiloto quando aplicável; a preferência de privacidade fica acessível também no mobile. Sidebar, rotas e regras de papel/plano foram mantidas. Não foi reorganizada a navegação nem implementado A16.

A regressão percorre listas, criação, detalhes e edições desses quatro módulos em 1440, 430, 390 e 360 px (60 combinações), verificando espaço visível, controle de privacidade, heading e ausência de overflow. A nova venda recebeu Axe em desktop/mobile. **Aprovado**.

## A09 — Privacidade documental

`TextoProtegidoIa` reutiliza a mesma condição de privacidade no histórico do chat e na análise documental. Quando Ocultar valores está ativo, pergunta e resposta completas deixam de ser renderizadas, em vez de tentar identificar somente trechos com moeda. O campo de pergunta fica protegido até a pessoa revelar para editar; o nome no título da análise também é protegido. Os textos continuam no estado, sem apagar a pergunta ou o resultado.

O aviso explica que a proteção é somente visual: não altera o arquivo, não revoga conteúdo já enviado e não anonimiza downloads. A análise e seus consentimentos continuam dependendo da organização correta (A01); nenhuma integração externa nova foi criada.

A regressão envia um arquivo sintético real ao backend, autoriza análise, esconde os valores enquanto a resposta está pendente e recebe uma resposta IA sintética contendo moeda. Pergunta/resultado não aparecem no DOM; revelar recupera o conteúdo; esconder novamente protege. Os bytes do download original permanecem idênticos. Somente status/resposta de IA foram simulados, sem chamada externa ao Gemini. O teste anterior do chat Pro também passou. **Três testes de navegador aprovados** neste bloco, além de TypeScript/lint/build.

## Fechamento

Os oito achados autorizados estão implementados. Não houve mudança nas regras de autenticação, recuperação, Resend, planos ou checkout. Não há dependência nova de aplicação e o CSS recebeu somente o ajuste local da grade da ficha técnica e da mensagem de erro no diálogo de cancelamento.

### Validação integrada

- `mvn -f backend/pom.xml verify`: **267 aprovados, zero falhas/erros e um coordenador de navegador ignorado intencionalmente nessa execução**; JAR gerado com sucesso. Todos os testes de integração tinham `NEXO_TEST_DB_URL` apontando para `nexo_test`; todos os testes de integração de domínio foram executados. Os nomes e contagens por suíte estão em [backend-verify-final.json](design/confiabilidade/backend-verify-final.json).
- Na primeira passagem completa, as asserções passaram, mas sete casos não conseguiram iniciar contextos Spring porque os pools somados alcançaram o limite de 100 conexões do PostgreSQL. O Surefire agora limita **somente o processo de testes** a quatro conexões por pool, sem mínimo ocioso. A execução completa foi repetida com sucesso. O pool da aplicação não foi alterado. A falha inicial está registrada em [backend-verify-primeira-passagem.json](design/confiabilidade/backend-verify-primeira-passagem.json).
- Playwright completo com verificação de e-mail ON: **56 aprovados e um caso exclusivo de OFF ignorado**, incluindo as seis jornadas desta fase e as regressões existentes de autenticação, assinatura, papel/plano, IA e interface. O coordenador JUnit passou nessa execução. [Observações seguras](design/confiabilidade/playwright-on-completo.json): apenas nomes de cenário, contagens de console, nomes de exceção JavaScript e caminhos/status HTTP, sem corpos, cookies ou tokens.
- Playwright final com verificação OFF: **7 aprovados**, incluindo os seis cenários desta fase reexecutados após os refinamentos e o cadastro direto exclusivo desse modo; coordenador JUnit aprovado. Há **57 casos distintos de navegador aprovados entre ON/OFF** (as seis reexecuções não são contadas como novos casos). [Evidência OFF](design/confiabilidade/playwright-off-final.json).
- Frontend: `npm test`, **45 aprovados**; `npx --no-install tsc --noEmit`, `npm run lint` e `npm run build` aprovados. O fechamento do diálogo acrescenta Axe no estado de erro e confirma que corrigir o motivo limpa a mensagem anterior: **jornada de venda/cancelamento reexecutada e aprovada**, sem violações Axe. [Evidência](design/confiabilidade/cancelamento-acessibilidade-final.json). `git diff --check` aprovado.

A regressão final também cobre upload multipart com contexto antigo (409 e zero arquivos gravados), retorno tardio de CSV sem download no espaço novo, motivo Unicode inválido e cancelamento de venda sem custo removendo a incompletude do relatório.

### Evidências visuais

As capturas usam apenas contas/dados sintéticos. Foram abertas e revistas, além das verificações de DOM/overflow e Axe em Chromium. Não se afirma validação em aparelhos físicos ou outros motores de navegador.

| Cenário | Captura |
| --- | --- |
| Troca entre abas | [Contexto atualizado](design/confiabilidade/contexto-duas-abas.png) |
| IA depois da troca | [Consentimento renovado](design/confiabilidade/contexto-ia-renovado.png) |
| Ingrediente parcial | [Desktop](design/confiabilidade/ingrediente-parcial.png) / [mobile](design/confiabilidade/ingrediente-parcial-mobile.png) |
| Ausência de custo | [Mobile](design/confiabilidade/custo-desconhecido-mobile.png) |
| Confirmação de cancelamento | [Mobile](design/confiabilidade/cancelamento-confirmacao-mobile.png) |
| Histórico cancelado | [Mobile](design/confiabilidade/venda-cancelada-mobile.png) |
| Contexto na nova venda | [1440 px](design/confiabilidade/nova-venda-contexto-1440.png) / [390 px](design/confiabilidade/nova-venda-contexto-390.png) |
| Contexto no novo produto | [Mobile](design/confiabilidade/novo-produto-contexto-mobile.png) |
| Privacidade documental | [Mobile](design/confiabilidade/documento-privacidade-mobile.png) |

Ficha/erros verificados em 1440, 1280, 1024, 768, 430, 390 e 360 px. Contexto operacional verificado em 15 rotas × quatro larguras (60 combinações). Nenhuma exceção JavaScript nos cenários instrumentados; erros HTTP/transporte provocados pelas regressões negativas estão registrados como tal.

### Arquivos principais

- Contexto: `SessaoContexto`, `ContextoOrganizacaoInterceptor`, `WebConfig`, `frontend/lib/contexto-organizacao.ts`, `api.ts`, `WorkspaceProvider` e helpers de arquivos/equipe.
- Domínio: `ProdutoService`, `ValidacaoFinanceira`, `VendaService`, `VendaIdempotenciaRepository`, entidades/repositórios de venda, `FinanceiroService`, `RelatorioService` e contexto financeiro da IA.
- Interface: páginas operacionais de produto/venda/despesa/cliente, `WorkspaceShell`, `CancelarVendaDialog`, `ingredientes-form.ts`, `TextoProtegidoIa`, `ConversaIa` e `DocumentosConteudo`.
- Testes: três novas classes de integração de contexto/contrato/venda; regressão em `ProdutoIntegrationTest`; coordenador de fixtures; `tests/ingredientes.test.mjs` e `tests/e2e/integridade.spec.ts`.

### Checkpoints

Todos os checkpoints são exclusivos de `nexo-next-spring`, com validação antes do push:

1. `3d9974557c192a8f24a64cad2beedad14b165bbf` — Protege contexto de organização por operação.
2. `ebeff972fd7741865fb1610b05571127f6c606d1` — Separa ficha técnica de compra financeira.
3. `f97cae162920785d1700e7f45656c82efc124db4` — Valida custo incompleto e contrato monetário.
4. `2572ac576fcd578020b2d36a1c3a89c9cd8039fc` — Torna venda idempotente e cancelável.
5. `6c9104483c418e3f1c31971da367e728f7e53893` — Unifica contexto operacional e privacidade documental.
6. Fechamento: **Consolida regressões de integridade do Nexo**. O SHA deste próprio commit e a conferência do remoto são fornecidos na entrega; também podem ser consultados com `git log -1 --format='%H %s'`.

A referência remota `main`, conferida novamente nesta etapa, permanece `8247ee36393d4a275f68ee2f14ae738176a31466`. Os pushes dos cinco primeiros checkpoints foram confirmados antes deste relatório. O fechamento usa o commit de consolidação, seguido de push e comparação de HEAD com o remoto; o resultado e SHA exatos são registrados na entrega.

## Preservação e próximas fases

Nenhum deploy, merge na main, stash, alteração de credencial ou acesso ao banco principal `nexo`. Testes usam exclusivamente `nexo_test`. As duas migrações novas são incrementais; scripts existentes e dados históricos permanecem preservados.

Ficam fora desta fase: reorganização da sidebar/onboarding, cobrança real, e-mail, integração bancária, OCR/estoque, memória/quota de IA, auditoria financeira Business completa, paginação geral, observabilidade global e gestão automatizada de migrações. O cancelamento de venda tem sua trilha específica; isso não é apresentado como solução integral de A13.
