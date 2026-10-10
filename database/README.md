# Database

Esta pasta guarda os scripts PostgreSQL do Nexo. Não coloque backups com dados pessoais, financeiros reais ou credenciais aqui.

## Ordem para preparar o banco local

1. Abra o pgAdmin e conecte ao PostgreSQL.
2. No Query Tool do banco `postgres`, execute `01_criar_banco.sql`.
3. Atualize a lista de bancos e abra o banco `nexo`.
4. No Query Tool do banco `nexo`, execute `02_estrutura_produtos.sql`.

O segundo script cria a base multiempresa inicial e as tabelas de produtos, ingredientes e ficha de custo. O backend ainda não depende dessas tabelas nesta etapa, então você pode continuar rodando o Spring Boot mesmo antes de executar os scripts.

## Importante

As credenciais de conexão do PostgreSQL não devem ser salvas no GitHub. Quando a integração com o Spring Boot for ativada, usuário, senha e URL serão configurados por variáveis de ambiente.
