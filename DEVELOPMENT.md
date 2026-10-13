# Desenvolvimento do Nexo

Use o checkout existente da branch `nexo-next-spring`. Cada tarefa na nuvem já tem ambiente isolado; não é necessário criar um Git worktree.

## Pré-requisitos

- Node.js 20.9 ou superior, compatível com Next.js 16;
- JDK 21 completo, incluindo `javac`, e Maven;
- PostgreSQL preparado conforme [database/README.md](database/README.md);
- API do Resend para entregar os códigos; SMTP é uma opção temporária de compatibilidade. Os testes usam servidores HTTP/SMTP locais e não precisam de credenciais externas.

Confira `java -version`, `javac -version` e `mvn -version`: os três devem usar o JDK 21. Não desative verificações de TLS para baixar dependências.

## Configuração

A aplicação Spring lê variáveis do processo. Ela não carrega automaticamente o `.env` da raiz. Use o gerenciador de segredos do seu ambiente ou configure as variáveis no terminal que inicia o backend.

Nomes usados pelo backend:

- Banco: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
- Segurança: `NEXO_ALLOWED_ORIGINS`, `COOKIE_SECURE`.
- Convites: `NEXO_FRONTEND_URL`, origem pública do frontend, sem caminho/query/fragmento. HTTP só é aceito em loopback fora de produção; em prod/production, use HTTPS.
- IA opcional: `GEMINI_API_KEY` e `GEMINI_MODEL` (padrão `gemini-flash-latest`). Sem chave, os demais recursos continuam disponíveis. O envio de resumo ou documento exige autorização na interface.
- Assinatura simulada, opcional: `SPRING_PROFILES_ACTIVE=dev` habilita o simulador automaticamente. `PAGAMENTO_SIMULADO_ENABLED=false` o desliga explicitamente. Os perfis `prod` e `production` impedem sua ativação mesmo se a flag estiver habilitada.
- E-mail recomendado: `NEXO_EMAIL_PROVIDER=resend`, `RESEND_ENABLED`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`. Veja [docs/RESEND.md](docs/RESEND.md), incluindo o diagnóstico isolado em PowerShell.
- SMTP legado, somente `NEXO_EMAIL_PROVIDER=smtp`: `MAIL_ENABLED`, `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_STARTTLS`, `MAIL_STARTTLS_REQUIRED`.

Consulte `.env.example` para as opções locais, sem inserir credenciais no Git. Em produção, use HTTPS, `COOKIE_SECURE` habilitado, API key de envio e remetente de domínio verificado. `onboarding@resend.dev` só é permitido nos perfis dev/test, sem prod/production. O envio começa desabilitado e exige configuração explícita.

Para desenvolvimento local em Bash, a senha do banco pode ser lida sem aparecer no histórico:

```bash
read -rs -p 'Senha do PostgreSQL: ' DB_PASSWORD
export DB_PASSWORD
```

Configure o provider e suas variáveis no mesmo processo. Para Resend, habilite `RESEND_ENABLED` e defina chave/remetente; não são utilizadas as variáveis SMTP. Com o transporte desabilitado, o cadastro informa indisponibilidade. A recuperação mantém a resposta neutra mesmo em falha de envio, com logs seguros e sem códigos ou credenciais.

No frontend, `NEXT_PUBLIC_API_URL` define a origem da API. Se necessário, configure-a em `frontend/.env.local` (ignorado pelo Git). O padrão local é a API na porta 8080. Use o mesmo hostname no frontend e backend (por exemplo, ambos `localhost`) para que os cookies funcionem. A origem do frontend precisa constar em `NEXO_ALLOWED_ORIGINS`.

## Executar

Na raiz do repositório, depois de preparar banco e variáveis, em um terminal:

```bash
export SPRING_PROFILES_ACTIVE=dev
cd backend
mvn spring-boot:run
```

No PowerShell, use `$env:SPRING_PROFILES_ACTIVE = 'dev'` antes de `mvn -f backend/pom.xml spring-boot:run`. Não é necessário definir a flag do pagamento; se o terminal já tiver `PAGAMENTO_SIMULADO_ENABLED=false`, remova essa variável para usar o padrão dev. O startup informa de forma segura se a simulação está habilitada. Em `test`, a habilitação continua explícita. Em produção, inclusive perfis mistos, ela permanece bloqueada.

Em outro terminal, partindo da raiz:

```bash
cd frontend
npm ci
npm run dev
```

O frontend usa a porta 3000; o backend, 8080. Para verificar os serviços localmente:

```bash
curl --fail http://localhost:8080/api/health
curl --fail http://localhost:8080/api/health/database
```

A rota de saúde do banco retorna seu estado, sem exigir login. Não confunda uma porta aberta com um fluxo de autenticação funcional: crie uma conta sintética, confirme o e-mail e teste login/logout.

## Política de senha

Novas senhas, no cadastro ou na redefinição, exigem 16 caracteres, uma maiúscula, uma minúscula, um número e um especial. O limite permanece 72 bytes UTF-8. As senhas existentes continuam aceitas no login, sem mudança automática ou perda de acesso. Não há nova migração de banco. Regras, arquivos e testes da revisão: [docs/POLITICA_SENHA.md](docs/POLITICA_SENHA.md).

## Testes e build

Backend:

```bash
cd backend
mvn verify
```

Para executar **também os testes de integração**, configure `NEXO_TEST_DB_URL`, `NEXO_TEST_DB_USERNAME` e `NEXO_TEST_DB_PASSWORD` para um PostgreSQL exclusivo de teste antes desse comando. Os scripts `02` a `11` e os privilégios precisam estar aplicados. Sem essa configuração, os testes de integração são ignorados e somente os testes independentes de banco são executados.

Frontend:

```bash
cd frontend
npm test
npm run lint
npx --no-install tsc --noEmit
npm run build
```

O build completo inclui autenticação, planos e checkout. O problema anterior de `/planos` foi corrigido com `Suspense`. Os relatórios anteriores preservam os resultados históricos; os resultados de assinatura estão em [docs/ASSINATURAS.md](docs/ASSINATURAS.md), e a conclusão de Free/Pro/Business está em [docs/PRODUTO.md](docs/PRODUTO.md).

Para a jornada de assinatura no navegador com backend e banco reais, instale o Chromium do Playwright e execute na pasta `backend`, com as variáveis do banco de teste já configuradas:

```bash
cd ../frontend
npx playwright install chromium
cd ../backend
NEXO_E2E=true mvn -Dtest=AssinaturaBrowserTest test
```

Esse teste inicia Spring em porta aleatória, cria somente contas sintéticas já verificadas e executa `npm run test:e2e`. Não envia e-mails externos. O provider do navegador é substituído apenas no teste por um capturador de mensagens sintéticas em arquivo temporário privado, removido ao terminar. Isso permite testar confirmação e recuperação sem enviar e-mails externos. Convites também usam o link privado. O transporte real continua coberto pelos testes locais HTTP/SMTP. O Playwright inicia um frontend próprio, com a origem real da API em `NEXT_PUBLIC_API_URL`. A porta 3000 precisa estar livre. A jornada usa `npm run build` e o servidor de produção `npm run start`, evitando interferência do Hot Reload e permitindo revisar o produto compilado. Para desenvolvimento, `npm run dev -- --webpack` é uma alternativa suportada ao erro interno reproduzido no cache do Turbopack nesta versão. Pode usar um Chromium instalado via `NEXO_BROWSER_EXECUTABLE=/caminho/do/chromium`. Sem `NEXO_E2E=true`, a jornada de navegador fica explicitamente ignorada; os demais testes de integração continuam disponíveis.

## Limites de segurança

O backend limita códigos a seis solicitações por e-mail/hora, intervalo de 45 segundos e cinco tentativas por código. O login bloqueia dez falhas por conta em uma janela de 15 minutos. O filtro adicional limita 60 requisições de autenticação por endereço de conexão em 15 minutos e mantém memória limitada.

O limite por conexão é local à instância e não confia em cabeçalhos de proxy arbitrários. Em uma implantação com proxy reverso ou múltiplas instâncias, configure também rate limit no gateway com identificação confiável do cliente. Os limites persistidos por conta e código continuam no PostgreSQL.

E-mails de recuperação são enviados após o commit, por uma fila limitada em memória, para não revelar a existência da conta pelo tempo de resposta do provedor. O executor aceita até 100 tarefas pendentes e dois envios simultâneos, com timeout de conexão de 5 segundos e total de 10 segundos no Resend, e encerramento controlado. A fila não é durável: interrupção abrupta ou saturação pode impedir a entrega. O usuário pode solicitar outro código respeitando os limites; monitore os erros de envio e rejeição. Não é feito login automático após trocar a senha.

O diagnóstico seguro do despacho está em [docs/RECUPERACAO_ENVIO.md](docs/RECUPERACAO_ENVIO.md). Para observar as etapas no backend local, preserve suas variáveis atuais e acrescente o argumento `--logging.level.br.com.nexo.auth.EmailCodigoService=DEBUG`. Acrescente também `--logging.level.br.com.nexo.email=DEBUG` para observar o transporte. Isso registra etapas, contagens e classes de falha, sem endereço, código, senha ou credencial. Não habilite o debug do protocolo JavaMail para esse diagnóstico.

O diagnóstico recomendado do Resend está em [docs/RESEND.md](docs/RESEND.md). O SMTP e seu diagnóstico permanecem como legado temporário. Para isolar envio SMTP de banco, autenticação e executor, use o comando separado dev/test descrito em [docs/SMTP_DIAGNOSTICO.md](docs/SMTP_DIAGNOSTICO.md). Ele lê o mesmo sender/configuração Spring e exige `NEXO_SMTP_DIAGNOSTIC_TO`; não é endpoint nem envio automático ao iniciar a aplicação normal. O relatório inclui o comando exato para Windows PowerShell e a comparação de envelope com From.
