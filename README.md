# Nexo

Gestão financeira e operacional para pequenos negócios, com isolamento por organização.

A aplicação desta branch usa **Next.js + React + TypeScript** em `frontend/`, **Java 21 + Spring Boot** em `backend/` e **PostgreSQL**. A versão PHP permanece no histórico e na branch principal; seu esqueleto sem uso foi removido desta branch.

## Desenvolvimento

Veja [DEVELOPMENT.md](DEVELOPMENT.md) para preparar o banco, configurar o e-mail e executar os dois serviços. Os scripts SQL são incrementais e ficam em [database/](database/README.md).

## Autenticação

- Cadastro com nome, e-mail, senha e confirmação.
- Confirmação do e-mail por código de seis dígitos, antes de iniciar a sessão.
- Login com e-mail e senha, usando cookie HTTP-only.
- Recuperação por código, seguida de prova temporária em cookie HTTP-only para definir outra senha.
- Senhas com BCrypt, códigos com hash, limites de solicitações/tentativas e uso único.
- Redefinição da senha encerra as sessões anteriores. Contas antigas podem definir a primeira senha pela recuperação, preservando sua organização e seus dados.

O resumo da implementação, endpoints e evidências de validação estão em [docs/AUTENTICACAO.md](docs/AUTENTICACAO.md).

Nunca versione credenciais, arquivos `.env` reais ou backups de dados pessoais.
