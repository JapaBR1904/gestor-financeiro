# Autenticação — relatório da primeira etapa

> Transporte atual recomendado: API do Resend; veja [RESEND.md](RESEND.md). Este documento preserva o histórico da etapa SMTP. As variáveis `MAIL_*` só enviam pela aplicação com `NEXO_EMAIL_PROVIDER=smtp`; o diagnóstico SMTP isolado continua disponível como legado interno dev/test.

Este relatório registra a primeira etapa (commit `4f524be70f31944345e20dd3d28ba28b146206b8`). A política atual e os testes da revisão seguinte estão em [POLITICA_SENHA.md](POLITICA_SENHA.md).

Implementação feita na branch `nexo-next-spring`, seguindo o `AGENTS.md`. A arquitetura continua Next.js/Spring Boot/PostgreSQL. O texto abaixo descreve o estado na entrega original, antes do push autorizado posteriormente. Nenhum ambiente foi publicado.

## Auditoria e arquivos removidos

Foram verificadas referências no frontend, backend, scripts e documentação. Os únicos consumidores dos assets de `public/` eram o próprio `public/index.php`. As pastas MVC da raiz continham somente descrições do esqueleto antigo. Foram removidos:

- `public/index.php`: página inicial PHP sem integração com a aplicação atual;
- `public/css/style.css` e `public/js/app.js`: assets usados somente nessa página;
- `config/README.md`, `models/README.md` e `views/README.md`: descrições das pastas antigas sem código usado pela aplicação atual.

Nenhum SQL foi removido. Não existia pasta `controllers/` versionada nesta branch. O README agora identifica `frontend/` e `backend/` como a aplicação oficial. As variáveis antigas `APP_ENV` e `APP_DEBUG`, sem uso no Spring/Next, foram retiradas apenas do exemplo de configuração.

## Arquivos criados

- `backend/src/main/java/br/com/nexo/auth/AuthRateLimitFilter.java`;
- `backend/src/test/java/br/com/nexo/auth/AuthIntegrationTest.java`;
- `backend/src/test/java/br/com/nexo/auth/AuthHttpIntegrationTest.java`;
- `backend/src/test/java/br/com/nexo/auth/AuthRateLimitFilterTest.java`;
- `database/09_autenticacao_senha.sql`;
- `frontend/components/AuthCard.tsx`, `AuthCredentialsForm.tsx`, `AuthCodeForm.tsx` e `PasswordFields.tsx`;
- `frontend/app/esqueci-senha/page.tsx`, `recuperar-senha/page.tsx` e `redefinir-senha/page.tsx`;
- `frontend/eslint.config.mjs`: configuração padrão Next/TypeScript para o ESLint 9 já declarado no projeto;
- `frontend/package-lock.json`: instalação reproduzível sem trocar as dependências declaradas;
- `frontend/AGENTS.md`: orientação gerada pelo Next.js 16.4 para agentes, preservada para os próximos desenvolvimentos;
- este documento.

## Arquivos modificados

No pacote `backend/src/main/java/br/com/nexo/auth/`:

- `Usuario.java` e `UsuarioRepository.java`: hash de senha, estado de verificação, tentativas de login e bloqueio de linha;
- `CodigoAutenticacao.java` e `CodigoAutenticacaoRepository.java`: prova temporária de recuperação, bloqueios e invalidação das recuperações;
- `SessaoUsuarioRepository.java`: revogação das sessões por usuário;
- `AuthService.java`: cadastro, login, verificação e redefinição, reutilizando validação e emissão de códigos;
- `AuthController.java`: endpoints, validação dos payloads e cookies;
- `EmailCodigoService.java`: assuntos/conteúdo distintos e entrega de recuperação após o commit, sem logs de códigos.

No frontend:

- `app/login/page.tsx`, `app/cadastro/page.tsx` e `app/verificar-codigo/page.tsx`;
- `lib/auth.ts`, `app/auth.css` e `tsconfig.json` (inclusão dos tipos gerados pelo Next em desenvolvimento).

Documentação/configuração: `README.md`, `DEVELOPMENT.md`, `database/README.md`, `.env.example` e `.gitignore`. Os módulos de negócio e seus componentes não foram modificados.

## Banco

A migração incremental `09_autenticacao_senha.sql` adiciona o hash opcional de senha e o controle de tentativas de login em `usuarios`. Em `codigos_autenticacao`, adiciona hash, expiração e consumo da prova temporária, com índice único. Amplia as finalidades e invalida códigos do fluxo antigo, preservando o histórico.

O banco existente não é recriado e nenhum dado financeiro é apagado. A migração foi aplicada e reaplicada com sucesso no PostgreSQL local de teste. O schema foi validado pelo Hibernate durante os testes e na inicialização do backend.

## Endpoints

Todos têm prefixo `/api/auth`.

| Método | Caminho | Comportamento |
| --- | --- | --- |
| POST | `/cadastro` | Recebe `nome`, `email`, `senha`, `confirmacaoSenha`; cria conta pendente e envia verificação. |
| POST | `/login` | Recebe `email` e `senha`; exige conta ativa/verificada; cria sessão. |
| POST | `/codigo` | Reenvia `verificacao_email`; aceita `cadastro` como alias dessa finalidade. `login` por código é rejeitado. |
| POST | `/verificar` | Recebe e-mail, código e finalidade de verificação; confirma o e-mail e cria sessão. Nome/organização não são mais enviados nesta etapa. |
| POST | `/recuperacao` | Recebe `email`; responde de forma neutra independentemente de existência/inatividade/limites do e-mail. |
| POST | `/recuperacao/verificar` | Consome o código de recuperação e emite cookie temporário `nexo_recovery`. |
| POST | `/recuperacao/redefinir` | Recebe `senha` e `confirmacaoSenha`; exige prova do cookie; troca hash e revoga acessos antigos. |
| GET | `/me` | Mantém o DTO atual, sem hash, usando a sessão do cookie. |
| POST | `/logout` | Revoga a sessão e limpa seu cookie. |

## Fluxos finais

**Cadastro:** nome/e-mail/senha/confirmação → validação no backend → conta e organização → código de verificação → e-mail confirmado → cookie de sessão → onboarding.

**Login:** e-mail/senha → validação de senha, limite, atividade e e-mail confirmado → cookie HTTP-only → destino correspondente ao perfil atual/onboarding. Contas antigas sem hash definem a senha por recuperação; não existe senha padrão.

**Recuperação:** e-mail → mensagem neutra → código de 10 minutos → validação de finalidade/expiração/tentativas/uso → prova aleatória de 10 minutos em cookie HTTP-only → nova senha/confirmação → hash atualizado, prova consumida, demais recuperações e sessões anteriores invalidadas → sucesso e retorno automático ao login após cinco segundos.

Não são guardadas senhas, tokens de sessão ou provas em `localStorage`, `sessionStorage` ou URLs. A URL da verificação pode conter somente o e-mail, que não autoriza a operação.

## Segurança

- BCrypt com custo 12 para senhas e códigos. Senha: mínimo de oito caracteres e máximo de 72 bytes UTF-8, respeitando o limite do BCrypt sem truncamento silencioso.
- Hash da senha protegido também contra serialização da entidade; respostas continuam usando o DTO explícito.
- Tokens/provas de 256 bits, persistidos somente como SHA-256; prova de recuperação com finalidade própria e uso único.
- Cookie de sessão HTTP-only, `SameSite=Lax`, 30 dias; cookie de recuperação HTTP-only, `SameSite=Strict`, caminho limitado e 10 minutos. `Secure` continua configurável por ambiente.
- Bloqueios pessimistas no PostgreSQL serializam tentativas por conta, uso de código e troca de senha. Duas requisições concorrentes não consomem a mesma autorização.
- Tentativas inválidas agora são persistidas apesar da exceção de validação; o rollback do fluxo anterior não reduz mais a proteção.
- Limites anteriores de códigos preservados, com bloqueio adicional de login e limite por endereço de conexão.
- Recuperação com resposta igual para conta existente, inexistente, inativa ou bloqueada para reenvio. SMTP executado após o commit e fora da resposta HTTP, evitando exposição pelo tempo de entrega.
- Contas inativas não iniciam sessão e suas sessões também são rejeitadas por `/me`.
- Serviço SMTP, proteção de origem, CORS, cookies e isolamento por organização preservados. Não foram desativados TLS, assinaturas ou checksums para preparar o ambiente.
- Códigos de desenvolvimento e mensagens detalhadas do SMTP foram retirados dos logs. Nenhuma credencial real foi criada ou versionada.

## Interface

Identidade visual existente, formulários centralizados e componentes pequenos compartilhados. Labels, foco visível, navegação por teclado, autocomplete apropriado, mostrar senha, colagem do código inteiro, contador de reenvio, botões com carregamento e mensagens em português. Erros usam anúncio acessível; sucesso de redefinição inclui link imediato e redirecionamento automático.

As telas foram exercitadas em viewport móvel de 390 px e a tela de login também foi inspecionada em desktop. O teste móvel verificou ausência de rolagem horizontal.

## Validação executada

| Check | Resultado |
| --- | --- |
| Maven `verify`, JDK 21 e PostgreSQL 17 | **15 testes executados, 0 falhas, 0 erros, 0 ignorados**, compilação e JAR executável gerados. |
| Testes de integração do serviço | Hash/validação de senha, login correto/incorreto, conta inexistente/inativa, contas antigas, tentativas persistidas, expiração/finalidade/uso único, recuperação, prova inválida/expirada/reutilizada, sessão antiga revogada e concorrência. |
| Testes HTTP | Cadastro/verificação/login/recuperação/redefinição/logout/`me`, flags dos cookies incluindo `Secure`, resposta neutra e proteção de origem. |
| PostgreSQL | Scripts `02` a `09`, privilégios e reaplicação de `09` passaram; schema validado. |
| `npx --no-install tsc --noEmit` | Passou. |
| ESLint nas páginas/componentes/lib de autenticação | Passou. |
| Build das seis páginas de autenticação (`--debug-build-paths`) | Passou, incluindo prerenderização. |
| Navegador Chromium/Playwright, Next dev + backend real + SMTP local | Passou: cadastro, entrega/consumo dos e-mails, verificação, recuperação, redefinição, retorno ao login, rejeição da senha anterior, novo login, sessão antiga rejeitada e logout; nenhuma exceção de página. |
| Compatibilidade das APIs | GET de clientes/produtos/vendas/despesas passou com a nova sessão; criação de cliente e negação de acesso por outra organização também passaram. Não foi executada uma suíte completa dos módulos financeiros. |
| `npm run lint` completo | **Falha anterior:** quatro erros em `empresa`, `pessoal`, `produtos/novo`, `relatorios`, e um aviso em `lib/api`. Mesmos resultados reproduzidos em cópia do código original com a configuração padrão. |
| `npm run build` completo | Compilação e TypeScript passaram; **falha anterior na prerenderização de `/planos`**, que usa `useSearchParams` sem `Suspense`. Reproduzida no código original da branch. |
| Revisão do diff / `git diff --check` | Concluída, sem erros de whitespace. |

Não foram substituídos checks completos por checks parciais: os resultados e seus limites estão separados acima. A cópia usada para comparação veio do commit original, sem criar worktree ou alterar a branch principal.

## Execução local e variáveis

Comandos exatos, partindo da raiz em terminais separados, depois de aplicar os scripts e configurar banco/SMTP:

```bash
cd backend
mvn spring-boot:run
```

```bash
cd frontend
npm ci
npm run dev
```

Consulte [DEVELOPMENT.md](../DEVELOPMENT.md) para os pré-requisitos e [database/README.md](../database/README.md) para a migração. Nenhuma variável nova é obrigatória para produção. As novas variáveis opcionais dos testes são somente:

- `NEXO_TEST_DB_URL`
- `NEXO_TEST_DB_USERNAME`
- `NEXO_TEST_DB_PASSWORD`

## Pendências e limites

- Aplicar a migração `09` no banco de destino antes de executar o código atualizado.
- Corrigir separadamente o `Suspense` de `/planos` e os quatro erros anteriores de lint antes do build/publicação completa. Os módulos não foram refatorados fora do escopo.
- O SMTP real do provedor não foi testado nesta máquina: foi testado o `EmailCodigoService` com servidor SMTP local, sem credenciais externas. Mantenha as credenciais e as configurações TLS do serviço existente nas variáveis seguras do ambiente.
- A fila de recuperação é limitada e não durável; reinício/saturação pode interromper a entrega. O limite por conexão é local à instância; implantações distribuídas precisam também de rate limit confiável no gateway. Detalhes em `DEVELOPMENT.md`.
- Os testes de integração exigem banco exclusivo de teste; sem sua variável de URL, são ignorados explicitamente.
- Salvar configuração da nuvem não publica a aplicação nem envia alterações ao GitHub. A restauração em uma nova tarefa e a publicação não foram validadas.
