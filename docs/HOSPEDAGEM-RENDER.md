# Hospedagem inicial no Render

Preparação autorizada em24/10/2026. Usar somente plano Free, sem cobrança, main/merge/forcepush ou acesso ao banco local nexo. Cadastro por aprovação manual, sem email real. Não representa conclusão de pagamento/IA/recuperação de produção ou certificação de segurança.

## Componentes

- Frontend: WebService Node22, rootfrontend, branch nexo-next-spring; npm ci --include=optional && npm run build; npm run start -- --hostname 0.0.0.0 --port $PORT. AutoDeployOff. Healthcheck /.
- API: WebService Docker, rootbackend, mesma branch, Free. Dockerfile multistage Maven3.10/Java21, runtimeJRE21 e usuário numérico sem root. Perfilproduction, portaPORT, limites de pool/threads para instância512MB. Healthcheck /api/auth/disponibilidade. Docker não encontrado no PATH; imagem ainda não construída/executada localmente. Render terá de validar a imagem real.
- Banco: projeto NOVO no NeonFree, sem importar nexo ou backups. Aplicar somente scripts de esquema revisados; não rodar bootstrap antigo com CREATE DATABASE ou conexão ao nexo local. Banco cloud/conta dependem do login do usuário.

## Comunicação e segredos

NEXO_BACKEND_URL é a origemHTTPS da API, configurada no frontend ANTES do build. Next usa rewrites /api/:path* para essa origem. Navegador usa mesmo site; cookies HttpOnly/Strict do administrador e Lax do usuário não dependem de terceiros. URL de backend não aceita credenciais, caminho, query ou fragmento. HTTP somente em loopback para testes.

NEXT_PUBLIC_API_URL pode ser omitida na hospedagem: produção usa URL relativa e desenvolvimento mantém localhost8080. Nunca inserir senha/chave nessa variável pública. Se estiver definida de implantação anterior, removê-la para usar o proxy.

API exige DB_URL JDBCPostgreSQL com TLS, DB_USERNAME/DB_PASSWORD, NEXO_FRONTEND_URL e NEXO_ALLOWED_ORIGINS iguais à origemHTTPS efetiva do frontend, COOKIE_SECURE=true, NEXO_MANUAL_APPROVAL_ENABLED=true e as duas credenciais administrativas descritas em CADASTRO-MANUAL.md. Segredos somente no gerenciador do provedor, definidos diretamente pelo usuário, nunca neste documento, Git ou chat. Perfilproduction não tem fallback de conexão para banco local. Envio de email desativado por padrão; simulador de pagamento e troca protótipo de plano desligados. Planos0/39/99 preservados.

Os arquivos enviados pertencem ao repositório; .dockerignore exclui .env, target e logs no contexto backend. Documentos da aplicação ficam no PostgreSQL, não em disco efêmero do Render.

## Evidências

Migração14 aplicada SOMENTE no banco descartável nexo_test/127.0.0.1:55433. Foram aprovados2testes HTTP/PostgreSQL do cadastro manual e23de compatibilidade de autenticação, sem skips. Cluster descartável encerrado depois.

Proxy real do Next testado contra servidor HTTP SINTÉTICO em loopback18153: cookies HttpOnly, persistência, Origin, escopo administrativo Strict e logout preservados; chamadas do navegador ficaram na mesma origem. Cinco E2E passaram (proxy+cadastro+trêsrecuperação), build/lint aprovados. Quarenta e sete testes frontend passaram, incluindo2casos de validação de configuração. Backend empacotado com o perfilproduction. Isso não valida ainda Linux/Docker/Render/TLS real.

Fontes verificadas: https://render.com/docs/free ; https://render.com/docs/docker ; https://neon.com/pricing ; imagens oficiais https://hub.docker.com/_/maven e https://hub.docker.com/_/eclipse-temurin . RenderFree tem750horas compartilhadas/mês entre serviços, suspensão por inatividade, recursos512MB e limitações de produção. Dois serviços usam a mesma franquia. NeonFree tem limites de armazenamento/compute. Não ativar plano pago para resolver limites sem aprovação.

## Pendências para publicar

Login do usuário no Neon; criar banco vazio e revisar/aplicar esquema; criar/configurar API e frontend no Free; usuário definir credencial administrativa forte no secretmanager; confirmar origens, proxy e cookies HTTPS; executar smoke test com conta sintética pendente/aprovada/login/refresh/logout e bloqueio anônimo do painel. Só então informar URL funcionando. Nenhum serviço foi criado ou publicado nesta preparação.
