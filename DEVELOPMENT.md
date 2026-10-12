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

## Testes e build

Backend:

```bash
cd backend
mvn verify
```

Para executar **também os testes de integração**, configure `NEXO_TEST_DB_URL`, `NEXO_TEST_DB_USERNAME` e `NEXO_TEST_DB_PASSWORD` para um PostgreSQL exclusivo de teste antes desse comando. Os scripts `02` a `09` e os privilégios precisam estar aplicados. Sem essa configuração, os testes de integração são ignorados e somente o teste independente de banco é executado.

Frontend:

```bash
cd frontend
npm run lint
npx --no-install tsc --noEmit
npm run build
```

Para validar somente as páginas de autenticação enquanto o problema anterior de `/planos` estiver pendente:

```bash
npm run build -- --debug-build-paths 'app/login/page.tsx,app/cadastro/page.tsx,app/verificar-codigo/page.tsx,app/esqueci-senha/page.tsx,app/recuperar-senha/page.tsx,app/redefinir-senha/page.tsx'
```

Isso é uma validação parcial e não substitui o build completo para publicação. As limitações anteriores e os resultados executados estão em [docs/AUTENTICACAO.md](docs/AUTENTICACAO.md).

## Limites de segurança

O backend limita códigos a seis solicitações por e-mail/hora, intervalo de 45 segundos e cinco tentativas por código. O login bloqueia dez falhas por conta em uma janela de 15 minutos. O filtro adicional limita 60 requisições de autenticação por endereço de conexão em 15 minutos e mantém memória limitada.

O limite por conexão é local à instância e não confia em cabeçalhos de proxy arbitrários. Em uma implantação com proxy reverso ou múltiplas instâncias, configure também rate limit no gateway com identificação confiável do cliente. Os limites persistidos por conta e código continuam no PostgreSQL.

E-mails de recuperação são enviados após o commit, por uma fila limitada em memória, para não revelar a existência da conta pelo tempo de resposta do SMTP. A fila não é durável: uma reinicialização ou saturação pode impedir a entrega. O usuário pode solicitar outro código respeitando os limites; monitore os avisos de envio. Não é feito login automático após trocar a senha.
