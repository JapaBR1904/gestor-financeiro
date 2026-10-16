# Confiabilidade e integridade financeira — Fase 1

## Base e escopo

Base `109e1e7e0798a5210709fcdcbb894cb0199a12df`, branch `nexo-next-spring`. Checkout inicialmente limpo, atualizado por fast-forward a partir de `b3c09a5`. O relatório **REVISAO-SENIOR-NEXO.md** de 15/10/2026 foi lido integralmente, incluindo critérios e limites das evidências. Somente A01, A02, A03, A04, A05, A07, A09 e A18 fazem parte desta implementação. Recomendações dos demais achados não foram incorporadas.

## A01 — Modelo de contexto

Antes, o cookie compartilhava uma sessão cuja organização podia mudar em outra aba. A operação resolvia a organização atual no servidor, sem saber qual espaço a tela exibia.

As APIs de operação agora exigem `X-Nexo-Organizacao`. O interceptor autentica a sessão, valida o vínculo ativo no espaço informado e compara com o espaço selecionado. O cabeçalho não concede acesso: espaço sem vínculo recebe 403; sessão ausente/expirada, 401; contexto ausente/desatualizado, 409 com `erro=contexto_desatualizado`; ID malformado, 400. CORS permite explicitamente o cabeçalho.

O usuário autorizado fica vinculado à requisição, impedindo que uma segunda leitura da sessão no controller escolha outra organização. Uma operação aceita antes da troca pode concluir no espaço original autorizado; nunca é redirecionada ao destino novo. Operações que chegam com o contexto antigo após a troca recebem conflito. A regressão concorrente verifica esse ponto de corte e o destino no banco.

A proteção cobre criação/edição/exclusão financeira, vendas, despesas, produtos, clientes, metas, relatórios, CSV, IA e documentos (incluindo upload/download), assinatura e equipe. Autenticação e comandos intencionais de selecionar/criar/listar espaços e aceitar/consultar convite mantêm seus controles próprios e não dependem de uma tela operacional já carregada.

No frontend, a identidade é carregada antes de configuração/assinatura, que levam o mesmo espaço esperado. A camada comum captura espaço/geração no envio, cancela operações em andamento e descarta respostas antigas, inclusive leitura do corpo e arquivos. Troca entre abas usa BroadcastChannel/storage, com revalidação ao voltar à aba; listeners são removidos no cleanup. Um conflito do servidor também invalida a tela. Formulários e consentimentos do espaço anterior são desmontados, com aviso explícito, antes de mostrar o destino. Não há reenvio automático de gravações ou de consentimento da IA.

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

## Blocos restantes

A04/A05 (venda repetível/cancelável), A07 (contexto operacional) e A09 (privacidade documental) serão documentados com suas validações nos próximos checkpoints.

## Preservação e próximas fases

Nenhum deploy, merge na main, stash, alteração de credencial ou acesso ao banco principal `nexo`. Testes usam exclusivamente `nexo_test`. Migrações novas, quando necessárias, serão incrementais; scripts existentes e dados históricos permanecem preservados.

Ficam fora desta fase: reorganização da sidebar/onboarding, cobrança real, e-mail, integração bancária, OCR/estoque, memória/quota de IA, auditoria financeira Business completa, paginação geral, observabilidade global e gestão automatizada de migrações. O cancelamento de venda terá sua trilha específica; isso não é apresentado como solução integral de A13.
