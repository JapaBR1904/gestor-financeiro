# Desenvolvimento do Nexo

A nova arquitetura está sendo construída na branch `nexo-next-spring`.

## Estrutura

```text
frontend/   Next.js + React + TypeScript
backend/    Java + Spring Boot
```

## Frontend

Pré-requisito: Node.js compatível com Next.js 16.

```bash
cd frontend
npm install
npm run dev
```

O frontend fica disponível em `http://localhost:3000`.

## Backend

Pré-requisito: Java 21 e Maven.

```bash
cd backend
mvn spring-boot:run
```

O backend fica disponível em `http://localhost:8080`.

Para conferir se ele está funcionando:

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

## Próxima etapa

1. Adicionar PostgreSQL.
2. Criar a entidade de organização/empresa.
3. Criar usuário dono.
4. Implementar cadastro e login.

Não colocar credenciais reais no repositório.
