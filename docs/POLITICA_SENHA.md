# Política forte de senha e revisão da autenticação

Revisão feita exclusivamente na branch `nexo-next-spring`, a partir do commit `4f524be70f31944345e20dd3d28ba28b146206b8`. Nenhuma alteração na `main`, publicação de ambiente, exclusão de dados ou mudança de credenciais.

## Política atual

O cadastro e a redefinição exigem:

- pelo menos 16 caracteres;
- uma letra maiúscula;
- uma letra minúscula;
- um número;
- um caractere especial;
- confirmação idêntica à senha;
- no máximo 72 bytes UTF-8, respeitando o limite do BCrypt existente.

Caracteres Unicode são contados como caracteres, não como pares UTF-16. Letras acentuadas são aceitas; pontuação e símbolos contam como especiais; espaços não satisfazem o requisito de caractere especial. A senha não é cortada ou normalizada antes do hash.

A regra está centralizada em `PoliticaSenha.java` no backend e em `lib/politica-senha.ts` no frontend. Cadastro e redefinição reutilizam a mesma política em cada lado. O backend valida independentemente do navegador.

Senhas existentes continuam funcionando no login: a nova política se aplica à criação e à troca, sem bloquear usuários antigos ou depender de uma recuperação por e-mail para acessar suas contas. O algoritmo permanece BCrypt com custo 12. Nenhuma mudança de schema ou nova migração é necessária.

## Ajustes de segurança e fluxo

- Novo código de recuperação invalida todos os códigos e provas anteriores dessa finalidade para o mesmo e-mail, depois dos limites de reenvio/hora serem conferidos.
- A atualização do último acesso da sessão modifica somente esse campo e exige sessão não revogada/não expirada. Uma requisição concorrente não pode sobrescrever uma revogação e restaurar a sessão antiga.
- Expiração de código inclui o instante-limite: um código vencido não é aceito.
- Login inexistente, incorreto, inativo ou bloqueado apresenta a mesma resposta genérica. A comparação BCrypt também acontece para conta bloqueada, sem retornar rapidamente um estado que facilite sua identificação.
- Cadastro duplicado deixa de afirmar explicitamente que aquele e-mail pertence a uma conta. Isso não equivale a garantir indistinguibilidade completa do cadastro: criação e rejeição ainda têm resultados diferentes. A recuperação mantém a resposta neutra.
- Validações de senha não incluem valores recebidos nas mensagens. O DTO, os hashes, cookies, limites, tentativas persistidas e proteção de origem existentes foram preservados.
- Uma senha nova inválida não consome a prova e não altera a senha atual. A troca válida consome a prova, invalida as demais recuperações e revoga sessões anteriores.

## Interface

Cadastro e redefinição exibem checklist com requisitos atendidos/pendentes durante a digitação, contagem acessível e feedback da confirmação. As seis telas continuam usando os componentes existentes.

Campos obrigatórios, e-mail, senha, confirmação e código são validados com mensagens em português. A validação nativa não impede a apresentação dessas mensagens no submit. Erros são retirados quando o usuário corrige o campo. Foco visível, autocomplete, mostrar senha, estados de carregamento e anúncio acessível permanecem disponíveis.

O login não mostra nem aplica a política de criação às senhas existentes.

## Arquivos desta revisão

Criados:

- `backend/src/main/java/br/com/nexo/auth/PoliticaSenha.java`;
- `backend/src/test/java/br/com/nexo/auth/PoliticaSenhaTest.java`;
- `frontend/lib/politica-senha.ts`;
- `frontend/tests/politica-senha.test.mjs`;
- este documento.

Modificados:

- `AuthService.java`, `CodigoAutenticacao.java`, `SessaoUsuario.java`, `SessaoUsuarioRepository.java` no pacote de autenticação;
- `AuthIntegrationTest.java` e `AuthHttpIntegrationTest.java`;
- `frontend/components/PasswordFields.tsx`, `AuthCredentialsForm.tsx` e `AuthCodeForm.tsx`;
- `frontend/app/esqueci-senha/page.tsx`, `redefinir-senha/page.tsx` e `auth.css`;
- `frontend/package.json` (somente o comando de testes, sem novas dependências);
- `README.md`, `DEVELOPMENT.md` e a identificação histórica de `docs/AUTENTICACAO.md`.

Não foram alterados serviços financeiros, scripts SQL, `EmailCodigoService.java`, `.env.example`, `application.properties`, integração de e-mail, remetente ou credenciais.

## Testes executados

| Verificação | Resultado |
| --- | --- |
| Maven `test`, incluindo compilação e PostgreSQL 17 exclusivo de teste | **36 executados, 0 falhas, 0 erros, 0 ignorados**. |
| Política de senha no backend | 13 casos: ausência, mínimo, cada categoria, espaços, Unicode, 72/73 bytes, confirmação e senhas válidas. |
| Serviço de autenticação | 18 testes: cadastro/hash/verificação, login, inatividade, bloqueio, códigos inválidos/expirados/usados, recuperação, troca, revogação, reenvio, limites, provas antigas, compatibilidade e concorrência. |
| API HTTP | 4 testes: fluxo completo e cookies, origem/fluxo antigo, política obrigatória, respostas neutras e ausência de senha no erro. |
| Filtro de limite por conexão | 1 teste. |
| `npm test` | **13 testes da política frontend passaram**. |
| `npx --no-install tsc --noEmit` | Passou. |
| ESLint de todos os arquivos frontend alterados/criados | Passou. |
| Build das seis páginas de autenticação | Passou. |
| Navegador Chromium/Playwright | Passou: checklist ao digitar, confirmação, campos obrigatórios, bloqueio de envios inválidos, mensagens de código inválido/expirado, recuperação, redefinição, retorno ao login, envio de senha anterior pelo login e layout móvel/desktop. Respostas da API controladas exclusivamente pelo teste; nenhuma chamada ao backend/SMTP. |
| `npm run lint` completo | Falha anterior: 4 erros em `empresa`, `pessoal`, `produtos/novo`, `relatorios`; 1 aviso em `lib/api`. |
| `npm run build` completo | Compilação/TypeScript passaram; falha anterior na prerenderização de `/planos`, com `useSearchParams` sem `Suspense`. |

O teste de concorrência de sessão mantém uma consulta de autenticação em uma transação enquanto outra redefine a senha. Ao concluir ambas, a sessão antiga continua rejeitada. O consumo simultâneo do código/prova também continua limitado a uma requisição válida.

Os testes backend usam o dublê de e-mail já existente, restrito ao código de teste. Não existe bypass ou emissor provisório na aplicação. Os testes frontend usam TypeScript e o runner nativo do Node já disponíveis no projeto; não foram adicionadas bibliotecas.

## Executar os checks

Prepare somente um PostgreSQL exclusivo de teste, com o schema existente e permissões adequadas. Configure `NEXO_TEST_DB_URL`, `NEXO_TEST_DB_USERNAME` e `NEXO_TEST_DB_PASSWORD` no processo do Maven. Não use o banco real para os testes: eles criam contas sintéticas e alteram somente essas contas/códigos para simular bloqueios e expiração.

```bash
cd backend
mvn test
```

Sem a URL do banco de teste, os testes de integração são explicitamente ignorados, e isso não valida o fluxo completo.

```bash
cd frontend
npm test
npm run lint
npx --no-install tsc --noEmit
npm run build
```

Para o build parcial da autenticação:

```bash
npm run build -- --debug-build-paths 'app/login/page.tsx,app/cadastro/page.tsx,app/verificar-codigo/page.tsx,app/esqueci-senha/page.tsx,app/recuperar-senha/page.tsx,app/redefinir-senha/page.tsx'
```

Nenhuma variável nova de produção ou de teste é necessária.

## Pendências de e-mail / Brevo

A integração existente foi preservada integralmente. Não foram alterados Brevo, SMTP, remetente, credenciais, configurações de envio ou o código do serviço de transporte. Não foi criado substituto temporário e nenhum envio real foi tentado nesta revisão.

Continuam dependendo da etapa futura de Brevo:

- configuração da nova conta e credenciais pelo procedimento seguro do usuário;
- validação do remetente e da entrega real;
- validação do cadastro/verificação e recuperação de ponta a ponta com e-mails reais.

Até essa etapa, os testes de regras/HTTP validam o restante com o dublê de teste; não comprovam entrega de e-mail. A implementação de produção continua usando o serviço existente.

## Outras pendências

Corrigir separadamente os erros anteriores de lint e o `Suspense` de `/planos` para aprovar o build completo. Os resultados parciais acima não substituem essa aprovação. O limite por conexão e a fila não durável já existentes mantêm suas limitações documentadas em `DEVELOPMENT.md`; não foram alterados nesta etapa.
