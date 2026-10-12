# Banco PostgreSQL

Os scripts desta pasta pertencem à aplicação Spring/Next. Eles foram preservados na limpeza do legado. Não armazene backups reais ou credenciais aqui.

## Banco novo

Crie o usuário `nexo_app` com senha definida de forma segura no seu PostgreSQL. Como administrador, execute `01_criar_banco.sql` conectado ao banco `postgres`. Depois, conectado ao banco `nexo`, execute os scripts `02` a `09` em ordem, usando `psql -v ON_ERROR_STOP=1 -f caminho/do/script.sql` ou o Query Tool do pgAdmin.

Depois dos scripts, conceda os privilégios de desenvolvimento ao usuário da aplicação:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexo_app;
```

Esses privilégios também cobrem as tabelas iniciais de organização e produtos, que não tinham `GRANT` nos scripts antigos. O backend usa `ddl-auto=validate`: ele não cria nem altera tabelas automaticamente.

## Banco existente

Faça backup pelo procedimento da sua equipe e execute somente as migrações ainda não aplicadas. Para a nova autenticação, aplique `09_autenticacao_senha.sql` depois da estrutura `02` a `08`.

A migração `09` adiciona:

- `usuarios.senha_hash`, opcional para preservar contas antigas;
- `usuarios.tentativas_login` e `usuarios.login_janela_em`;
- `codigos_autenticacao.prova_hash`, `prova_expira_em` e `prova_usada_em`;
- índice único do hash da prova e finalidades `verificacao_email` e `recuperacao_senha`.

Ela invalida os códigos do fluxo anterior (`cadastro`/`login`) sem apagar o histórico. As contas existentes continuam verificadas como antes; usuários sem senha usam **Esqueci minha senha** para defini-la. Nenhuma organização, sessão ou informação financeira é excluída pela migração. A migração pode ser reaplicada e não recria o banco.

## Banco dos testes

Os testes de integração precisam de um **banco PostgreSQL exclusivo de teste**, preparado com os mesmos scripts e permissões. Eles criam contas sintéticas e alteram seus dados para testar expiração, inatividade e bloqueios. Não aponte os testes para produção.

Configure `NEXO_TEST_DB_URL`, `NEXO_TEST_DB_USERNAME` e `NEXO_TEST_DB_PASSWORD` no processo do Maven. Sem `NEXO_TEST_DB_URL`, esses testes são explicitamente ignorados; isso não valida a integração.
