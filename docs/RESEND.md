# E-mails transacionais com Resend — Nexo

## Arquitetura e escopo

`AuthService → EmailCodigoService → EmailProvider → ResendEmailProvider → HTTPS /emails`.

O serviço de códigos monta assunto, HTML e texto. O provider conhece apenas a mensagem e o transporte, sem usuário, organização, código de banco ou regra de autenticação. Cadastro/verificação também utilizam o transporte selecionado. O HTML existente já apresenta Nexo, código, expiração de dez minutos, uso único e aviso para ignorar solicitações desconhecidas; foi preservado junto da versão texto. Não contém imagens externas nem nome, senha, sessão ou informações financeiras.

A recuperação mantém transação, geração/hash/expiração/consumo dos códigos, cooldown de 45 segundos, seis solicitações por hora, limites de tentativas, prova temporária e revogação de sessões. O registro pós-commit e executor permanecem: dois workers não daemon, fila de 100 tarefas, rejeição registrada e encerramento de até 30 segundos. Rollback não envia. Resultado do provider não muda a resposta HTTP neutra da recuperação. Verificação de cadastro permanece síncrona, conforme a arquitetura anterior.

Não há alteração em AuthService, controllers, regras de senha, banco, frontend ou implementação de planos/assinaturas. Os testes de assinatura só receberam isolamento do provider para não usar credenciais do processo.

### Contrato oficial e escolha do cliente

Contrato conferido no código oficial em 12/10/2026:

- [SDK Java oficial e exemplos](https://github.com/resend/resend-java);
- [Emails.send](https://github.com/resend/resend-java/blob/main/src/main/java/com/resend/services/emails/Emails.java): POST `/emails`;
- [CreateEmailOptions](https://github.com/resend/resend-java/blob/main/src/main/java/com/resend/services/emails/model/CreateEmailOptions.java): `from`, `to` em array, `subject`, `html`, `text`, `reply_to` em array;
- [cliente oficial](https://github.com/resend/resend-java/blob/main/src/main/java/com/resend/core/net/impl/HttpClient.java): base `https://api.resend.com`, Bearer, JSON;
- [resposta](https://github.com/resend/resend-java/blob/main/src/main/java/com/resend/services/emails/model/CreateEmailResponse.java): `id`;
- [referência da API](https://resend.com/docs/api-reference/emails/send-email).

Foi escolhido `java.net.http.HttpClient` do Java 21 com o Jackson 3 já fornecido pelo Spring Boot, sem nova dependência. O SDK suporta Java anterior e não foi considerado incompatível; entretanto, adicionaria OkHttp/Kotlin, Jackson 2 e org.json ([build oficial](https://github.com/resend/resend-java/blob/main/build.gradle)). Para um único endpoint, o cliente do JDK permite usar a pilha já instalada e controlar o timeout total e a sanitização de erros sem carregar essas dependências.

Conexão: 5 segundos. Prazo total de envio, recebimento dos headers e corpo: 10 segundos, com cancelamento ao exceder o prazo. Redirecionamentos não são seguidos. TLS continua validado. Endpoint real fixo no provider; não pode ser alterado por env/request para desviar a API key. Os testes injetam endpoint de loopback por construtor interno.

Não há retries implementados pela aplicação nem fallback automático para SMTP. Em timeout/falha de rede, a aceitação pode ser indeterminada; uma repetição poderia duplicar entrega. Uma futura estratégia de retry exigirá idempotência persistida e análise de expiração do código. Hoje, nova solicitação segue os limites já existentes e invalida códigos anteriores.

## Variáveis e seleção

A aplicação lê variáveis **do processo**, não carrega `.env` automaticamente. Chave somente no ambiente/secret manager; nunca no frontend, Git ou request HTTP.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `NEXO_EMAIL_PROVIDER` | `resend` | Valores exatos `resend`, `smtp`, `disabled`; outro valor impede inicialização |
| `RESEND_ENABLED` | `false` | Habilita o provider Resend somente quando selecionado |
| `RESEND_API_KEY` | vazio | Chave de envio obrigatória quando habilitado |
| `RESEND_FROM` | vazio | Remetente explícito, endereço único; aceita `Nexo <endereco>` |
| `RESEND_REPLY_TO` | vazio | Endereço único opcional de resposta |
| `NEXO_RESEND_DIAGNOSTIC_TO` | vazio | Destinatário exclusivo do comando manual dev/test; não redireciona recuperação |
| `SPRING_PROFILES_ACTIVE` | perfil padrão do Spring | `dev` ou `test` para remetente de teste e diagnóstico |

Resend habilitado sem chave, sem remetente ou com endereço inválido impede inicialização com erro fixo sem valores sensíveis. O remetente `@resend.dev` é permitido apenas com perfil dev/test e sem qualquer perfil prod/production. Também é recusado no perfil padrão. Remetente não recebe default automático, nem em dev. Reply-to inválido também impede inicialização.

Com `RESEND_ENABLED=false`, a inicialização é permitida, o provider desabilitado aparece no log e nenhum envio é tentado. Cadastro fica indisponível para envio; login de contas já verificadas continua normal. Recuperação mantém HTTP neutro e registra envio desabilitado. `NEXO_EMAIL_PROVIDER=disabled` desativa transporte independentemente das flags dos outros provedores.

## Configurar Resend em desenvolvimento

1. Crie a conta no [Resend](https://resend.com) e use **API Keys → Create API Key** no painel. Prefira permissão **Sending access**, com o menor escopo de domínio necessário. Guarde a chave no ambiente/gerenciador de segredos; não envie seu valor no chat.
2. Para teste sem domínio próprio, configure `RESEND_FROM=onboarding@resend.dev` e perfil dev. O domínio de teste permite enviar somente ao endereço associado à conta Resend. Para outro destinatário, será necessário verificar domínio próprio.
3. Configure o destino do diagnóstico com esse mesmo endereço, rode o comando abaixo e confira evento/ID no painel, inbox e spam.
4. Inicie o backend normalmente com as mesmas variáveis Resend e as variáveis PostgreSQL já existentes. Teste “Esqueci minha senha” de uma conta ativa do Nexo cujo e-mail seja permitido pelo Resend. A neutralidade da API não informa eventual restrição de destinatário; consulte os logs de envio.

### Comandos exatos para Windows PowerShell

Execute na raiz do checkout `nexo-next-spring`, com JDK 21 e Maven no PATH. Substitua somente o placeholder de destinatário; a chave será lida sem aparecer na tela ou histórico.

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:NEXO_EMAIL_PROVIDER = "resend"
$env:RESEND_ENABLED = "true"
$chaveResend = Read-Host "API key do Resend" -AsSecureString
$env:RESEND_API_KEY = [System.Net.NetworkCredential]::new("", $chaveResend).Password
Remove-Variable chaveResend
$env:RESEND_FROM = "onboarding@resend.dev"
$env:RESEND_REPLY_TO = ""
$env:NEXO_RESEND_DIAGNOSTIC_TO = "<SEU_EMAIL_DA_CONTA_RESEND>"

mvn -f backend/pom.xml package
if ($LASTEXITCODE -ne 0) { throw "Falha no build." }

java "-Dloader.main=br.com.nexo.diagnostico.DiagnosticoResendAplicacao" -cp "backend/target/nexo-backend-0.0.1-SNAPSHOT.jar" org.springframework.boot.loader.launch.PropertiesLauncher
$LASTEXITCODE
```

O comando gera `diagnosticoId=<UUID>` e envia somente texto com assunto `Diagnóstico Resend Nexo [UUID]`. Lê o mesmo factory/provider/propriedades Spring da aplicação, sem banco, AuthService, transação, executor de recuperação ou servidor HTTP. Não aceita propriedades/chave por argumentos de linha de comando. Não existe endpoint público de diagnóstico. O comando não é chamado no startup normal nem no CI.

Perfis prod/production, inclusive dev+prod e test+production, recusam execução antes de criar provider. Destinatário vazio/inválido ou provider não habilitado recusa envio. Saídas: `0` API aceitou, `1` configuração de envio/destinatário ou envio falhou, `2` perfil bloqueado ou inicialização falhou. Aceitação não comprova inbox: confirme entrega no painel e caixa de entrada.

Para iniciar a aplicação normal depois do diagnóstico, mantendo as variáveis de banco já configuradas nesse PowerShell:

```powershell
java -jar backend/target/nexo-backend-0.0.1-SNAPSHOT.jar
```

`DB_URL`, `DB_USERNAME` e `DB_PASSWORD` permanecem os existentes. Não é necessária migração, recriação de banco ou alteração de dados. O frontend continua com seu comando de desenvolvimento habitual.

## Produção e domínio próprio

Antes de habilitar envio em prod/production, adicione seu domínio em **Domains** no painel Resend, configure os registros DNS indicados pelo provedor e espere a verificação. Configure `RESEND_FROM` com endereço desse domínio e a API key apropriada no secret manager. Configure `RESEND_REPLY_TO` se desejar receber respostas em outra caixa. Não há domínio Nexo obrigatório hardcoded: mudar essas variáveis e reiniciar o processo é suficiente.

O Nexo valida presença/formato e rejeita remetente de teste; a verificação efetiva do domínio e a autorização da chave são confirmadas pela API Resend. Ainda dependem da configuração DNS/painel. Não há deploy, publicação ou alterações de DNS realizadas nesta etapa.

## Observabilidade e erros

Logs de configuração registram somente presença e tipo do provider. Cada recuperação conserva seu contador interno de despacho; o diagnóstico usa UUID. Logs Resend: `resend_preparando`, `resend_chamada` (DEBUG), `resend_aceitou` (INFO) e `resend_falha` (ERROR), com duração, status e ID de mensagem UUID canônico. ID não é código de recuperação ou sessão. Resposta de sucesso inesperada é rejeitada sem imprimir conteúdo.

Em falha, somente cadeia de classes e nomes públicos de erro numa lista explícita entram nos logs. Não se registra corpo bruto, mensagem externa, stack trace, header Authorization, API key, destinatário, código, senha ou token. Exceção entregue à aplicação tem mensagem fixa e não carrega causa externa. Não habilite tracing HTTP do JDK, debug JavaMail, dump de env ou logging de payload/header.

Para acompanhar todas as etapas locais:

```powershell
java -jar backend/target/nexo-backend-0.0.1-SNAPSHOT.jar --logging.level.br.com.nexo.auth.EmailCodigoService=DEBUG --logging.level.br.com.nexo.email=DEBUG
```

| Sinal | Ação |
| --- | --- |
| Startup: chave/remetente ausente ou inválido | Configure env no mesmo processo e reinicie; valores nunca aparecem no erro |
| HTTP 400/422 | Confira remetente, domínio, endereço e formato; use nome público de erro/painel |
| HTTP 401 | Confira validade da API key no secret manager |
| HTTP 403 | Confira permissões/domínio e restrição do remetente de teste ao e-mail da conta Resend |
| HTTP 429 | Confira rate limit/quota no painel; não repetir automaticamente |
| HTTP 5xx | Indisponibilidade externa; acompanhar provedor, sem retry automático |
| Timeout/falha de rede | Confira acesso HTTPS a `api.resend.com:443`; aceitação pode ser indeterminada |
| `resend_aceitou` | API retornou ID; verifique entrega/bounce/spam no painel e inbox |
| `fila_rejeitada` | Saturação/encerramento da fila local; monitore e solicite novo código respeitando limites |

A fila continua em memória e não é durável: interrupção abrupta pode perder tarefa. Esta migração não cria outbox, retries persistidos nem webhook de entrega. Não se promete entrega imediata ou na caixa de entrada.

## SMTP legado

`spring-boot-starter-mail` continua necessário para a opção SMTP explícita, diagnóstico interno e testes existentes. `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_ENABLED`, SMTP auth e STARTTLS foram preservados. Eles não são lidos como credenciais/remetente Resend e não há fallback automático.

Para selecionar SMTP temporariamente, use `NEXO_EMAIL_PROVIDER=smtp`, `MAIL_ENABLED=true` e suas variáveis seguras já existentes. Timeouts continuam 5/10/10 segundos; não desative TLS em produção. Resend e disabled não criam JavaMailSender nem executam `spring.mail.test-connection`, mesmo que a opção SMTP antiga permaneça configurada.

[SMTP_DIAGNOSTICO.md](SMTP_DIAGNOSTICO.md) permanece como comando legado interno dev/test; não é o diagnóstico recomendado para a migração. Os relatórios [RECUPERACAO_ENVIO.md](RECUPERACAO_ENVIO.md) e [AUTENTICACAO.md](AUTENTICACAO.md) preservam resultados históricos. Nenhuma credencial ou conta Brevo foi alterada ou removida do ambiente.

## Validação desta etapa

Os testes usam HTTP/SMTP fake em loopback e PostgreSQL exclusivo de testes. Não dependem de internet, chave real ou inbox. O diagnóstico externo é exclusivamente manual e não foi executado nesta máquina, que não possui `RESEND_API_KEY`/remetente/destino configurados.

| Verificação | Resultado |
| --- | --- |
| Maven `verify`, PostgreSQL de teste e navegador habilitados | **178 testes JUnit passaram; zero falhas, erros ou ignorados** |
| Resend: configuração, provider HTTP, diagnóstico e processos | 53 casos novos passaram, sem internet |
| Resend: recuperação/cadastro/sessões com PostgreSQL real | 12 casos novos passaram |
| Regressão anterior: autenticação, SMTP, limites, planos e assinatura | Todos os 113 casos anteriores preservados e aprovados |
| Playwright com frontend, Spring e banco reais | **7 testes passaram**, incluindo tamanhos móvel/tablet/desktop |
| Frontend `npm test` | **25 testes passaram**, sem ignorados |
| Frontend `npm run lint` e `tsc --noEmit` | Passaram |
| JAR Spring Boot e manifesto | Build/repackage passou; Start-Class continua `br.com.nexo.NexoApplication` |
| JAR normal com Resend habilitado, configuração fictícia e SMTP inacessível | Inicializou; saúde de API/banco OK; sem tentativa de envio ou conexão SMTP |
| Comando do diagnóstico no JAR | Dev sem destinatário e dev+prod recusados, sem banco ou chamada externa |
| `git diff --check` e revisão de segredos | Passaram |
| API/inbox real Resend e domínio próprio | **Não executados**; exigem configuração manual da conta/chave/domínio |

Comando principal de regressão na raiz, com `NEXO_TEST_DB_URL`, usuário/senha do banco dedicado de testes, `NEXO_E2E=true` e Chromium instalado conforme DEVELOPMENT.md: `mvn -f backend/pom.xml verify`. Para testes frontend: `cd frontend`, `npm test`, `npm run lint` e `npx --no-install tsc --noEmit`.

Os 12 casos de integração Resend cobrem commit, rollback, transporte sem SMTP, cadastro/verificação/login/logout, falhas HTTP 400/401/403/429/503 com resposta neutra, timeout neutro, dois workers independentes da resposta HTTP e redefinição completa com consumo único de código/prova, revogação e login com senha nova. Permanecem os testes existentes de cooldown, limite por hora, conta ausente/inativa, expiração, tentativas, isolamento e saturação da fila.

Não se simulou inbox externa como prova de entrega real. A sintaxe Java/PropertiesLauncher foi executada no Linux com o artefato empacotado; os comandos PowerShell são instruções para o terminal Windows e não foram executados no Windows desta máquina.

## Arquivos desta mudança


| Estado | Arquivo |
| --- | --- |
| Modificado | `.env.example` |
| Modificado | `DEVELOPMENT.md` |
| Modificado | `backend/src/main/java/br/com/nexo/NexoApplication.java` |
| Modificado | `backend/src/main/java/br/com/nexo/auth/EmailCodigoService.java` |
| Modificado | `backend/src/main/resources/application.properties` |
| Modificado | `backend/src/test/java/br/com/nexo/auth/AuthHttpIntegrationTest.java` |
| Modificado | `backend/src/test/java/br/com/nexo/auth/AuthIntegrationTest.java` |
| Modificado | `backend/src/test/java/br/com/nexo/auth/ConfiguracaoEmailTest.java` |
| Modificado | `backend/src/test/java/br/com/nexo/auth/EmailCodigoServiceTest.java` |
| Modificado | `backend/src/test/java/br/com/nexo/auth/LogEmailTeste.java` |
| Modificado | `backend/src/test/java/br/com/nexo/auth/RecuperacaoEnvioIntegrationTest.java` |
| Modificado | `backend/src/test/java/br/com/nexo/saas/AssinaturaBrowserTest.java` |
| Modificado | `backend/src/test/java/br/com/nexo/saas/AssinaturaIntegrationTest.java` |
| Modificado | `docs/AUTENTICACAO.md` |
| Modificado | `docs/RECUPERACAO_ENVIO.md` |
| Modificado | `docs/SMTP_DIAGNOSTICO.md` |
| Criado | `backend/src/main/java/br/com/nexo/diagnostico/DiagnosticoResendAplicacao.java` |
| Criado | `backend/src/main/java/br/com/nexo/diagnostico/DiagnosticoResendService.java` |
| Criado | `backend/src/main/java/br/com/nexo/email/ConfiguracaoEmail.java` |
| Criado | `backend/src/main/java/br/com/nexo/email/EmailDesabilitadoProvider.java` |
| Criado | `backend/src/main/java/br/com/nexo/email/EmailLogs.java` |
| Criado | `backend/src/main/java/br/com/nexo/email/EmailMensagem.java` |
| Criado | `backend/src/main/java/br/com/nexo/email/EmailProvider.java` |
| Criado | `backend/src/main/java/br/com/nexo/email/ResendEmailProvider.java` |
| Criado | `backend/src/main/java/br/com/nexo/email/SmtpEmailProvider.java` |
| Criado | `backend/src/test/java/br/com/nexo/auth/RecuperacaoResendIntegrationTest.java` |
| Criado | `backend/src/test/java/br/com/nexo/email/ConfiguracaoResendTest.java` |
| Criado | `backend/src/test/java/br/com/nexo/email/DiagnosticoResendProcessoTest.java` |
| Criado | `backend/src/test/java/br/com/nexo/email/DiagnosticoResendTest.java` |
| Criado | `backend/src/test/java/br/com/nexo/email/ResendEmailProviderTest.java` |
| Criado | `backend/src/test/java/br/com/nexo/email/ResendHttpTeste.java` |
| Criado | `docs/RESEND.md` |
