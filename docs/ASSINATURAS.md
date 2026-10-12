# Assinaturas simuladas do Nexo

Implementação exclusiva da branch `nexo-next-spring`, sobre a autenticação com senha forte já existente. Sem gateway real, deploy, merge na `main` ou alteração da integração de e-mail. A arquitetura continua Next.js/React/TypeScript, Spring Boot e PostgreSQL, com Controller → Service → Repository e isolamento por organização.

## Comportamento implementado

O catálogo apresenta Free, Pro e Business com preços e limites existentes: R$ 0, R$ 39 e R$ 99 por mês, com 1, 3 e 10 usuários. O servidor fornece preços, benefícios, recursos e limites; o navegador não determina o valor da operação. O botão do plano atual fica desabilitado; os demais indicam upgrade ou downgrade.

O checkout interno mostra resumo, periodicidade e total. Cartão, Pix e boleto são apenas escolhas de método: nenhum número de cartão, CVV, dado bancário ou chave Pix é solicitado, enviado ou persistido. Em desenvolvimento habilitado, o seletor permite aprovação, recusa ou erro inesperado. Também é possível cancelar o checkout.

Foram implementadas as seis transições: Free → Pro, Free → Business, Pro → Business, Business → Pro, Business → Free e Pro → Free. A aprovação aplica o plano imediatamente e registra histórico. O usuário vê a confirmação e pode voltar à assinatura; há redirecionamento automático após quatro segundos. A confirmação informa que não há cobrança, fatura, rateio nem renovação real. Em um downgrade pago para Pro, o total simulado é o preço mensal integral do destino, sem cálculo de crédito ou cobrança real.

Downgrade e cancelamento exigem confirmação explícita na interface sobre a mudança de recursos/limites. A assinatura cancelada retorna imediatamente ao Free e recebe status `cancelada`. Não foi inventado período pago. Clientes, metas, usuários e informações financeiras existentes permanecem no banco; recursos pagos preservados ficam novamente acessíveis após um upgrade compatível.

A página **Minha assinatura** mostra plano efetivo, preço mensal, status, última atualização persistida, usuários ativos/limite e até 50 alterações recentes. Há ações de troca e cancelamento, mensagens de conclusão e links para recursos. Não há faturas, transações ou histórico anterior fictícios.

## Fonte de verdade e segurança

- `assinaturas` mantém o plano e o status da organização. O plano não é armazenado ou escolhido via localStorage. Dashboard, perfis, sidebar e telas consultam a API; recarregar ou entrar novamente preserva a assinatura.
- `Plano` centraliza preços, limites e hierarquia; `RecursoPlano` mantém os recursos mínimos existentes. `PoliticaAssinatura` calcula o plano efetivo e `AcessoPlanoService` valida recursos no backend.
- Somente uma sessão autenticada do proprietário gerencia a assinatura. Organização e usuário vêm do cookie HTTP-only validado pelo backend. Membros/administradores podem consultar dados permitidos, mas não alterar o plano.
- O endpoint antigo `PUT /api/saas/plano` sempre recusa promoção direta, mesmo com a antiga flag `SAAS_PROTOTYPE_PLAN_SWITCH=true`. Essa flag está obsoleta e não libera o checkout.
- A abertura valida destino e chave UUID de idempotência. Preço, plano anterior, organização, responsável e versão são definidos pelo servidor. Campos extras de plano/preço/status na confirmação não substituem o checkout registrado.
- Todas as mutações bloqueiam a assinatura antes do checkout. A confirmação é transacional: plano, versão, histórico e resultado são gravados juntos. Repetições retornam o resultado existente e não duplicam alterações.
- Um checkout expira em 15 minutos. Se outra mudança de assinatura ocorreu, fica `desatualizado` e não sobrescreve o plano. Checkouts recusados, cancelados ou expirados não podem ser aprovados depois. Erro do simulador mantém a operação pendente, permitindo nova tentativa com segurança.
- Checkouts e históricos são filtrados por organização. O mesmo erro neutro de checkout não encontrado é usado para identificador inexistente e organização diferente. Uma assinatura vinculada a outro provedor não pode ser sobrescrita pelo simulador.
- Metas e IA mantêm os bloqueios anteriores no servidor. O fluxo de caixa usa agora um endpoint Pro protegido; relatórios essenciais continuam disponíveis no Free. Equipe consulta usuários reais da própria organização por um endpoint Business. Os filtros de origem e os cookies existentes foram preservados.
- Respostas inválidas, falhas de rede e erros de servidor têm mensagens amigáveis. JSON/UUID/método inválidos recebem 400; autenticação ausente recebe 401 e falta de permissão recebe 403. Nenhum dado financeiro sensível é criado pelo fluxo.

## Ativação isolada do simulador

O simulador exige simultaneamente:

```bash
export SPRING_PROFILES_ACTIVE=dev
export PAGAMENTO_SIMULADO_ENABLED=true
```

Configure isso somente no processo local de desenvolvimento, junto das variáveis de banco já utilizadas. Não muda credenciais de banco ou e-mail. A flag é falsa por padrão. Os perfis `prod` e `production` impedem o simulador mesmo quando combinados com `dev`/`test` e flag verdadeira. Sem o simulador, criar/confirmar/cancelar checkout fica bloqueado no backend e os controles da interface ficam indisponíveis.

Planos com provedor `simulado`, e os planos do antigo status `prototipo`, só concedem recursos pagos enquanto o simulador estiver habilitado. Fora desse modo, o plano efetivo é Free, preservando o valor original no banco. Isso evita levar benefícios simulados para produção. Assinaturas não simuladas em `ativa`/`trial` mantêm a interpretação existente. Status `pendente`, `vencida`, `pagamento_falhou`, `atrasada` e `cancelada` não concedem recursos pagos. O status do checkout pendente/recusado não desativa uma assinatura previamente válida.

## Migração incremental 10

Arquivo: `database/10_assinaturas_simuladas.sql`, aplicado depois de `09_autenticacao_senha.sql`, no banco existente, como administrador:

```bash
psql -v ON_ERROR_STOP=1 -d nexo -f database/10_assinaturas_simuladas.sql
```

Use os parâmetros de conexão já configurados no seu ambiente. O script roda em transação e:

1. Acrescenta `assinaturas.versao` (BIGINT, inicial 0).
2. Expande a restrição de status, preservando os anteriores e incluindo `pendente`, `vencida`, `pagamento_falhou`.
3. Cria `checkouts_assinatura` com UUID, organização, usuário, chave idempotente única por organização, planos anterior/destino, versão, tipo, valor, status, método e datas de criação/expiração/conclusão. A origem é explicitamente simulada.
4. Cria `historico_assinaturas` com organização, responsável, checkout único, planos anterior/novo, tipo, origem e data. Apenas operações aprovadas geram esse histórico.
5. Cria índices por organização/data e concede acesso às novas tabelas/sequências ao papel existente `nexo_app`.

Não altera valores de planos antigos, não recria banco/tabelas existentes e não exclui registros. A reaplicação foi verificada no PostgreSQL de teste, com preservação das contagens de dados. A migração foi aplicada apenas no banco exclusivo de teste desta máquina; o banco `nexo` do usuário ainda precisa receber a 10 antes de executar esta versão. `ddl-auto=validate` permanece inalterado.

## Endpoints

Todos usam a sessão `nexo_session` e não aceitam organização escolhida pelo navegador.

| Método e rota | Operação |
| --- | --- |
| GET `/api/assinatura` | Plano efetivo, status, limites, permissões de gerenciamento e histórico |
| GET `/api/assinatura/planos` | Catálogo definido no servidor |
| POST `/api/assinatura/checkout` | Abre solicitação com `plano` e `chaveIdempotencia` |
| POST `/api/assinatura/cancelamento` | Abre cancelamento com `chaveIdempotencia` |
| GET `/api/assinatura/checkout/{id}` | Consulta resultado da própria organização |
| POST `/api/assinatura/checkout/{id}/confirmar` | Confirma com `metodo` e `cenario`, exclusivamente no simulador habilitado |
| POST `/api/assinatura/checkout/{id}/cancelar` | Cancela checkout pendente sem mudar o plano |
| GET `/api/saas/equipe` | Lista membros reais da organização, exige Business |
| GET `/api/relatorios/fluxo-caixa` | Resumo financeiro usado pelo fluxo Pro, exige Pro |
| PUT `/api/saas/plano` | Legado bloqueado; responde 403 para sessão autenticada |

## Revisão funcional adicional

- Corrigido `Suspense` em `/planos` e nos novos componentes que usam parâmetros de busca; build completo disponível.
- Dashboards `/empresa` e `/pessoal` consultam plano/perfil do servidor, com erro de carregamento amigável.
- Equipe deixou de mostrar pessoas fictícias, usa limite do catálogo e os papéis reais existentes (`proprietario`, `administrador`, `membro`). Convites/edição continuam indisponíveis, sem fluxo de e-mail novo.
- Fluxo de caixa não requisita o endpoint pago para usuários Free; bloqueios oferecem **Ver planos**, também em metas, IA e equipe.
- Cadastro de produto usa ID/data devolvidos pelo backend, removendo a identificação temporária desnecessária. Nenhum cálculo de custo, preço, margem, vendas, despesas ou relatórios foi alterado.
- Removido `any` do rótulo de forma de pagamento nos relatórios. Tratamento de rede/API evita mensagens técnicas e protege contra resposta JSON inválida.
- Conferidos links internos literais: nenhum apontou para rota inexistente. O navegador abriu produtos, clientes, vendas, despesas, relatórios, conta, IA, fluxo de caixa e os dois perfis, sem erro de página.
- Planos, checkout e assinatura foram exercitados a 390×844, 768×1024 e 1440×900, sem overflow horizontal. Labels de campos, radios, consentimento, mensagens acessíveis e foco de teclado foram verificados. O downgrade usa uma página, sem modal que exija captura de foco. O visual avançado por plano ficou para a etapa posterior.

## Testes

Antes desta etapa, passaram os 36 testes existentes do backend e os 13 testes de política de senha no frontend. A implementação de autenticação não foi alterada.

Resultados finais desta etapa: **68 testes JUnit passaram**, com zero falhas, erros ou testes ignorados. Esse total inclui os 36 de autenticação/segurança, 22 casos de assinatura com PostgreSQL/HTTP, 9 cenários de isolamento do simulador e 1 teste que coordena o navegador. Dentro dele, **7 testes Playwright passaram**, usando frontend, Spring em porta aleatória e PostgreSQL reais. Também passaram **25 testes unitários do frontend**, lint completo sem erros/avisos, TypeScript e build completo. Maven `verify` gerou o JAR executável.

Cobertura adicionada: as seis mudanças de plano; catálogo e limites; confirmação/recusa/cancelamento/erro; expiração; checkout desatualizado; idempotência e concorrência; confirmação de cancelamento da assinatura; persistência após reload/novo login; bloqueios Free/Pro/Business na API e interface; promoção direta proibida; preço/destino adulterados ignorados; membro sem permissão; isolamento entre organizações; preservação de clientes/metas/usuários; flag ausente/desabilitada e precedência de produção; navegação, métodos de pagamento e teclado nas três larguras.

Falhas intermediárias foram corrigidas: fixture usava papel que não existe no schema, exceção de checkout ausente era traduzida indevidamente pelo proxy de Repository, papel acessível do título de confirmação, nomes esperados dos controles e encerramento do navegador antes de requisições em andamento concluírem. O runner agora aguarda essas requisições, sem ignorar erros nem desativar verificações. **Nenhuma falha permanece na execução final.**

Para reproduzir, veja `DEVELOPMENT.md`. Execute Maven com as variáveis `NEXO_TEST_DB_*` de um banco exclusivo de teste preparado com 02–10. Use `NEXO_E2E=true` para incluir a jornada real no navegador; sem ela, esse teste fica ignorado. Instale dependências com `npm ci` e Chromium via Playwright, ou indique um executável em `NEXO_BROWSER_EXECUTABLE`. As contas de teste são sintéticas e verificadas diretamente: o runner não usa nem substitui o envio real de e-mail.

## Pendências de produto e funcionalidades existentes

- Convites e inclusão de membros ainda não têm operação funcional. Não foi criada inclusão acima do limite: o botão permanece indisponível e usuários existentes são preservados. Ao implementar convites, o backend deverá contar membros ativos e reservas de convite antes da inclusão. Não existe quota de produtos/clientes/vendas definida no projeto; nenhuma foi inventada.
- O catálogo Pro promete até 3 usuários, mas o recurso `EQUIPE` existente começa no Business. Esse comportamento foi preservado; é necessária decisão de produto sobre como serão os acessos compartilhados no Pro. Papéis planejados Dono/Gerente/Operador também precisam de uma etapa própria; os papéis reais atuais foram mantidos.
- Exportações, comparativos dedicados, gestão por unidade, documentos, IA de documentos, edição de permissões e atendimento prioritário têm partes ausentes ou em preparação. O catálogo original foi preservado e essa limitação aparece na área de planos. Não foram criados recursos fictícios para justificar benefícios.
- Fluxo de caixa continua usando os cálculos/resumo financeiro atuais; não passou a incluir previsão temporal ou conciliação. Histórico mostra as 50 alterações mais recentes, sem paginação nesta etapa.
- Polimento visual premium por plano permanece para uma etapa específica.

## Gateway real futuro

`ProvedorPagamento` é a fronteira de processamento e `PagamentoSimulado` é o adaptador temporário. Catálogo, autorização, checkout persistido, assinatura e histórico estão separados. Substituir o simulador exige implementar o provedor e revisar explicitamente a autorização de produção; não basta habilitar a flag de mock.

O adaptador real deverá criar uma cobrança/checkout seguro do gateway usando o preço do servidor, receber identificadores seguros e tratar resultados pendentes/recusados. Webhook assinado deverá validar autenticidade, organização/cobrança, idempotência e aplicar confirmação transacional sem confiar em `cenario` enviado pelo cliente. Renovação, falha, conciliação e cancelamento passarão a respeitar os períodos reais do provedor, atualizando os status já preparados. Tarifas, tributos, estornos, rateio e reservas de pagamento não foram implementados. O endpoint de confirmação simulada e o seletor de cenário continuarão restritos a dev/test e deverão ser substituídos na jornada de produção.

## Brevo, separado desta etapa

Brevo/SMTP, remetente, credenciais, chaves e serviços de envio existentes permaneceram intactos. Cadastro/verificação e recuperação continuam dependendo da entrega real dos códigos. Configurar a nova conta e validar entrega/remetente/TLS ficam para a etapa final solicitada. Nenhum teste desta assinatura enviou e-mail real; os testes anteriores de autenticação continuam usando seu capturador de teste existente. Não foi criada solução provisória para substituir Brevo.

## Próximos passos recomendados

1. Atualizar o checkout local da `nexo-next-spring` e aplicar somente a migração 10 no banco existente.
2. Iniciar backend com perfil `dev` e flag de simulação, e frontend; usar uma conta já verificada para revisar a jornada sem depender do envio de e-mail.
3. Decidir o acesso compartilhado Pro e concluir os módulos pendentes em etapas próprias.
4. Implementar e validar o gateway real, incluindo webhook e renovação; depois configurar/validar Brevo e realizar a etapa visual premium. Nenhuma publicação foi realizada nesta tarefa.

## Arquivos desta etapa

Os caminhos abaixo são relativos à raiz do repositório. `A` indica criado e `M`, modificado. Não houve remoção de arquivo nem mudança em código de e-mail ou autenticação.

| Estado | Arquivo |
| --- | --- |
| M | `.env.example` |
| M | `.gitignore` |
| M | `DEVELOPMENT.md` |
| M | `README.md` |
| M | `backend/src/main/java/br/com/nexo/config/ApiExceptionHandler.java` |
| M | `backend/src/main/java/br/com/nexo/relatorio/RelatorioController.java` |
| M | `backend/src/main/java/br/com/nexo/saas/AcessoPlanoService.java` |
| M | `backend/src/main/java/br/com/nexo/saas/SaasController.java` |
| M | `backend/src/main/java/br/com/nexo/saas/SaasService.java` |
| M | `backend/src/main/resources/application.properties` |
| M | `database/README.md` |
| M | `frontend/app/conta/assinatura/page.tsx` |
| M | `frontend/app/empresa/page.tsx` |
| M | `frontend/app/equipe/page.tsx` |
| M | `frontend/app/fluxo-caixa/page.tsx` |
| M | `frontend/app/ia/page.tsx` |
| M | `frontend/app/layout.tsx` |
| M | `frontend/app/metas/page.tsx` |
| M | `frontend/app/pessoal/page.tsx` |
| M | `frontend/app/planos/page.tsx` |
| M | `frontend/app/produtos/novo/page.tsx` |
| M | `frontend/app/relatorios/page.tsx` |
| M | `frontend/lib/api.ts` |
| M | `frontend/lib/produtos.ts` |
| M | `frontend/lib/saas.ts` |
| M | `frontend/package-lock.json` |
| M | `frontend/package.json` |
| A | `backend/src/main/java/br/com/nexo/saas/AssinaturaController.java` |
| A | `backend/src/main/java/br/com/nexo/saas/AssinaturaRepository.java` |
| A | `backend/src/main/java/br/com/nexo/saas/AssinaturaService.java` |
| A | `backend/src/main/java/br/com/nexo/saas/PagamentoSimulado.java` |
| A | `backend/src/main/java/br/com/nexo/saas/Plano.java` |
| A | `backend/src/main/java/br/com/nexo/saas/PoliticaAssinatura.java` |
| A | `backend/src/main/java/br/com/nexo/saas/ProvedorPagamento.java` |
| A | `backend/src/test/java/br/com/nexo/saas/AssinaturaBrowserTest.java` |
| A | `backend/src/test/java/br/com/nexo/saas/AssinaturaIntegrationTest.java` |
| A | `backend/src/test/java/br/com/nexo/saas/BancoAssinaturaTeste.java` |
| A | `backend/src/test/java/br/com/nexo/saas/IsolamentoSimuladorTest.java` |
| A | `database/10_assinaturas_simuladas.sql` |
| A | `docs/ASSINATURAS.md` |
| A | `frontend/app/checkout.css` |
| A | `frontend/app/checkout/page.tsx` |
| A | `frontend/components/AssinaturaConteudo.tsx` |
| A | `frontend/components/CheckoutConteudo.tsx` |
| A | `frontend/components/PlanosConteudo.tsx` |
| A | `frontend/lib/assinatura.ts` |
| A | `frontend/lib/planos.ts` |
| A | `frontend/playwright.config.ts` |
| A | `frontend/tests/e2e/assinatura.spec.ts` |
| A | `frontend/tests/planos.test.mjs` |
