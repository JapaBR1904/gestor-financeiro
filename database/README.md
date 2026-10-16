# Banco PostgreSQL

Os scripts desta pasta pertencem à aplicação Spring/Next. Eles foram preservados na limpeza do legado. Não armazene backups reais ou credenciais aqui.

## Banco novo

Crie o usuário `nexo_app` com senha definida de forma segura no seu PostgreSQL. Como administrador, execute `01_criar_banco.sql` conectado ao banco `postgres`. Depois, conectado ao banco `nexo`, execute os scripts `02` a `12` em ordem, usando `psql -v ON_ERROR_STOP=1 -f caminho/do/script.sql` ou o Query Tool do pgAdmin.

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

## Finanças e equipes

Aplique `11_produto_financas_equipes.sql` depois da `10` no banco existente. Esta migração adiciona associações de membros, a organização selecionada na sessão, o autor dos convites, lançamentos manuais (incluindo chave de idempotência) e documentos. Preserva usuários, organizações, assinaturas e registros financeiros. As associações iniciais e as organizações das sessões são preenchidas a partir dos dados existentes. A reaplicação não substitui membros nem altera sessões que já selecionaram outro espaço.

A migração foi aplicada e reaplicada no banco exclusivo `nexo_test`; o banco de destino do usuário ainda precisa recebê-la. Não execute `01_criar_banco.sql` em um banco existente.

```bash
psql -v ON_ERROR_STOP=1 -d nexo -f database/11_produto_financas_equipes.sql
```

Use sua conexão administrativa habitual e forneça credenciais pelo mecanismo seguro já utilizado. Veja [../docs/PRODUTO.md](../docs/PRODUTO.md) para permissões, limites e configuração.

## Banco dos testes

A assinatura simulada exige também `10_assinaturas_simuladas.sql`, aplicada depois da `09`, no banco existente. Ela adiciona a versão da assinatura, expande os status permitidos e cria checkouts e histórico de alterações por organização. Não muda planos existentes nem exclui informações. A reaplicação preserva registros existentes. Os detalhes estão em [../docs/ASSINATURAS.md](../docs/ASSINATURAS.md).

Os testes de integração precisam de um **banco PostgreSQL exclusivo de teste**, preparado com os mesmos scripts e permissões. Eles criam contas sintéticas e alteram seus dados para testar expiração, inatividade e bloqueios. Não aponte os testes para produção.

Configure `NEXO_TEST_DB_URL`, `NEXO_TEST_DB_USERNAME` e `NEXO_TEST_DB_PASSWORD` no processo do Maven. Sem `NEXO_TEST_DB_URL`, esses testes são explicitamente ignorados; isso não valida a integração.

## Custo desconhecido — Fase 1 de integridade

Aplique uma vez `12_custo_desconhecido.sql` depois da `11`, como proprietário das tabelas. Ela permite NULL nos snapshots de custo/lucro das vendas novas quando não há ficha de custo, com constraints de coerência. Zero explícito continua zero. Não modifica os valores das vendas históricas nem as despesas. O código atualizado deve iniciar somente após a migração. Prepare também o banco exclusivo de testes; não reaplique scripts antigos.
