# Diagnóstico e correção do despacho de recuperação

## O que foi comprovado

A investigação usou a branch `nexo-next-spring`, inicialmente no commit `388ce912967e6e3707d62e2311b8055eada58f1d`, o mesmo informado pelo usuário. O usuário também confirmou `MAIL_ENABLED=true`, conta ativa/verificada, cooldown e limite por hora disponíveis, conexão/auth/TLS/remetente do Brevo já validados. Nenhuma credencial real foi solicitada, usada ou modificada nesta tarefa.

**O defeito específico da tentativa no Brevo não foi reproduzido neste ambiente.** Antes de modificar o serviço, o caminho original passou em dois testes com PostgreSQL e SMTP locais: envio depois do commit e ausência de envio no rollback. Isso demonstra que o `TransactionSynchronizationManager` e o callback original funcionam no cenário normal. Não há evidência para atribuir o incidente ao callback ou afirmar que trocar por evento Spring o resolveria.

Foi reproduzido um defeito concreto de retenção: com o executor original `corePoolSize=1`, `maximumPoolSize=2`, fila de 100, o segundo envio ficava na fila enquanto o primeiro SMTP permanecia bloqueado. O executor prefere a fila ao crescimento até o máximo; a segunda thread só seria criada ao esgotar a fila. Como não havia timeouts explícitos de conexão/leitura/escrita SMTP, uma tentativa anterior sem resposta poderia reter as seguintes sem produzir erro SMTP enquanto permanecesse bloqueada. Esse cenário explica **como** pode haver código confirmado no banco sem nova chamada ao provedor, mas não prova que ocorreu na máquina do usuário.

Também foram identificadas lacunas de diagnóstico e ciclo de vida: a tarefa capturava somente `IllegalStateException`, avisos de rejeição/falha eram genéricos, threads eram daemon e o encerramento chamava apenas `shutdown()` sem aguardar tarefas. Os testes antigos de autenticação substituíam `enviarRecuperacao` por um capturador síncrono, portanto não verificavam esses pontos.

## Por que banco e envio podem divergir

`AuthService.solicitarCodigo` continua validando conta/limites, invalidando recuperações anteriores e gravando o hash do novo código em uma transação. Para contas ausentes/inativas, mantém a gravação sintética que já equalizava o caminho da recuperação e não agenda envio.

Para uma conta elegível, `EmailCodigoService.enviarRecuperacao` registra o callback dentro dessa transação. Somente depois do commit o callback entrega a tarefa ao executor. A resposta HTTP não espera SMTP. Portanto, a presença de um registro confirmado no PostgreSQL comprova a persistência, mas não comprova execução da tarefa, chamada ao `JavaMailSender`, aceitação SMTP nem entrega ao destinatário. Essa separação é necessária para preservar a resposta neutra e evitar expor a existência da conta pela duração do SMTP.

## Correção aplicada

- Mantido o callback pós-commit que foi validado. Não introduzidos eventos, dependências, fila externa, outbox ou migração de banco.
- Exigida transação real com sincronização ativa ao registrar recuperação; uma chamada fora desse contrato falha antes de agendar qualquer envio.
- Executor com `corePoolSize=maximumPoolSize=2`, fila ainda limitada a 100 e `AbortPolicy`. Nunca usa `CallerRunsPolicy`, que levaria SMTP à thread HTTP.
- Threads explicitamente não daemon, com nomes distintos e tratamento seguro de falha não capturada.
- Timeouts padrão em `application.properties`: conexão 5.000 ms, leitura 10.000 ms e escrita 10.000 ms. Esses limites são por operação de I/O, não um prazo global para toda a mensagem. Não alteram host, porta, usuário, senha, remetente, autenticação ou STARTTLS reais.
- Exceções inesperadas de preparação/envio e despacho recebem diagnóstico seguro e não escapam da tarefa para modificar a resposta HTTP da recuperação.
- Encerramento aguarda até 30 segundos. Se o prazo acabar ou a espera for interrompida, registra tarefas pendentes descartadas; falhas/rejeições deixam de ser silenciosas. Não garante entrega em desligamento abrupto.
- Logs de etapas em DEBUG e falhas em ERROR. Na inicialização, INFO registra apenas flags de configuração/presença e tipo de sender, sem valores de host/usuário/senha/remetente.

`AuthService`, `AuthController`, repositórios, conteúdo dos e-mails, resposta da API e regras de autenticação permaneceram intactos: cooldown de 45 segundos, limite de seis códigos/hora, uso único, expiração de dez minutos, invalidação de códigos/provas anteriores, BCrypt e política de senha. Não há alteração em funcionalidades financeiras, planos ou checkout.

## Como observar a tentativa local

Recompile o backend desta branch e inicie **localmente**, preservando as variáveis já configuradas no processo:

```bash
cd backend
mvn package
java -jar target/nexo-backend-0.0.1-SNAPSHOT.jar --logging.level.br.com.nexo.auth.EmailCodigoService=DEBUG
```

Ou acrescente esse argumento ao comando de início local já utilizado. Nenhuma publicação/deploy foi executado. Não habilite `mail.debug=true`/debug de protocolo JavaMail: ele pode expor diálogo SMTP ou conteúdo. O DEBUG acima é apenas do serviço da aplicação.

O campo `despacho` é um contador interno, sem relação com usuário, código ou token de autenticação. Permite correlacionar as etapas de uma tarefa sem endereço de e-mail. A ordem de `tarefa_aceita` e `tarefa_iniciada` pode variar, pois o worker pode começar antes de a thread do callback registrar a aceitação.

| Etapa | Interpretação |
| --- | --- |
| `pos_commit_registrado` | Serviço registrou a sincronização na transação |
| `pos_commit_executado` | Commit concluído e callback chamado |
| `transacao_nao_confirmada` | Rollback/resultado não confirmado; não enviar |
| `tarefa_aceita` | Executor aceitou a tarefa; contagens de fila/ativos disponíveis |
| `tarefa_iniciada` | Worker iniciou o processamento |
| `mensagem_preparando` | Serviço começou a montar a mensagem |
| `chamada_java_mail_sender` | Serviço chegou a `JavaMailSender.send` |
| `smtp_aceitou` | A chamada retornou sem falha; isso não comprova entrega na caixa de entrada |
| `envio_desabilitado` | Flag de envio estava falsa no serviço executado |
| `fila_rejeitada` | Saturação/encerramento; resposta HTTP continua neutra |
| `falha_despacho` / `falha_tarefa` / `falha_envio` | Falha interna; registrar somente classes da cadeia de exceções |
| `encerramento_incompleto` / `encerramento_interrompido` | Encerramento não drenou toda a fila |

Para o incidente informado, a próxima confirmação necessária é observar até qual dessas etapas chega **uma nova tentativa elegível** nesse processo local. Exemplo de diagnóstico seguro: `tipos=IllegalStateException -> MailSendException -> MessagingException -> SocketTimeoutException`. Mensagem original da exceção, stack trace, endereço, código, senha, token, chave e corpo não são registrados.

## Configuração SMTP revisada

Foram verificadas as ligações existentes:

| Variável do processo | Propriedade lida |
| --- | --- |
| `MAIL_ENABLED` | `nexo.mail.enabled` |
| `MAIL_HOST` | `spring.mail.host` |
| `MAIL_PORT` | `spring.mail.port` |
| `MAIL_USERNAME` | `spring.mail.username` |
| `MAIL_PASSWORD` | `spring.mail.password` |
| `MAIL_FROM` | `nexo.mail.from` |
| `MAIL_SMTP_AUTH` | `spring.mail.properties.mail.smtp.auth` |
| `MAIL_STARTTLS` | `spring.mail.properties.mail.smtp.starttls.enable` |
| `MAIL_STARTTLS_REQUIRED` | `spring.mail.properties.mail.smtp.starttls.required` |

Um teste de autoconfiguração carrega o `application.properties` real com valores exclusivamente fictícios e confirma sender/flags/timeouts. O ambiente desta máquina não tem as variáveis SMTP reais do usuário; elas não foram consultadas em arquivos privados. `spring.mail.test-connection=true` testa a conexão do sender durante a inicialização, mas não executa o caminho de recuperação pós-commit.

## Testes e resultados

Antes da correção:

- Dois testes de PostgreSQL/SMTP reais locais passaram no código original: envio pós-commit e rollback sem envio.
- Uma reprodução controlada confirmou a retenção do segundo envio atrás do primeiro SMTP bloqueado. Após a correção, essa asserção foi atualizada para exigir que o segundo worker inicie sem esperar a fila encher.

Testes novos permanentes:

| Arquivo | Casos |
| --- | --- |
| `EmailCodigoServiceTest` | 10: fases reais de callback/tarefa, rollback, transação ausente, duas threads, herança de daemon, falha SMTP, exceção inesperada, flag falsa, rejeição após shutdown e drenagem no encerramento |
| `RecuperacaoEnvioIntegrationTest` | 9: SMTP real pós-commit/hash persistido, rollback, falha SMTP com HTTP neutro, ausência/inatividade, cooldown, limite por hora, invalidação de código/prova, SMTP lento sem reter HTTP e fila cheia sem perda silenciosa |
| `ConfiguracaoEmailTest` | 2: nove variáveis vinculadas ao sender/flags/timeouts e socket SMTP local sem saudação encerrando a tentativa por timeout |

As falhas provocadas usam somente fixtures. Há asserções de ausência de endereço, código real gerado no teste, senha, token, chave e stack trace nos logs. O SMTP local usa loopback e porta aleatória, sem Brevo ou outro serviço externo. Os helpers `SmtpLocalTeste` e `LogEmailTeste` pertencem somente aos testes.

Foi executado Maven `verify` com PostgreSQL exclusivo de teste (`NEXO_TEST_DB_URL` e demais variáveis `NEXO_TEST_DB_*` existentes) e `NEXO_E2E=true`, incluindo todos os testes anteriores de autenticação e a regressão de navegador já existente. Resultado final registrado após a execução abaixo. O frontend não foi modificado e não necessita de build novo por esta correção.

**Resultado final: 89 testes JUnit passaram, zero falhas/erros/ignorados; 7 testes Playwright passaram dentro da regressão de navegador; build/repackage do JAR executável passou.** Inclui os 36 testes anteriores de autenticação e os 21 casos novos desta correção. Nenhum teste usou Brevo real.

| Execução | Resultado |
| --- | --- |
| Código original: `-Dtest=RecuperacaoEnvioIntegrationTest test` | 2 passaram (commit/rollback com SMTP local) |
| Código original: `-Dtest=EmailCodigoServiceTest test` | 1 passou, confirmando o defeito de retenção esperado pelo teste de reprodução |
| Primeira suíte nova: `-Dtest=EmailCodigoServiceTest,RecuperacaoEnvioIntegrationTest,ConfiguracaoEmailTest test` | 18 passaram, 1 erro no fixture de autoconfiguração, corrigido |
| Correção do fixture e teste TCP: `-Dtest=ConfiguracaoEmailTest test` | 2 passaram |
| Primeira suíte completa: `verify` com `NEXO_E2E=true` | 88 JUnit + 7 Playwright passaram; JAR gerado |
| Suíte completa final, após explicitar worker não daemon e adicionar regressão | 89 JUnit + 7 Playwright passaram; JAR final gerado |

A primeira execução do teste isolado de propriedades falhou porque o fixture carregava `@PropertySource` depois da avaliação da condição de autoconfiguração do mail. O fixture passou a carregar o recurso antes dessa avaliação; não houve alteração de autoconfiguração da aplicação para contornar o teste.

## Limitações restantes

- Ainda é necessária a tentativa no backend local do usuário com DEBUG restrito ao serviço para localizar a interrupção específica no Brevo. Não foi comprovado que a conexão anterior estivesse bloqueada, que a fila estivesse cheia ou que uma exceção inesperada tenha ocorrido nesse incidente.
- A fila continua em memória. Crash, SIGKILL, falta de energia ou saturação podem impedir entrega. Rejeição/encerramento controlado são diagnosticados; não há retry automático ou garantia durável. Solicitar um novo código mantém os limites existentes.
- Dois workers e timeouts limitam a retenção, mas não garantem entrega instantânea com backlog ou indisponibilidade do provedor. SMTP aceitou não significa entrega na caixa de entrada. Não foi feito teste com credenciais Brevo reais.
- Nenhuma configuração real de credenciais, IP autorizado, remetente ou TLS foi alterada. Não foi criada migração, nem realizado deploy ou merge na `main`.

## Arquivos alterados

- Modificados: `backend/src/main/java/br/com/nexo/auth/EmailCodigoService.java`, `backend/src/main/resources/application.properties`, `DEVELOPMENT.md`.
- Criados: `backend/src/test/java/br/com/nexo/auth/EmailCodigoServiceTest.java`, `RecuperacaoEnvioIntegrationTest.java`, `ConfiguracaoEmailTest.java`, `SmtpLocalTeste.java`, `LogEmailTeste.java` (todos nessa pasta) e `docs/RECUPERACAO_ENVIO.md`.
