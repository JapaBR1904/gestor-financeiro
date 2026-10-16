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

## Demais blocos desta fase

A03/A18 (custo e contrato), A04/A05 (venda repetível/cancelável), A07 (contexto operacional) e A09 (privacidade documental) serão documentados com as respectivas validações nos próximos checkpoints.

## Preservação e próximas fases

Nenhum deploy, merge na main, stash, alteração de credencial ou acesso ao banco principal `nexo`. Testes usam exclusivamente `nexo_test`. Migrações novas, quando necessárias, serão incrementais; scripts existentes e dados históricos permanecem preservados.

Ficam fora desta fase: reorganização da sidebar/onboarding, cobrança real, e-mail, integração bancária, OCR/estoque, memória/quota de IA, auditoria financeira Business completa, paginação geral, observabilidade global e gestão automatizada de migrações. O cancelamento de venda terá sua trilha específica; isso não é apresentado como solução integral de A13.
