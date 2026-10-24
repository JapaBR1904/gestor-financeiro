# Cadastro com aprovação manual

Recurso solicitado em24/10/2026. Desativado por padrão. Sem envio de emails, sem usar admin/admin em produção e sem declarar posse de email quando o responsável apenas aprovou o acesso.

## Fluxo

Cadastro cria usuário e organização como antes, mas grava pedido pendente na mesma transação e responde202, sem sessão. O visitante vê Cadastro recebido. Login com senha correta e sessões existentes só são aceitos após aprovação; para uma conta com pedido manual, verificar email não contorna a decisão. Contas anteriores verificadas, sem pedido manual, mantêm acesso. Recusados não entram.

O responsável acessa /admin/cadastros, confere identidade por canal conhecido e aprova ou recusa. Decisão atômica só ocorre em pedido pendente, com operador/data registrados. A tabela guarda estado separado; email_verificado_em não é preenchido pela aprovação. Não há reversão de decisões nesta etapa. Lista limitada aos100 pedidos mais antigos; decisões devem ser tratadas para alcançar os seguintes.

## Ativação explícita

1. Aprovar e aplicar database/14_cadastros_manuais.sql no banco NOVO da hospedagem e/ou no cluster descartável de teste autorizado. Não executada automaticamente. Não usar banco local nexo. JDBC só acessa a tabela quando o recurso está habilitado; JPA não exige tabela nova nos ambientes antigos com recurso desligado.
2. Configurar NEXO_MANUAL_APPROVAL_ENABLED=true no backend.
3. Configurar NEXO_ADMIN_CADASTROS_USUARIO e NEXO_ADMIN_CADASTROS_SENHA no gerenciador de segredos do provedor. Senha própria de pelo menos24 caracteres e até72bytes UTF8; nunca admin/admin, nunca no Git/frontend/chat. Usuário define a credencial diretamente no ambiente seguro.
4. Fora de dev/test local, exige COOKIE_SECURE=true e NEXO_FRONTEND_URL com origem HTTPS exata, sem caminho ou barra final. Ajustar NEXO_ALLOWED_ORIGINS para essa mesma origem. Frontend e API precisam do mesmo site/proxy para cookies e filtro CSRF. Não publicar com fallback localhost:8080.
5. Manter NEXO_EMAIL_VERIFICATION_ENABLED no padrão true; a aprovação manual é um modo explícito de acesso separado e não desativa o guard de produção da dispensa local. NEXO_EMAIL_PROVIDER=disabled mantém envio suspenso. Não desabilitar o modo manual depois de liberar contas sem planejar transição: emails ainda não foram verificados.

Sem segredo próprio ou HTTPS/cookie seguros, a inicialização do modo manual falha. Origin exata exigida em escrita; cookie administrativo separado HttpOnly/Strict900s, hash da sessão em memória, logout/reentrada invalidam sessão, cinco falhas bloqueiam15min. Uma sessão administrativa ativa por instância; reinício exige novo login. Limitado a uma instância nesta etapa; não configurar múltiplas réplicas.

/admin mantém o fluxo antigo de recuperação somente local e oferece link para o painel de cadastros. Esta etapa NÃO habilita admin/admin ou recuperação assistida local na internet. Recuperação em produção e gestão completa de operadores não foram implementadas nesta mudança.

## Validação desta etapa

24 testes backend distintos de unidade/configuração passaram:13novos de cadastro/admin/controlador,5configuração existente,6regressões locais. Build/empacotamento backend aprovados, incluindo o DTO com decisão explícita obrigatória. Lint e build frontend aprovados; novo E2E de cadastro/painel com fixtures e3E2E da recuperação existente passaram. O seletor inicial Senha foi corrigido para o nome existente Nova senha. Capturas390px inspecionadas e axe sem violações detectadas.

CadastroManualIntegrationTest está PREPARADO, ainda NÃO executado: exige opt-in NEXO_TEST_MANUAL_APPROVAL=true e NEXO_TEST_DB_URL EXATAMENTE jdbc:postgresql://127.0.0.1:55433/nexo_test. Não aplica migração sozinho. Cobrirá202 semcookie, bloqueio pendente, decisão admin/identidade, login/me após aprovação sem email verificado, negação de sessão comum, recusa, logout, auditoria e concorrência200/400.

Migração ainda NÃO aplicada; nenhum banco/conta real acessado. Os scans anteriores não cobrem estes arquivos novos. Publicação depende da aprovação de esquema, integração PostgreSQL, configuração segura do operador e infraestrutura. Não alegar entrega de email ou produção concluída.
