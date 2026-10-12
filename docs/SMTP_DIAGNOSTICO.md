# Diagnóstico SMTP isolado — Nexo

## Objetivo e limites

O usuário confirmou que a recuperação registra todas as etapas até `smtp_aceitou`, com `MAIL_ENABLED=true`, credenciais/IP/remetente verificados e conexão/autenticação do Brevo funcionando. Isso afasta uma interrupção antes da chamada ao sender na tentativa observada. Entretanto, o retorno de `send()` não comprova entrega na caixa de entrada nem exibição no painel escolhido.

Esta ferramenta permite testar somente **configuração Spring → JavaMailSender → SMTP**, sem `AuthService`, códigos, banco, transação, callback pós-commit ou executor da recuperação. Não houve mudança no fluxo normal de autenticação, configurações SMTP reais, STARTTLS, validações, planos, checkout ou dados financeiros. Não foi utilizada API do Brevo.

## Como funciona

- Entrada separada: `br.com.nexo.diagnostico.DiagnosticoSmtpAplicacao`. O JAR normal mantém `NexoApplication` como aplicação principal.
- O contexto mínimo importa somente a autoconfiguração de mail e o serviço de diagnóstico. Não é descoberto pelo component scan normal e não cria servidor HTTP, datasource, JPA ou autenticação.
- O sender é o bean criado pela mesma `MailSenderAutoConfiguration` do Spring usada pelo Nexo, lendo o `application.properties`, perfil e variáveis do processo. Não é construído um sender alternativo com host/senha hardcoded.
- O diagnóstico executa uma única mensagem e termina. Não expõe endpoint. Quem executa precisa ter acesso ao terminal e às variáveis de ambiente já configuradas na máquina.
- Exige perfil `dev` ou `test`; `prod` e `production` bloqueiam mesmo em combinação com esses perfis. Sem perfil permitido, nenhum sender de diagnóstico é criado.
- Exige `MAIL_ENABLED=true`, remetente válido e destinatário único definido em `NEXO_SMTP_DIAGNOSTIC_TO`. Ausência/invalidade bloqueia antes do envio.
- Não aceita destinatário, host ou credenciais por request. Argumentos de linha de comando do Spring são ignorados nesta entrada; configuração deve vir do ambiente/arquivos seguros já utilizados. `-Dloader.main` é somente a seleção da entrada Java.
- Não executa `spring.mail.test-connection` como validação de startup separada: a tentativa observada é o próprio `send()`. Usa todas as propriedades existentes do sender, incluindo autenticação, TLS e timeouts.

O contexto é um novo processo, com um novo bean da mesma autoconfiguração/configuração. Para uma comparação válida, inicie-o no mesmo diretório, terminal e ambiente do backend local. Overrides SMTP passados apenas por argumentos ao backend normal não são copiados; mantenha os valores nas variáveis seguras já utilizadas. Não há arquivo `application-dev.properties` neste checkout.

## Windows PowerShell — comando exato

Na raiz do repositório, mantenha as variáveis SMTP já existentes no mesmo PowerShell. Não copie credenciais para scripts, Git ou chat. Substitua somente o placeholder do destinatário:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:NEXO_SMTP_DIAGNOSTIC_TO = "<EMAIL_DESTINO_DIAGNOSTICO>"

mvn -f backend/pom.xml package
if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar o JAR do Nexo." }

java "-Dloader.main=br.com.nexo.diagnostico.DiagnosticoSmtpAplicacao" -cp "backend/target/nexo-backend-0.0.1-SNAPSHOT.jar" org.springframework.boot.loader.launch.PropertiesLauncher
$LASTEXITCODE
```

O placeholder não é um endereço válido e precisa ser substituído localmente. JDK 21 e Maven são necessários. O comando não precisa de banco disponível; os testes de integração do `mvn package` só executam quando `NEXO_TEST_DB_URL` está configurado para um banco exclusivo de teste. Remova essa variável de teste se não quiser executar a suíte de integração nesse terminal; não altere as variáveis do banco da aplicação.

Não defina novamente `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_SMTP_AUTH`, `MAIL_STARTTLS` ou `MAIL_STARTTLS_REQUIRED` para esta investigação: preserve os valores atuais já validados. As variáveis Spring são lidas do processo; a aplicação não carrega automaticamente `.env` da raiz.

Para o comando usual da aplicação, continue usando `java -jar backend/target/nexo-backend-0.0.1-SNAPSHOT.jar`. Ele não dispara diagnóstico. Se for retornar ao perfil utilizado antes da investigação, restaure somente `SPRING_PROFILES_ACTIVE` no terminal e remova `NEXO_SMTP_DIAGNOSTIC_TO` quando terminar.

## O que observar no terminal

Cada execução gera um UUID não sensível `diagnosticoId`. O log usa `id=<UUID>`. A mensagem tem:

- Assunto: `Diagnóstico SMTP Nexo [<UUID>]`.
- Corpo simples de texto: `Teste de diagnóstico SMTP do Nexo.` e `diagnosticoId=<UUID>`.
- Cabeçalho adicional: `X-Nexo-Diagnostico-Id: <UUID>`.

Não contém código de recuperação, senha, token, chave SMTP, dados financeiros ou credenciais.

| Etapa | O que comprova |
| --- | --- |
| `inicio` | ID criado; flags de remetente/destinatário/envio habilitado |
| `sender_configurado` | Host, porta configurada, protocolo, presença de username/password, auth, TLS/SSL e timeouts lidos do sender/sessão |
| `mime_validado` | From exato ao configurado, To/Subject presentes, text/plain UTF-8, Message-ID gerado, tamanho e origem/comparação do envelope |
| `chamada_sender` | Próxima operação é o `JavaMailSender.send()` |
| `sender_retornou` | Retorno sem exceção, duração aproximada do envio e Message-ID preservado |
| `sucesso` | Fim do diagnóstico; código de saída 0 |
| `falha` | Fase exata, motivo interno, cadeia de classes e duração; código de saída 1 |
| `perfil_bloqueado` / `falha_inicializacao` | Perfil/configuração não permitiu executar; código de saída 2 |

Logs não incluem From/To completos, username/password reais, corpo MIME, cabeçalhos completos, texto de exceção ou stack trace. O host é mostrado somente em formato seguro de hostname/IP. A porta configurada `-1` significa que o sender deixou a escolha ao protocolo/sessão; no caso informado deve aparecer **587**. Flags não substituem valores SMTP nem desativam TLS.

Para a configuração Brevo informada, espere host `smtp-relay.brevo.com`, porta 587, protocolo smtp e as flags auth/STARTTLS/required conforme os valores já configurados. Os timeouts atuais do projeto são conexão 5.000 ms, leitura/escrita 10.000 ms; o diagnóstico recusa valores não positivos para evitar espera ilimitada. Eles são limites por operação, não prazo global de toda a mensagem.

O Message-ID é verificado, mas seu valor completo não é registrado, pois pode conter identificadores da máquina/usuário. O UUID no assunto/corpo é o identificador para a busca no provedor. A contagem de bytes usa stream contador e não grava/copia o MIME para arquivo.

## Envelope MAIL FROM versus cabeçalho From

Foi inspecionada a implementação Angus Mail 2.0.5 já fornecida pelo projeto. `SMTPTransport.mailFrom()` usa esta precedência:

1. Envelope específico de `SMTPMessage`, quando não vazio.
2. Propriedade da sessão `mail.<protocolo>.from`, quando não vazia.
3. Primeiro endereço do cabeçalho `From`.
4. Endereço local da sessão somente quando não há From utilizável.

O diagnóstico exige From válido e normalmente recebe `SmartMimeMessage` do sender Spring. Sem override, o envelope é inferido corretamente do endereço do `MAIL_FROM`/`nexo.mail.from` colocado no cabeçalho. Com nome de exibição, o envelope usa só o endereço. Os testes capturam o comando real `MAIL FROM` no SMTP local e confirmam essa inferência e a precedência dos dois overrides.

O log mostra `envelopeOrigem=cabecalho_from`, `propriedade_smtp` ou `smtp_message` e `envelopeIgualFrom=true/false`, sem mostrar endereço. É uma observação da regra do provider, não uma captura do diálogo remoto. Nenhuma propriedade `mail.smtp.from` foi adicionada ou alterada em produção. O teste de override usa apenas endereços fictícios e configuração isolada de teste.

Angus é dependência runtime do starter. A API opcional de `SMTPMessage` é observada sem adicionar dependência de compilação nem alterar o POM.

## Segurança e SMTP debug

O comando bloqueia `mail.debug`, debug da sessão e `mail.debug.auth`. Não habilita debug de protocolo para investigar e não modifica flags existentes. Use somente os logs próprios seguros. O logging mais amplo do Spring fica silenciado exclusivamente neste processo isolado, evitando dump de falhas de binding/configuração. O logging do backend normal não foi alterado.

Os testes usam SMTP loopback/porta aleatória e endereços `example.com`. A configuração SMTP sem TLS pertence somente ao capturador local que não oferece TLS; não modifica o ambiente Brevo. Um teste específico exige STARTTLS/required e comprova que o diagnóstico não envia mensagem quando o servidor fake não suporta TLS.

## O que procurar no Brevo e como interpretar

Procure o assunto e UUID da execução nas áreas de Logs/Tempo real e compare o horário dessa tentativa no terminal com a conta/projeto exibido no painel. Confira o destinatário configurado localmente e o remetente já verificado, sem copiá-los para logs. Se o painel oferecer Message-ID/headers da mensagem, o cabeçalho de diagnóstico pode ajudar.

| Resultado observado | Interpretação e próximo passo |
| --- | --- |
| Diagnóstico chega e aparece no Brevo | Caminho isolado/conta funcionaram para essa mensagem simples. Compare destinatário, envelope, configuração e MIME do envio de recuperação; isso não prova sozinho um bug no AuthService. |
| `sender_retornou`/`sucesso`, mas nenhum evento no Brevo | O caminho isolado chegou ao provider sem exceção. Confira host/porta/conta/painel, filas/supressões e visibilidade no provedor. Esse resultado não depende de banco, código, callback ou executor da recuperação. |
| `falha` | Use `fase`, `motivo` e classes: timeout, autenticação, erro de mensagem/TLS etc. Não é preciso registrar mensagem sensível da exceção. |
| Capturador local recebe, mas Brevo não | MIME/envelope e caminho local foram comprovados; ainda é preciso comparar a configuração/TLS/provedor reais. O capturador não valida a entrega remota ou o painel. |

Não houve acesso ao SMTP real do Brevo nesta máquina nem à sua API/painel. A causa específica de ausência de evento/entrega ainda depende da execução do comando no ambiente informado. Não se concluiu que o provedor perdeu a mensagem nem que a recuperação estava defeituosa.

## Testes e build desta etapa

Novos testes:

- `DiagnosticoSmtpTest`: perfis dev/test e bloqueio de produção/mistos; destinatário ausente/inválido/lista; envio habilitado; MIME/From/To/Subject/UUID; envelope padrão e overrides; flags/credenciais sem valores em logs; falha SMTP; debug de protocolo bloqueado; timeout; STARTTLS obrigatório preservado.
- `DiagnosticoSmtpProcessoTest`: comando real em JVM separada com banco inacessível, ausência de dependência de AuthService, argumentos SMTP ignorados, bloqueio em cinco combinações de perfil e recusa sem destinatário.
- Helpers existentes ampliados apenas em testes: SMTP captura envelope e o capturador de logs aceita o logger do diagnóstico.

**Resultado final:** 113 testes JUnit passaram, zero falhas/erros/ignorados; dentro da regressão existente, 7 testes Playwright passaram. Maven `verify` compilou e gerou o JAR executável. `git diff --check` passou.

| Verificação executada | Resultado |
| --- | --- |
| `-Dtest=DiagnosticoSmtpTest,DiagnosticoSmtpProcessoTest test` | 23 passaram na primeira suíte de diagnóstico |
| Reexecução dos dois testes de diagnóstico, após completar as fixtures com auth/TLS próprios, com `MAIL_SMTP_AUTH`, `MAIL_STARTTLS` e `MAIL_STARTTLS_REQUIRED` externos em `true` | 24 passaram; testes locais não herdam as flags SMTP do terminal |
| `verify`, PostgreSQL exclusivo de teste e `NEXO_E2E=true` | 113 JUnit passaram, incluindo 24 novos casos de diagnóstico e todos os anteriores |
| Testes de navegador existentes coordenados pelo backend | 7 passaram |
| Build/repackage do JAR | Passou; manifesto mantém `Start-Class: br.com.nexo.NexoApplication` |
| Comando `PropertiesLauncher` no JAR final com SMTP fake e banco inacessível | Enviou From/To/Subject/UUID/envelope corretos; logs sem endereços |
| Mesmo JAR/comando com perfil `dev,prod` | Código 2, sem novo envio |
| `git diff --check` | Passou |

A prova do JAR empacotado foi adicional aos testes JUnit, em um capturador loopback temporário, sem gravar MIME. Nenhum teste automatizado precisou de credenciais reais, serviços Brevo ou alteração de configurações de produção.

Foi corrigida uma falha inicial de compilação ao tentar importar diretamente uma classe Angus disponível somente em runtime. A observação opcional passou a usar sua API pública via reflexão, sem adicionar dependência. Não foram relaxadas asserções, TLS ou validações para fazer testes passarem.

| Estado | Arquivo |
| --- | --- |
| Criado | `backend/src/main/java/br/com/nexo/diagnostico/DiagnosticoSmtpAplicacao.java` |
| Criado | `backend/src/main/java/br/com/nexo/diagnostico/DiagnosticoSmtpService.java` |
| Criado | `backend/src/test/java/br/com/nexo/auth/DiagnosticoSmtpTest.java` |
| Criado | `backend/src/test/java/br/com/nexo/auth/DiagnosticoSmtpProcessoTest.java` |
| Modificado | `backend/src/test/java/br/com/nexo/auth/SmtpLocalTeste.java` |
| Modificado | `backend/src/test/java/br/com/nexo/auth/LogEmailTeste.java` |
| Modificado | `DEVELOPMENT.md` |
| Criado | `docs/SMTP_DIAGNOSTICO.md` |

Não há migração ou mudança em autenticação, propriedades SMTP normais, POM ou frontend.
