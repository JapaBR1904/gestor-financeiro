# Organização e UX — Fase 2

Base de implementação: `b828006c3fda6cc4af5ed50130b3e00a3467da40` na branch `nexo-next-spring`.

Esta fase cobre somente os achados A06, A15, A16 e A17 da revisão sênior. As correções de confiabilidade da Fase 1 permanecem preservadas. Integração Gemini, cobrança, e-mail, autenticação, ERP, estoque, OCR e os demais achados continuam fora deste escopo.

## A06 — Primeiro acesso e primeiro resultado

O dashboard agora oferece uma escolha curta e dispensável de perfil apenas quando o backend informa `onboardingConcluido=false`. Usuários existentes com onboarding concluído e membros de espaços compartilhados não recebem essa etapa novamente.

As três escolhas levam a uma primeira ação coerente:

- Pessoal: abre uma nova movimentação em `/pessoal?novo=1`.
- Negócio: abre o cadastro do primeiro produto em `/produtos/novo?origem=onboarding`.
- Empresa: abre a gestão do espaço em `/empresa`.

A escolha rápida salva o perfil no backend e mantém somente objetivos compatíveis com o perfil escolhido. O botão “Agora não” apenas dispensa a orientação naquele navegador/espaço; não grava conclusão falsa no servidor.

O onboarding completo existente também foi alinhado: Negócio passa a começar pelo cadastro do produto, não por uma venda impossível sem catálogo. Na tela de nova venda, o estado sem produtos oferece a ação explícita “Cadastrar primeiro produto”. Produtos criados a partir do onboarding ou dessa venda retornam para `/vendas/nova` após salvar.

## A15 — Navegação por intenção

### Pessoal

- Seu dinheiro: Resumo, Movimentações.
- Planejamento: Metas, Análise do período.
- Nexo IA como destino próprio, sem grupo “Ferramentas”.
- Conta: Perfil e privacidade, Assinatura.

### Negócio e Empresa

- Dia a dia: Resumo, Movimentações, Vendas, Despesas.
- Cadastros: Produtos, Clientes.
- Análises: Por período, Metas, Histórico comercial.
- Gestão: Espaço, Equipe, Documentos.
- Nexo IA como destino próprio.
- Conta: Perfil e privacidade, Assinatura.

Os bloqueios de Pro/Business continuam visuais e as rotas existentes foram preservadas. “Produtos” continua sendo o termo usado porque o cadastro atual não modela serviços separadamente.

## A16 — Escopo de Essencial / Completo

O seletor continua usando as preferências existentes, mas agora recebe o rótulo visível e acessível “Detalhes do resumo”. No workspace normal ele aparece somente no dashboard, onde essa preferência produz efeito visual direto; o onboarding ainda pode oferecê-lo ao preparar o resumo inicial.

“Ocultar valores” permanece independente e continua disponível nas telas financeiras em que a preferência de privacidade já era oferecida. Nenhuma regra de plano, permissão ou persistência foi alterada.

## A17 — Hierarquia mobile

Em telas de até 600 px, a orientação longa do dashboard deixa de ocupar o espaço anterior aos dados. O contexto essencial continua no cabeçalho, enquanto período e cartões financeiros aparecem mais cedo. Os controles de detalhes e privacidade também ficam mais compactos.

A escolha de primeiro acesso continua acima dos números quando realmente necessária, porque ela é a ação principal para um espaço ainda não configurado. Em telas maiores, a orientação contextual existente permanece.

Não houve redesign global, troca de identidade, alteração da paleta azul/navy/cyan, Manrope ou números tabulares.

## Testes e validação esperada

Foram atualizadas as expectativas da navegação existente e adicionado `frontend/tests/e2e/organizacao-ux.spec.ts` cobrindo:

- primeiro acesso Pessoal, Negócio e Empresa;
- usuário existente sem onboarding indevido;
- venda vazia -> primeiro produto -> retorno para venda;
- navegação Pessoal, Negócio e Empresa;
- “Detalhes do resumo” restrito ao resumo e privacidade mantida separada;
- 430, 390 e 360 px sem overflow e com números priorizados.

A validação local recomendada, a partir de `frontend`, é:

```powershell
npm test
npx --no-install tsc --noEmit
npm run lint
npm run build
npx playwright test tests/e2e/organizacao-ux.spec.ts tests/e2e/confianca.spec.ts tests/e2e/adaptativa.spec.ts tests/e2e/integridade.spec.ts
npm run test:e2e
```

A execução local deve usar somente dados sintéticos / banco de teste, preservando o banco principal. Capturas visuais só devem ser registradas depois de a suíte de navegador passar; este commit não afirma validação em aparelho físico.
