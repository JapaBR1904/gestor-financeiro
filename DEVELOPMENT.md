# Desenvolvimento do Nexo

Use o checkout existente da branch `nexo-next-spring`. Cada tarefa na nuvem já tem ambiente isolado; não é necessário criar um Git worktree.

## Pré-requisitos

- Node.js 20.9 ou superior, compatível com Next.js 16;
- JDK 21 completo, incluindo `javac`, e Maven;
- PostgreSQL preparado conforme [database/README.md](database/README.md);
- serviço SMTP para entregar os códigos. Para desenvolvimento, use um capturador SMTP local; para produção, preserve as configurações seguras do serviço existente.

Confira `java -version`, `javac -version` e `mvn -version`: os três devem usar o JDK 21. Não desative verificações de TLS para baixar dependências.

## Configuração

A aplicação Spring lê variáveis do processo. Ela não carrega automaticamente o `.env` da raiz. Use o gerenciador de segredos do seu ambiente ou configure as variáveis no terminal que inicia o backend.

Nomes usados pelo backend:

- Banco: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
- Segurança: `NEXO_ALLOWED_ORIGINS`, `COOKIE_SECURE`.
- Assinatura simulada, opcional: `SPRING_PROFILES_ACTIVE=dev` e `PAGAMENTO_SIMULADO_ENABLED=true`. Os perfis `prod` e `production` impedem sua ativação mesmo se a flag estiver habilitada.
- E-mail: `MAIL_ENABLED`, `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_STARTTLS`, `MAIL_STARTTLS_REQUIRED`.

Consulte `.env.example` para as opções locais, sem inserir credenciais no Git. Em produção, use HTTPS, `COOKIE_SECURE` habilitado e TLS obrigatório conforme o provedor SMTP. Não use o SMTP de teste em produção. Nenhuma variável nova é obrigatória para o fluxo de senha.

Para desenvolvimento local em Bash, a senha do banco pode ser lida sem aparecer no histórico:

```bash
read -rs -p 'Senha do PostgreSQL: ' DB_PASSWORD
export DB_PASSWORD
```

Configure também as variáveis do SMTP no mesmo processo. `MAIL_ENABLED` deve estar habilitado: quando desabilitado, o cadastro informa indisponibilidade; códigos não são escritos nos logs. A recuperação sempre mantém a resposta neutra, inclusive em falhas de envio, e registra apenas um aviso sem dados sensíveis.

No frontend, `NEXT_PUBLIC_API_URL` define a origem da API. Se necessário, configure-a em `frontend/.env.local` (ignorado pelo Git). O padrão local é a API na porta 8080. Use o mesmo hostname no frontend e backend (por exemplo, ambos `localhost`) para que os cookies funcionem. A origem do frontend precisa constar em `NEXO_ALLOWED_ORIGINS`.

## Executar

Na raiz do repositório, depois de preparar banco e variáveis, em um terminal:

```bash
cd backend
mvn spring-boot:run
```

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

Para executar **também os testes de integração**, configure `NEXO_TEST_DB_URL`, `NEXO_TEST_DB_USERNAME` e `NEXO_TEST_DB_PASSWORD` para um PostgreSQL exclusivo de teste antes desse comando. Os scripts `02` a `10` e os privilégios precisam estar aplicados. Sem essa configuração, os testes de integração são ignorados e somente o teste independente de banco é executado.

Frontend:

```bash
cd frontend
npm test
npm run lint
npx --no-install tsc --noEmit
npm run build
```

O build completo inclui autenticação, planos e checkout. O problema anterior de `/planos` foi corrigido com `Suspense`. Os relatórios anteriores preservam os resultados históricos; os resultados desta etapa estão em [docs/ASSINATURAS.md](docs/ASSINATURAS.md).

Para a jornada de assinatura no navegador com backend e banco reais, instale o Chromium do Playwright e execute na pasta `backend`, com as variáveis do banco de teste já configuradas:

```bash
cd ../frontend
npx playwright install chromium
cd ../backend
NEXO_E2E=true mvn -Dtest=AssinaturaBrowserTest test
```

Esse teste inicia Spring em porta aleatória, cria somente contas sintéticas já verificadas e executa `npm run test:e2e`. Não envia e-mails. O Playwright inicia o frontend se necessário. Pode usar um Chromium instalado via `NEXO_BROWSER_EXECUTABLE=/caminho/do/chromium`. Sem `NEXO_E2E=true`, a jornada de navegador fica explicitamente ignorada; os demais testes de integração continuam disponíveis.

## Limites de segurança

O backend limita códigos a seis solicitações por e-mail/hora, intervalo de 45 segundos e cinco tentativas por código. O login bloqueia dez falhas por conta em uma janela de 15 minutos. O filtro adicional limita 60 requisições de autenticação por endereço de conexão em 15 minutos e mantém memória limitada.

O limite por conexão é local à instância e não confia em cabeçalhos de proxy arbitrários. Em uma implantação com proxy reverso ou múltiplas instâncias, configure também rate limit no gateway com identificação confiável do cliente. Os limites persistidos por conta e código continuam no PostgreSQL.

E-mails de recuperação são enviados após o commit, por uma fila limitada em memória, para não revelar a existência da conta pelo tempo de resposta do SMTP. O executor aceita até 100 tarefas pendentes e dois envios simultâneos, com timeouts de conexão/leitura/escrita e encerramento controlado. A fila não é durável: interrupção abrupta ou saturação pode impedir a entrega. O usuário pode solicitar outro código respeitando os limites; monitore os erros de envio e rejeição. Não é feito login automático após trocar a senha.

O diagnóstico seguro do despacho está em [docs/RECUPERACAO_ENVIO.md](docs/RECUPERACAO_ENVIO.md). Para observar as etapas no backend local, preserve suas variáveis atuais e acrescente o argumento `--logging.level.br.com.nexo.auth.EmailCodigoService=DEBUG`. Isso registra etapas, contagens e classes de falha, sem endereço, código, senha ou credencial. Não habilite o debug do protocolo JavaMail para esse diagnóstico.

Para isolar envio SMTP de banco, autenticação e executor, use o comando separado dev/test descrito em [docs/SMTP_DIAGNOSTICO.md](docs/SMTP_DIAGNOSTICO.md). Ele lê o mesmo sender/configuração Spring e exige `NEXO_SMTP_DIAGNOSTIC_TO`; não é endpoint nem envio automático ao iniciar a aplicação normal. O relatório inclui o comando exato para Windows PowerShell e a comparação de envelope com From.
