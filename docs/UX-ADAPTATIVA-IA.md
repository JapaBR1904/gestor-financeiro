# UX adaptativa e IA contextual do Nexo

Execução de 15/10/2026, iniciada pelo agendamento de 01:00 em America/Sao_Paulo. Repositório `JapaBR1904/gestor-financeiro`, branch exclusiva `nexo-next-spring`.

## 1. SHA inicial

`b3c09a56b6fb6f66e944d2121e383a597209ef69` — “Finaliza polish futurista, acessibilidade e responsividade”. A árvore estava limpa. Antes da primeira edição foram executados `git status`, `git branch --show-current`, `git log -10 --oneline`, `git diff` e `git diff --cached`. O commit esperado era o HEAD, sem trabalho local desconhecido.

## 2. Diagnóstico

A base já tinha autenticação, onboarding, perfis persistidos, planos, permissões no servidor, financeiro, fluxo, metas, relatórios, organizações, equipe, documentos e Gemini. As principais lacunas eram a pouca consequência visual do perfil, o excesso de opções iniciais e uma IA com contexto financeiro insuficiente. Foram reutilizados os serviços, componentes, contratos e testes existentes.

Landing, logo, favicon, Manrope, identidade navy/azul/cyan, brand reveal e sistema de movimento foram preservados. A demonstração opcional por perfil na landing não foi adicionada; a personalização ocorre na experiência autenticada.

Os quatro conceitos continuam independentes:

| Conceito | Responsabilidade |
| --- | --- |
| Perfil Pessoal/Negócio/Empresa | Linguagem, navegação, orientação, sugestões e contexto |
| Essencial/Completo | Densidade visual escolhida pela pessoa |
| Permissão | Ações autorizadas pelo backend conforme papel existente |
| Free/Pro/Business | Recursos contratados, com preços preservados de R$ 0/R$ 39/R$ 99 por mês |

## 3. Perfil Pessoal

Dashboard “Seu dinheiro”, entradas, gastos, resultado do período e ação de nova movimentação. A navegação começa por Resumo, Movimentações e Suas metas. Recursos adicionais e gestão ficam em grupos recolhidos. O resultado não é apresentado como saldo disponível. Exemplos pessoais nas capturas são dados sintéticos, separados do código de produto e dos dados reais.

## 4. Perfil Negócio

Resumo, Vendas, Despesas e Produtos vêm primeiro. Clientes e análises ficam disponíveis em um grupo secundário. Atalhos levam a registrar venda ou despesa. O dashboard identifica vendas registradas e explica que elas não comprovam recebimento. O formulário de venda mantém produto e quantidade em destaque; cliente e observação ficam em “Mais opções”. Não foi criado um ERP ou um novo modelo de contas a receber.

## 5. Perfil Empresa

“Resumo da empresa” destaca o espaço atual, equipe, documentos e responsabilidades. O guia descreve os papéis reais: membros consultam e registram movimentações, vendas e despesas; proprietário/administrador também editam e administram acessos; somente proprietário gerencia administradores. Documentos exigem Business e suas ações de gestão continuam protegidas no servidor. Não foram criados novos papéis.

## 6. Essencial

É a apresentação inicial. Exibe período, números principais, ação de registro, movimentações recentes e orientação. O painel adicional de categorias fica recolhido, com “Ver detalhes do período”. Nenhum cálculo ou direito de acesso muda com essa preferência.

## 7. Completo

Revela o painel de categorias e a composição visual adicional do dashboard. Fluxo, metas, exportação e outros recursos continuam sujeitos ao plano e às permissões originais. A preferência é persistida por usuário e organização no navegador; não modifica a assinatura.

## 8. Onboarding

As três etapas existentes foram mantidas. A conclusão leva ao primeiro resultado útil: Pessoal abre o primeiro lançamento, Negócio abre nova venda e Empresa abre a preparação do espaço. “Conhecer planos” é secundário. O nível de detalhes pode ser escolhido na etapa final. Os três perfis são exercitados nos testes de navegação e persistência.

Cadastro vazio apresenta uma orientação simples de senha; checklist e contagem aparecem durante a digitação. A política de 16 caracteres e os demais requisitos permanecem. O login usa linguagem inclusiva sobre finanças.

## 9. Ocultar valores

Preferência por usuário e organização, com armazenamento local e fallback em memória. A moeda é mascarada nos resumos, listas, categorias, relatórios, detalhes de produtos/vendas/despesas, gráficos e metas. Labels e estruturas permanecem legíveis. O gráfico conserva a forma, mas protege valores textuais. Conversas da IA também ficam protegidas, pois perguntas e respostas podem conter números.

Campos que exporiam valores existentes em uma edição exigem revelar valores antes de continuar. A edição de progresso das metas recebe a mesma proteção. A preferência altera apresentação, sem modificar os dados, o plano ou as permissões. Não é um mecanismo de autorização nem criptografia.

## 10. Estados e loading

Resumo e fluxo usam placeholders durante o carregamento e identificam atualização. Falha de leitura não aparece como valor zero. Vendas e despesas têm erro explícito e nova tentativa. Os estados de vazio, filtro sem resultados, salvando, sucesso e falha foram mantidos ou refinados na infraestrutura existente. Exclusão manual usa diálogo consistente, descrevendo o lançamento removido e a preservação dos demais registros.

Permissão, plano insuficiente e indisponibilidade da IA têm mensagens distintas. `ApiError` preserva o status; falhas de rede/5xx da IA recebem mensagem pública sem stack trace. Os testes incluem falhas controladas e ausência de dados.

## 11. Período

Dashboard e fluxo mostram o intervalo efetivamente carregado. Alterar os campos sem aplicar não troca silenciosamente a base exibida. Exportação fica bloqueada quando o intervalo dos campos diverge dos dados ou está atualizando. O copiloto aguarda o contexto carregado, acompanha o intervalo aplicado e renova o consentimento quando ele muda.

A comparação usa o intervalo anterior de mesma duração. Relatórios comerciais identificam todo o histórico comercial; metas representam progresso atual. A IA não apresenta esses dois contextos como se fossem um resumo mensal. Respostas antigas conservam sua própria base de análise.

## 12. IA anterior

Já existiam `/ia`, status, perguntas, análise de documentos, Gemini e entitlements. A interface e os contratos foram evoluídos sem adicionar um segundo chatbot, outro provedor ou um serviço financeiro paralelo.

## 13. IA nova

“Nexo IA” possui área de introdução, seis atalhos de análise, sugestões por perfil/tela, contexto visível, pergunta, consentimento, carregamento com a marca e histórico limitado em memória. O backend seleciona agregados verificáveis dos serviços atuais, devolvendo metadados da base. A instrução orienta respostas claras, contextualizadas e somente de leitura; exige reconhecer dados ausentes e não inventar números.

Não foram criados cards com valores de demonstração como resposta do usuário. A resposta é texto; o cálculo dos fatos enviados permanece no backend. Não há ferramentas para a IA criar, alterar ou remover dados. O histórico de oito respostas é local à instância da tela, sem persistência adicional.

## 14. Pro

`IA_BASICA` foi preservada. Pro acessa a página de IA, sugestões contextuais, período e consentimento. Free recebe uma apresentação do recurso com CTA para conhecer Pro; o backend continua recusando a IA paga para Free.

## 15. Business

Business mantém os recursos de Pro e ganha o acesso persistente ao copiloto nas principais áreas financeiras. A presença é um botão no cabeçalho, ou na navegação das telas legadas. O painel só abre por ação da pessoa. Não foi adicionado alerta proativo sem um fato calculado.

## 16. Copiloto

Em desktop a partir de 1280 px, o painel lateral reserva 360 px e o conteúdo se reorganiza. Abaixo disso, usa diálogo com rolagem própria, foco contido, Escape e restauração de foco ao botão. O botão foi retirado da posição flutuante após inspeção visual para não encobrir números. Conversa e consentimento são reiniciados ao trocar organização.

## 17. Contexto

Páginas aceitas: dashboard, movimentações, fluxo, metas, despesas, vendas, relatórios, documentos e IA. O assunto da pergunta pode direcionar resumo, despesas, comparação, fluxo ou metas; a interface mostra essa escolha e renova a autorização quando ela muda.

O resumo envia totais e contagens, sem descrições de lançamentos, contas ou clientes. Despesas usam até cinco categorias. Fluxo/comparação usam agregados atual/anterior e o menor resultado acumulado calculado. Metas enviam no máximo oito títulos e progressos, priorizando ativas/prazos, além de contagens. Relatórios enviam totais comerciais sem rankings de clientes/produtos. Não é enviada a base inteira.

## 18. Segurança

Organização vem da sessão autenticada. O navegador não fornece números financeiros nem um ID alternativo de organização para o contexto. Tela/assunto são validados por lista permitida, e períodos seguem as validações do financeiro. Sem consentimento, não se consultam finanças, metas ou relatórios para o prompt.

Entitlements e permissões continuam no servidor. Há testes de Free/Pro/Business, acesso entre organizações, documentos, consentimento, contextos inválidos e indisponibilidade do provedor. Dados, categorias e documentos são tratados como entrada não confiável na instrução do Gemini. Nenhuma chave, cookie, senha, token ou arquivo `.env` real foi incluído nos commits.

## 19. Documentos

O contexto da página Documentos não anexa arquivos automaticamente. A análise explícita existente continua exigindo `IA_DOCUMENTOS`, autorização da pessoa, organização correta e permissão de leitura/gestão conforme o serviço existente. Os testes preservam as recusas de plano e acesso a documentos de outra organização.

## 20. Sidebar sweep

Pseudo-elemento CSS com transformação e opacidade; ciclo de nove segundos, linha fina cyan, halo discreto e intervalo de descanso. Não há timer React ou animação JavaScript por frame. Desativado no mobile e com `prefers-reduced-motion: reduce`. A captura congela um instante da animação somente no teste visual; não altera o comportamento de produção.

## 21. Timezone

O domínio financeiro já usava São Paulo, enquanto três fixtures antigas dependiam do dia da JVM. Entre 00:00 e 03:00 UTC, o teste podia criar dados no dia seguinte ao período do serviço. Não foi alterado o requisito funcional para satisfazer o teste.

`CalendarioFinanceiro` centraliza `Clock` e zona explícita; o serviço amostra o dia uma vez. A data padrão de despesas e custos segue esse calendário. Fixtures consultam o dia do domínio. Seis regressões com relógio fixo cobrem fusos UTC/Tóquio/São Paulo e viradas de dia, mês e ano. O frontend também calcula o mês em São Paulo. A execução inicial em UTC ocorreu fora da janela problemática e passou; a reprodução determinística está nos relógios fixos, não em uma alegação de falha inicial observada.

## 22. Mobile

Revisados 1440, 1280, 1024, 768, 430, 390 e 360 CSS px. O teste de nomes extensos/valores altos detectou um overflow em 1024 px no cabeçalho, corrigido com redução correta do contexto flexível. Listas conservam descrição, data e valor em destaque; detalhes ficam acessíveis conforme a estrutura existente. Copiloto usa drawer rolável e formulário alcançável em viewport com altura reduzida.

## 23. Acessibilidade

Testes de teclado, Escape, foco/restauração, armadilha de foco nos diálogos, estados expandidos, labels e hierarquia. Auditoria axe nas áreas novas/principais com regras WCAG 2 A/AA e 2.1 A/AA. Foram exercitados texto ampliado e reflow equivalente a zoom de 200%, valores altos e reduced motion. O sistema de redução de movimento existente foi preservado e estendido ao sweep e aos elementos decorativos da IA.

## 24. Performance

Sem nova dependência de produção. React, CSS, SVG e o cliente HTTP atual foram reutilizados. Consultas da IA são agregadas no backend, com categorias/metas limitadas no payload; não há polling do copiloto. O Gemini mantém timeout e tratamento público de falhas. A suíte contém benchmark sintético de relatórios (quantidade de consultas constante); não foi executado ensaio de carga de produção.

## 25. Arquivos alterados

```text
backend/src/main/java/br/com/nexo/despesa/DespesaService.java
backend/src/main/java/br/com/nexo/financeiro/CalendarioFinanceiro.java
backend/src/main/java/br/com/nexo/financeiro/FinanceiroService.java
backend/src/main/java/br/com/nexo/ia/ContextoIaService.java
backend/src/main/java/br/com/nexo/ia/IaController.java
backend/src/main/java/br/com/nexo/ia/IaService.java
backend/src/main/java/br/com/nexo/produto/ProdutoService.java
backend/src/main/java/br/com/nexo/saas/SaasService.java
backend/src/test/java/br/com/nexo/financeiro/CalendarioFinanceiroTest.java
backend/src/test/java/br/com/nexo/ia/ContextoIaServiceTest.java
backend/src/test/java/br/com/nexo/ia/IaServiceTest.java
backend/src/test/java/br/com/nexo/saas/AssinaturaBrowserTest.java
backend/src/test/java/br/com/nexo/saas/ProdutoIntegrationTest.java
docs/design/ux-adaptativa/*.png
docs/design/ux-adaptativa/manifesto.json
docs/design/ux-adaptativa/validacao.json
docs/design/ux-adaptativa/gemini-conectividade.json
docs/UX-ADAPTATIVA-IA.md
frontend/app/adaptativa.css
frontend/app/copiloto.css
frontend/app/despesas/[id]/editar/page.tsx
frontend/app/despesas/[id]/page.tsx
frontend/app/despesas/nova/page.tsx
frontend/app/despesas/page.tsx
frontend/app/layout.tsx
frontend/app/metas/page.tsx
frontend/app/navigation.css
frontend/app/onboarding/page.tsx
frontend/app/produtos/[id]/editar/page.tsx
frontend/app/produtos/[id]/page.tsx
frontend/app/produtos/novo/page.tsx
frontend/app/produtos/page.tsx
frontend/app/relatorios/page.tsx
frontend/app/vendas/[id]/page.tsx
frontend/app/vendas/nova/page.tsx
frontend/app/vendas/page.tsx
frontend/components/AnaliseConteudo.tsx
frontend/components/AuthCredentialsForm.tsx
frontend/components/BotaoCopiloto.tsx
frontend/components/ConfirmarExclusao.tsx
frontend/components/ConversaIa.tsx
frontend/components/CopilotoProvider.tsx
frontend/components/EdicaoProtegida.tsx
frontend/components/FinanceiroConteudo.tsx
frontend/components/GraficoSaldo.tsx
frontend/components/IaConteudo.tsx
frontend/components/PasswordFields.tsx
frontend/components/PreferenciasProvider.tsx
frontend/components/PrimeirosPassos.tsx
frontend/components/Sidebar.tsx
frontend/components/WorkspaceProvider.tsx
frontend/components/WorkspaceShell.tsx
frontend/lib/api.ts
frontend/lib/contexto-copiloto.ts
frontend/lib/financeiro.ts
frontend/lib/foco.ts
frontend/lib/ia.ts
frontend/tests/e2e/adaptativa-visual.spec.ts
frontend/tests/e2e/adaptativa.spec.ts
frontend/tests/e2e/assinatura.spec.ts
frontend/tests/e2e/confianca.spec.ts
frontend/tests/e2e/copiloto.spec.ts
frontend/tests/e2e/marca.spec.ts
frontend/tests/e2e/qualidade.spec.ts
```

## 26. Testes

| Validação executada | Resultado |
| --- | --- |
| `npm test` | 30 testes passaram |
| `npx --no-install tsc --noEmit` | Sem erros |
| `npm run lint` | Sem erros ou avisos |
| `npm run build` | Build de produção passou; 35 rotas |
| `git diff --check` e `git diff --cached --check` | Sem problemas de whitespace |
| `mvn -Duser.timezone=UTC verify` com E2E habilitado | 255 testes Java, incluindo o lançador E2E; zero falhas, erros ou skips; BUILD SUCCESS |
| Playwright completo no harness real, verificação de e-mail ON | 49 passaram; um skip esperado do cadastro direto OFF |
| Passagem separada com verificação OFF, entrada pública e regressões de privacidade | 10 passaram, sem skip; cobre o cadastro direto e o novo teste de proteção dos formulários |
| Clock + IA, JVM em Asia/Tokyo | 21 testes focados passaram |
| Produto/isolamento + Clock + Contexto, PostgreSQL isolado em Asia/Tokyo | 30 testes focados passaram |
| Smoke real Gemini, pergunta técnica sem dados financeiros | HTTP 200 e resposta recebida em 15/10/2026 às 04:41:55 UTC |
| Capturas obrigatórias | 16 geradas e abertas para inspeção |

O harness real usa Spring em porta aleatória, frontend de produção em 3014 e PostgreSQL temporário próprio em 127.0.0.1:55432, com **somente `nexo_test`**. A instância original em 5432 não foi alterada. Cada execução termina o cluster criado por ela, sem apagar dados. E-mails são capturados em caixa sintética local e o Gemini é substituído por respostas controladas na suíte.

Os cenários cobrem landing, cadastro/login/logout, os três perfis, onboarding, níveis visuais, Free/Pro/Business, checkout simulado, organizações, equipe, documentos, IA, copiloto, erros, teclado, sete larguras, reduced motion e axe. A troca de período bloqueia consulta/exportação durante carregamento; a troca de organização limpa o histórico do copiloto. O contrato de contexto também foi exercitado contra organizações distintas no PostgreSQL real.

A primeira passagem E2E revelou o lançador `npm` incompatível com `ProcessBuilder` no Windows. Ele agora executa `node npm-cli.js` diretamente, preservando argumentos sem shell. A revisão também detectou e corrigiu ambiguidade de seletor e overflow do cabeçalho; as passagens finais acima ocorreram após as correções. Os avisos de transporte/limite da IA nos testes são falhas controladas esperadas.

Não houve teste de carga em produção nem validação de toda resposta gerada por um modelo real. Os limites de dispositivo e serviço externo estão no item 32.

## 27. Screenshots

Capturas finais em `docs/design/ux-adaptativa/`, geradas no Chrome e abertas para inspeção. Usam contas e números sintéticos de apresentação, sem informações reais. Testes de persistência/autorização usam outro conjunto sintético no backend e PostgreSQL reais isolados.

O [manifesto das capturas](design/ux-adaptativa/manifesto.json) contém dimensões e SHA-256. O [resumo da validação](design/ux-adaptativa/validacao.json) contém as contagens por suíte; o [smoke Gemini](design/ux-adaptativa/gemini-conectividade.json) registra apenas resultado e horário, sem chave, pergunta ou resposta.

| Arquivo PNG | Evidência |
| --- | --- |
| dashboard-pessoal-essencial | Resumo pessoal com menos densidade |
| dashboard-pessoal-completo | Categorias reveladas |
| dashboard-negocio | Navegação e contexto comercial |
| dashboard-empresa | Colaboração e responsabilidades |
| onboarding-perfis | Escolha dos três perfis |
| ia-pro | Página de IA preservada para Pro |
| copiloto-business-dashboard | Painel lateral sem cobrir números |
| copiloto-business-fluxo | Contexto e período do fluxo |
| copiloto-business-metas | Progresso atual, sem período fictício |
| copiloto-mobile | Diálogo mobile rolável |
| sidebar-sweep | Assinatura luminosa discreta |
| cadastro-mobile | Senha vazia sem checklist denso |
| loading | Placeholder, sem zero falso |
| empty-state | Primeiro passo em espaço vazio |
| sem-permissao | Erro de autorização explícito |
| recurso-plano | Preview Free e CTA do plano |

A landing, o cadastro vazio e o login também foram abertos no navegador integrado durante a revisão. Não houve submissão de credenciais reais nessa inspeção.

## 28. Commits

- 05cd098a7475b1beec4fc34254f2b5936c0d6f18 Personaliza experiência por perfil, detalhes e privacidade
- 86fe33bd4fd082dba12244ca5b1a7ebbee66e05c Conecta Gemini a agregados financeiros com contexto e consentimento
- fd71112e325db82495e566dda8b86b36780b06fd Integra Nexo IA e copiloto Business com contexto por página
- 5a82e065b7b82074587cb8267b574b2b10a13f68 Torna calendário financeiro explícito e protege isolamento do contexto
- 3556aec752584727386dabb27dbb6c7e52eb1b24 Finaliza estados, privacidade e acabamento responsivo do Nexo
- 7eba04be627da5106d24fd6694c81f0275ebc306 Consolida E2E, evidências visuais e execução de testes no Windows

A documentação e as 16 evidências são entregues em um commit posterior, sem alteração adicional de código.

## 29. SHA final

SHA final de implementação e testes: `7eba04be627da5106d24fd6694c81f0275ebc306`. O commit de documentação posterior contém este relatório e as capturas. O SHA exato da entrega, incluindo o próprio relatório, consta no recibo de fechamento fornecido junto à entrega; um arquivo Git não pode conter o hash do próprio commit sem mudá-lo.

## 30. Push remoto

Todos os seis checkpoints acima foram enviados com `git push origin nexo-next-spring`, sem force push. `git ls-remote` confirmou `7eba04be627da5106d24fd6694c81f0275ebc306` no remoto. O commit de documentação recebe a mesma confirmação no fechamento. O checkpoint de testes também foi consultado pelo conector GitHub.

## 31. Main intacta e ausência de publicação

A `main` local e a remota permanecem em `8247ee36393d4a275f68ee2f14ae738176a31466`, o mesmo SHA registrado antes do trabalho. Não houve checkout de main, merge, push para main, deploy ou publicação. Somente nexo-next-spring recebeu commits.

## 32. Pendências reais e limites da validação

- Envio externo real de recuperação por e-mail segue adiado. Implementação e `NEXO_EMAIL_VERIFICATION_ENABLED` foram preservados; os testes de e-mail usam transportes locais/sintéticos.
- O modelo atual registra vendas e forma de pagamento, sem conciliação de recebimentos. A interface explica essa limitação; não mostra recebimento ou dinheiro disponível inventado.
- O teste visual usa Chrome no Windows e viewports emulados. Altura reduzida simula o espaço do teclado; não foi testado teclado virtual físico em Android/iOS, leitor de tela real ou Safari de dispositivo.
- A conectividade real do Gemini foi verificada sem dados financeiros. Respostas com contexto financeiro e falhas do provedor foram testadas com contratos controlados; não se enviaram dados reais de usuários ao provedor nesta execução. Texto generativo continua sujeito a revisão humana.
- A preferência de privacidade é local ao navegador e conserva gráficos relativos. Exportações autorizadas mantêm os dados originais; não constituem uma versão mascarada do arquivo.
- Não houve deploy, merge, publicação, force push ou uso destrutivo do banco principal. A validação realizada não equivale a homologação em produção.
