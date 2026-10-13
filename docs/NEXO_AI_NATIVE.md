# Nexo: assinatura em dev e identidade azul

Etapa na branch `nexo-next-spring`, iniciada em `c6be20fc3b30c2fc0835d7e5d8f658f7ef75bf57`. O produto existente foi preservado: autenticação, recuperação, Resend, organizações, financeiro, regras dos planos e dados. Não houve deploy, merge, alteração de `main`, credenciais, migrations ou gateway real.

## Por que aparecia “Troca indisponível”

`PagamentoSimulado` exige perfil dev/test **e** a propriedade habilitada. O arquivo base usava `${PAGAMENTO_SIMULADO_ENABLED:false}` e não existia arquivo dev com outro padrão. Selecionar apenas dev mantinha o simulador ausente, e `PoliticaAssinatura` devolvia `simulacaoHabilitada=false`.

A interface reunia esse caso e `podeGerenciar=false` em um único botão, sem explicar a diferença. A permissão de gerenciamento continua exclusiva do proprietário; administradores e membros não receberam acesso adicional.

`application-dev.properties` agora habilita a simulação por padrão em dev. A flag false explícita continua desligando. A expressão `@Profile("(dev | test) & !prod & !production")` permaneceu: produção, inclusive combinada com dev/test e flag true, nunca cria o simulador. O startup informa somente habilitado/desabilitado, sem valores de configuração ou segredos.

A API acrescenta `ambienteDesenvolvimento`. A interface distingue plano atual, permissão do proprietário, simulação desabilitada, checkout indisponível e erro de carregamento com nova tentativa. Orientação de variáveis só aparece em dev/test, sem produção ativa.

## Como iniciar

Com as variáveis do banco existente já configuradas, na raiz:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'dev'
mvn -f backend/pom.xml spring-boot:run
```

Ou em Bash:

```bash
SPRING_PROFILES_ACTIVE=dev mvn -f backend/pom.xml spring-boot:run
```

Em outro terminal:

```bash
cd frontend
npm ci
npm run dev
```

Não é necessário definir `PAGAMENTO_SIMULADO_ENABLED=true`. Se o terminal já tiver essa variável como false, remova-a para usar o padrão dev, ou defina true explicitamente. A raiz `.env` não é carregada automaticamente pelo Spring. Em test a flag continua explícita. Veja [DEVELOPMENT.md](../DEVELOPMENT.md).

## Como testar os planos

Entre como proprietário, abra **Planos**, escolha o destino, confira resumo/preço e confirme o cenário **Aprovado**. Downgrade exige o consentimento sobre limites e recursos. O plano atual não abre checkout.

| Origem | Destino | Ação | Total simulado |
| --- | --- | --- | --- |
| Free | Pro | Upgrade | R$ 39,00 |
| Free | Business | Upgrade | R$ 99,00 |
| Pro | Business | Upgrade | R$ 99,00 |
| Pro | Free | Downgrade | R$ 0,00 |
| Business | Pro | Downgrade | R$ 39,00 |
| Business | Free | Downgrade | R$ 0,00 |

Os valores vêm do catálogo do backend, sem cobrança, rateio ou renovação real. O evento `nexo:workspace` atualiza assinatura, configuração, badge e locks; navegação interna não exige F5/logout. O plano permanece depois de refresh e novo login. A atualização transacional, idempotência e bloqueios por organização foram mantidos.

Recusa, erro e cancelamento não promovem o plano. Erro permite nova tentativa da operação pendente. Expiração, operação desatualizada, chave reutilizada para outro destino, confirmação repetida e concorrência são cobertos no backend. O navegador também verifica clique duplo.

Dados de metas, usuários e documentos permanecem depois de downgrade; o acesso aos recursos pagos é bloqueado pelo servidor e volta no upgrade correspondente. Free e Pro são individuais; Business permite até 10 usuários incluindo o proprietário.

## Direção visual

Fintech azul com identidade AI-native: navegação navy, azul elétrico, cyan, luz ambiente e superfícies com profundidade. Manrope local, textos, organização, componentes, semântica e mobile da revisão anterior foram preservados.

O antigo `polish.css` foi estudado via `git show 95d456d2bc77c9d397968f4bb56f273405b05023:frontend/app/polish.css`. Foram recuperadas luzes radiais, navegação escura, seleção luminosa, gradientes nos botões e sensação de profundidade. Nenhum arquivo antigo foi restaurado.

Elementos novos: órbitas da marca no login, halos no saldo, gradiente azul/cyan em progressos, Pro luminoso, Business navy/cyan, comparativo baseado nos recursos reais do catálogo e estados de checkout com identidade do destino. IA mantém disponibilidade real, com símbolo luminoso, superfície contextual e shimmer.

Entrada de páginas/cards, badge de plano, botões, drawer, gráficos, progressos e confirmação têm movimento curto. Campos ambientais e a marca possuem movimento lento apenas em desktop. Reduced-motion desativa animações/transições, incluindo pseudo-elementos. Não há dependência nova, partículas JavaScript, canvas ou filtros animados. O blur está limitado à composição de login desktop e é desligado no mobile.

CSS: `globals.css`, `navigation.css`, `auth.css`, `saas.css`, `checkout.css`, `product.css`, `ia.css`; novo `ambient.css`. Os tokens ficam centralizados, com tokens locais de contraste na navegação e no Business. Ajustes React foram pontuais: marca decorativa, identidade do plano, comparativo, cards financeiros e gradiente do gráfico.

## Validação final

- `mvn -f backend/pom.xml package`, com PostgreSQL exclusivo de teste e navegador habilitado: **231 testes backend, 0 falhas, 0 erros, 0 ignorados; JAR gerado**. Variáveis Resend sintéticas estavam presentes no terminal para verificar isolamento dos fixtures.
- `npm test`: **30 passaram**. `npx --no-install tsc --noEmit`, `npm run lint` e `npm run build`: **passaram**, sem erros/avisos de lint.
- Playwright: **14 cenários passaram**. Depois do ajuste final de navegação, os 14 foram repetidos e passaram, incluindo verificação do item ativo nas páginas e larguras desktop.
- Revisão no Chromium com JAR normal em dev, sem flag de pagamento: login, downgrade inicial para Free, Free → Pro → Business → Pro → Free e retorno a Business, com refresh entre etapas, badge atualizado por navegação interna e dados preservados.
- Pro: metas, análise/comparativos, exportação CSV (download real no navegador) e status/autorização da IA devolveram 200. Equipe e documentos continuaram em 403 antes de Business.
- Business: equipe, convites, papéis, seleção/isolamento de organização e documentos passaram nas suítes. A revisão no JAR conferiu 2 membros e 2 documentos antes/depois do downgrade e reativação, sem perda.
- Revisão visual final: **119 combinações de página/largura**, em 1440, 1280, 1024, 768, 430, 390 e 360 px, sem overflow horizontal e com Manrope carregada. Login e demais fluxos públicos também foram conferidos nas sete larguras pelo Playwright.
- Auditoria adicional: **47 verificações A/AA com axe**, incluindo drawer aberto, sem violações detectadas. Isso não substitui uma avaliação humana completa de acessibilidade.
- Teclado, foco do drawer, Escape, gráfico acessível e reduced-motion passaram. A inspeção humana das capturas identificou o item ativo da sidebar parcialmente fora da área rolável em telas baixas; o ajuste usa rolagem apenas no menu e um observador de dimensões, com cleanup. Foi verificado também ao reduzir a altura para 600/500 px, sem rolar o conteúdo principal.
- `git diff --check`: passou.

Houve duas falhas intermediárias de teste, corrigidas: a conta reutilizada já estava Pro, e um reload interrompia a navegação interna antes do término. O teste de mensagens usa agora conta própria; o teste de persistência espera a URL e o conteúdo antes do refresh. Nenhuma asserção funcional foi removida.

## Capturas preservadas no Git

Todas usam contas e dados sintéticos do banco exclusivo de teste, sem credenciais, códigos ou links privados de convite.

- [Login desktop](design/login-desktop.png)
- [Dashboard desktop](design/dashboard-desktop.png)
- [Dashboard mobile](design/dashboard-mobile.png)
- [Planos](design/planos-desktop.png)
- [Checkout Free → Pro](design/checkout-desktop.png)
- [Pro ativo](design/pro-desktop.png)
- [Business / equipe](design/business-equipe-desktop.png)
- [IA](design/ia-desktop.png)
- [Metas](design/metas-desktop.png)
- [Fluxo de caixa](design/fluxo-desktop.png)
- [Documentos](design/documentos-desktop.png)

## Limitações reais

Pagamento real, gateway, webhook, cobrança e renovação continuam fora desta etapa. Resend externo e Gemini real não foram chamados nesta máquina; testes de transporte usam servidores/capturadores locais e o navegador usa mensagens sintéticas. A IA do JAR de revisão está sem chave, e sua indisponibilidade é mostrada corretamente. Os estados de pergunta/resposta foram validados com fixture explicitamente restrito ao navegador de teste, sem substituir o serviço na aplicação.

Não foram adicionadas dependências nem alteradas credenciais ou regras de produção. Não existe pendência de troca de plano para o proprietário em dev corretamente configurado. Não há overflow ou falha visual conhecida nas larguras verificadas; outros navegadores/dispositivos físicos e métricas de Core Web Vitals em uso real não foram medidos nesta máquina.

## Checkpoints preservados

- `f710d7b0d8668452b3891bc41c1abcaf4345a594` — Corrige assinatura simulada e troca de planos.
- `d06df0c9e68c3a574ba50377ddde80a7551aa4c3` — Recupera identidade azul e atmosfera visual do Nexo.
- `796d57f9f494008050fd3d8d7cd5e211edafefe2` — Refina dashboard, planos e microinterações.

Todos foram enviados exclusivamente a `nexo-next-spring` antes da validação final, com frontend compilado, typecheck/lint/testes e revisão dos respectivos blocos. O commit final inclui o acabamento, evidências e relatório atualizado.
