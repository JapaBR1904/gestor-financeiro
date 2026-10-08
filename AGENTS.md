# Instruções para agentes de código

## Projeto

Este repositório contém um gestor financeiro web para uma pequena produção e venda de bolos.

## Stack obrigatória

- PHP puro
- MySQL
- PDO
- HTML
- CSS
- JavaScript

Não adicionar Java, Node.js, frameworks PHP ou frameworks JavaScript sem necessidade explícita.

## Objetivos de código

- Manter o código simples e didático.
- Priorizar legibilidade em vez de soluções excessivamente abstratas.
- Usar nomes claros em português quando fizer sentido.
- Explicar mudanças importantes em comentários apenas quando o código não for autoexplicativo.
- Não duplicar lógica desnecessariamente.

## Arquitetura

Usar MVC simples:

- `models/`: regras de acesso e manipulação de dados.
- `views/`: interface apresentada ao usuário.
- `controllers/`: recebe ações do usuário e coordena models e views.
- `config/`: configurações e infraestrutura.
- `public/`: ponto de entrada e arquivos públicos.

## Banco de dados

- Usar PDO.
- Usar prepared statements em consultas com valores fornecidos pelo usuário.
- Nunca concatenar dados do usuário diretamente em SQL.
- Usar transações quando uma operação depender de várias alterações que precisam ocorrer juntas.

## Segurança

- Nunca salvar credenciais reais no repositório.
- Nunca commitar `.env`.
- Nunca exibir mensagens internas do banco ao usuário final em produção.
- Validar dados no backend mesmo que exista validação no frontend.
- Escapar dados exibidos em HTML quando vierem de usuários ou banco de dados.

## Interface

- O sistema deve funcionar bem em desktop e celular.
- Visual moderno, limpo e simples.
- Priorizar facilidade de uso para uma pessoa sem conhecimento técnico.
- Evitar excesso de animações ou elementos visuais que atrapalhem a leitura.

## Funcionalidades planejadas

1. Dashboard financeiro.
2. Produtos.
3. Vendas e pedidos.
4. Despesas.
5. Clientes.
6. Relatórios.
7. Controle de estoque em uma fase posterior.

## Ao fazer alterações

- Não alterar funcionalidades não relacionadas à tarefa pedida.
- Reaproveitar a estrutura existente antes de criar novas soluções.
- Manter compatibilidade com PHP e MySQL comuns em ambiente local.
- Atualizar o README quando uma mudança alterar instalação, estrutura ou funcionamento importante do sistema.
