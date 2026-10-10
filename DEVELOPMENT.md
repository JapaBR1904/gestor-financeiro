# Desenvolvimento do Nexo

A nova arquitetura está sendo construída na branch `nexo-next-spring`.

## Estrutura

```text
frontend/   Next.js + React + TypeScript
backend/    Java + Spring Boot
```

## Frontend

Pré-requisito: Node.js compatível com Next.js 16.

```powershell
cd frontend
npm install
npm run dev
```

O frontend fica disponível em `http://localhost:3000`.

## PostgreSQL local

Banco usado pelo projeto:

```text
nexo
```

Usuário local recomendado para o backend:

```text
nexo_app
```

Os scripts de criação ficam na pasta `database/`.

Nunca coloque a senha real do PostgreSQL no GitHub.

## Backend

Pré-requisitos: Java 21, Maven e PostgreSQL em execução.

O Spring Boot lê a senha pela variável de ambiente `DB_PASSWORD`. No PowerShell, defina a senha apenas no terminal que vai executar o backend:

```powershell
$env:DB_PASSWORD="SUA_SENHA_LOCAL"
```

A URL e o usuário já possuem valores locais padrão:

```text
DB_URL=jdbc:postgresql://localhost:5432/nexo
DB_USERNAME=nexo_app
```

Se precisar substituir esses valores no terminal:

```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/nexo"
$env:DB_USERNAME="nexo_app"
```

Depois inicie o backend:

```powershell
cd backend
mvn spring-boot:run
```

O backend fica disponível em `http://localhost:8080`.

### Health check

```text
GET http://localhost:8080/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "app": "Nexo"
}
```

### APIs iniciais

Organizações:

```text
GET  /api/organizacoes
POST /api/organizacoes
```

Produtos:

```text
GET  /api/produtos?organizacaoId=1
POST /api/produtos
```

O custo de cada ingrediente e o lucro unitário estimado são calculados no backend. O frontend ainda será migrado do armazenamento temporário do navegador para essa API.

## Próximas etapas

1. Confirmar conexão do Spring Boot com PostgreSQL.
2. Testar criação de organização e produto pela API.
3. Ligar o frontend à API e retirar o armazenamento temporário no navegador.
4. Criar usuário dono, cadastro e login.
5. Continuar módulos de vendas, despesas e fluxo de caixa.
