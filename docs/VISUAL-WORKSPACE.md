# Visual do workspace — 24/10/2026

Refinamento solicitado após as revisões finais: fundo com grade e luz azul/ciano, navegação com profundidade, cartões com bordas luminosas, destaque do resultado, cabeçalhos de tabelas e feedback de hover/foco. Aplicação restrita a .app-shell; preserva áreas públicas, dados, APIs e regras financeiras.

Movimento finito, preferência de movimento reduzido, foco visível e cores forçadas tratados. Sem efeitos pesados de blur ou bibliotecas adicionais.

Validação: build e lint dos arquivos alterados aprovados; teste com fixtures em dashboard, produtos e vendas nas larguras1440/390/360, sem overflow ou violações axe; teclado/hover, privacidade e reduced-motion exercitados. Capturas desktop/mobile inspecionadas. Primeira tentativa usou rota inexistente /financeiro; corrigido somente diagnóstico para /vendas e teste passou. Nenhum banco ou serviço real.

Login existente: cookie HttpOnly persistente por30dias, com encerramento pelo logout. Não foi criada uma opção de lembrar de mim que apenas simule persistência. Inspeção de código não substitui teste em hospedagem com HTTPS/cookies reais.
