# Resumo — atalhos de período

O dashboard oferece Hoje, Este mês e Mês anterior acima do seletor personalizado. São apenas atalhos para datas que a consulta financeira já aceita; nenhum cálculo, dado, plano ou permissão foi alterado.

O dia de referência usa `datasDoMes()`, no fuso America/Sao_Paulo. O mês anterior usa limites de calendário em UTC para produzir as datas ISO, incluindo virada do ano e fevereiro bissexto. O botão ativo reflete o período retornado pelo backend, evitando mostrar dados antigos como se pertencessem ao filtro novo. Os controles ficam desabilitados durante carregamento, gravação ou edição.

Aceite verificado em 24/10/2026:

- TypeScript e lint aprovados; build de produção aprovado.
- 14 cenários de navegador passaram: 12 existentes de organização/primeiro acesso/perfis/mobile e dois novos de datas, fuso, privacidade, acessibilidade e responsividade.
- O teste de virada de ano fixa 01/01/2026 01:30 UTC e confirma que Hoje ainda é 31/12/2025 em São Paulo.
- O teste de bissexto confirma 29/02/2028 como fim do mês anterior.
- Testes usam somente fixtures e requisições interceptadas; nenhum banco ou conta real.
- Privacidade continua ocultando valores. Captura 360 px inspecionada, sem overflow; números continuam priorizados nos testes mobile existentes.

Não há saldo inicial, previsão de recebimento ou nova regra financeira nesta entrega. Esses contratos continuam sujeitos ao plano da Fase 3 e aprovação específica.
