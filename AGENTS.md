# Instruções para agentes de código — Nexo

## Projeto

Este repositório contém o Nexo, um gestor financeiro e operacional para pequenos negócios.

## Stack desta branch

- Frontend: Next.js + React + TypeScript.
- Backend: Java + Spring Boot.
- Banco planejado: PostgreSQL.

A versão antiga em PHP/MySQL permanece preservada na branch principal enquanto a nova arquitetura é construída nesta branch.

## Regra principal

Construir em etapas pequenas, testáveis e fáceis de entender. Não implementar vários módulos de negócio ao mesmo tempo.

## Objetivos de código

- Priorizar legibilidade e ensino.
- Evitar abstrações desnecessárias.
- Usar nomes claros em português quando fizer sentido.
- Explicar mudanças estruturais relevantes.
- Não duplicar lógica.
- Não alterar partes não relacionadas à tarefa atual.

## Comentários no código

- Adicionar comentários curtos e simples quando eles ajudarem a explicar o que um trecho faz.
- Preferir linguagem didática, por exemplo: `// Busca os clientes da empresa no banco`.
- Não comentar cada linha nem repetir exatamente o que o código já deixa óbvio.
- Em trechos mais complexos, explicar a intenção antes do bloco, sem escrever textos longos.
- O objetivo é ajudar alguém que ainda está aprendendo Next.js e Spring Boot a não se perder no projeto.

## Frontend

- Usar App Router do Next.js.
- Usar TypeScript com modo estrito.
- Separar páginas de componentes reutilizáveis.
- Manter interface responsiva, simples e limpa.
- Não colocar regras financeiras importantes apenas no frontend.

## Backend

Organizar regras de negócio com separação clara entre Controller, Service e Repository quando o módulo exigir persistência.

- Controller: recebe e responde requisições HTTP.
- Service: concentra regras de negócio.
- Repository: acessa o banco.
- Validar dados no backend mesmo que o frontend também valide.

## Multiempresa

Todos os módulos de negócio deverão ser preparados para pertencer a uma organização/empresa. Dados de empresas diferentes nunca devem se misturar.

Papéis planejados para equipe:

- DONO
- GERENTE
- OPERADOR

## Segurança

- Nunca salvar senhas ou credenciais reais no GitHub.
- Nunca commitar arquivos `.env` com segredos.
- Usar variáveis de ambiente para credenciais.
- Autorização deve ser validada no backend.

## Ordem de desenvolvimento

1. Estrutura base do frontend e backend.
2. PostgreSQL e modelo inicial da organização.
3. Cadastro da empresa e usuário dono.
4. Login e autorização.
5. Dashboard inicial.
6. Produtos e ingredientes.
7. Vendas e pedidos.
8. Despesas e calculadoras.
9. Clientes.
10. Relatórios e metas.
11. Assistente Nexo e recursos por plano.

## Ao fazer alterações

- Fazer uma etapa por vez.
- Manter o projeto executável ao final de cada etapa sempre que possível.
- Atualizar documentação quando arquitetura, instalação ou execução mudar.
