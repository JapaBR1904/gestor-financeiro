# Entrada pública e cadastro direto — Nexo

## Base preservada

O checkout começou limpo em `nexo-next-spring`, SHA `884d25e`, com os seis checkpoints anteriores preservados. Não havia implementação parcial de landing, cadastro ou roteamento do Work. O remoto tinha somente um commit adicional de documentação (`ed127f4`); foi incorporado por fast-forward, sem criar merge. Nenhum stash foi aplicado, nenhum trabalho revertido. Manrope, tokens/componentes e módulos autenticados foram reaproveitados.

## Arquitetura

- `/`: landing pública, inclusive para quem já tem sessão. Não busca usuário, plano ou dados. Sem redirecionamento automático, polling ou listener de workspace público.
- `/dashboard`: o mesmo `FinanceiroConteudo` da antiga raiz, sem reescrita financeira.
- Login → dashboard; cadastro direto → dashboard; logout confirmado → landing. Convites preservam destino específico.
- Cadastro com verificação ON mantém código → confirmação → onboarding. Onboarding continua disponível e mantém seus destinos conforme perfil, agora com `/dashboard` em lugar da antiga raiz.
- Logos/links autenticados, planos/checkout/conta/empresa, sidebar, grupo ativo, deep links e testes atualizados. As outras rotas mantêm suas URLs e autorização.

## Cadastro configurável

| Ambiente/configuração | Resultado |
| --- | --- |
| Default, sem profile dev | Verificação ON |
| `SPRING_PROFILES_ACTIVE=dev` | OFF por padrão |
| Dev + `NEXO_EMAIL_VERIFICATION_ENABLED=true` | Fluxo antigo ON |
| `prod`/`production` + OFF, inclusive perfil misto com dev | Startup rejeitado |

A propriedade é `nexo.auth.email-verification-enabled`. Não existe flag NEXT_PUBLIC duplicada. `POST /api/auth/cadastro` retorna `verificacaoEmailNecessaria`:

- OFF: mesmos campos/política forte/BCrypt, conta + organização + proprietário + sessão na mesma transação, conta apta pela política local, cookie HTTP-only/SameSite/duração iguais ao login. Nenhum código é criado; EmailCodigoService/EmailProvider não são chamados. Token não entra no corpo JSON. Frontend exibe “Preparando seu espaço…” sem atraso artificial e abre o dashboard.
- ON: código e e-mail existentes, conta pendente, sem cookie de sessão até validar. Expiração, tentativas e uso único preservados.

A dispensa local **não comprova a propriedade do e-mail**. Não altera em lote contas antigas nem sua condição de verificação. Não adiciona migração. Resend, SMTP, templates, rate limits, logs e recuperação permanecem implementados.

`GET /api/auth/disponibilidade` expõe apenas `recuperacaoPorEmailDisponivel`. Quando o provider está desabilitado, a tela de recuperação avisa que não pode entregar códigos e não oferece substituto inseguro. Configuração disponível não garante entrega externa; respostas neutras de recuperação continuam iguais para contas existentes e ausentes.

## Direção visual

Landing própria: navy, azul elétrico, cyan, tipografia Manrope local, composição assimétrica com painel HTML/SVG, luz suave e linha gráfica. Dados fictícios explicitamente identificados; nenhuma API no mock. Três passos, quatro grupos com detalhes expansíveis, benefícios, planos resumidos, confiança sem certificações inventadas e CTA final. Free R$0, Pro R$39 e Business R$99; 1/1/10 pessoas, proprietário incluído. Não há checkout público nem promessa de cobrança real.

Header próprio sticky, menu mobile nativo acessível com Escape/foco, anchors, footer com destinos existentes. CSS separado e escopado (`landing.css`), sem dependências novas. Aurora via opacity/transform e insight flutuante discreto; menos movimento no celular, sem animação em reduced-motion. Não altera a aparência financeira autenticada.

## Reload investigado

A raiz anterior era privada e `WorkspaceProvider` iniciava consultas de sessão/configuração/assinatura. Havia um `router.refresh()` explícito após login e logout, além da navegação. Essas chamadas podiam gerar requisições adicionais pontuais, mas **não há evidência para atribuir a elas um loop contínuo**. Foram removidas as chamadas redundantes do formulário de credenciais/logout. A landing agora é pública e independente do bootstrap de workspace. Não há middleware/proxy novo, timer de reload ou redirect automático da raiz.

Testes contam navegações de documento em repouso na landing e no dashboard e verificam zero chamadas API na landing. Também foi acrescentada uma indicação de indisponibilidade da recuperação, sem tentar solicitar código quando o transporte está desligado. A causa histórica dos GETs repetidos não foi reproduzida; não confundir prefetch/Fast Refresh em dev com reload em produção. A validação de navegador usa build local de produção.

## Validação

Testes usam exclusivamente `nexo_test` existente, jamais o banco `nexo`. Nenhuma migração, limpeza de dados ou alteração de credencial nesta etapa.

A primeira validação focada passou em 29 casos de backend; a jornada OFF real passou com sessão após refresh, módulos, logout e novo login. Na revisão completa foram corrigidas duas dependências antigas dos testes E2E: abrir `/empresa` explicitamente depois do login antes de selecionar organização/criar espaço pessoal. A mudança intencional é que login agora leva a `/dashboard`. Não foram removidos testes ou enfraquecidas asserções de permissão/persistência.

Na adaptação inicial da sidebar, foi corrigido o delimitador usado para reconhecer rotas filhas; um teste novo confirma `/produtos/123/editar`, grupo Operação aberto, `aria-current` e retorno pela marca ao dashboard. No teste novo de cadastro, o seletor do item ativo foi delimitado à sidebar desktop, pois o drawer fechado contém a segunda cópia, invisível, do mesmo link.

### Resultados finais

| Verificação | Resultado |
| --- | --- |
| `mvn verify`, PostgreSQL `nexo_test`, navegador habilitado | **243 testes, 0 falhas, 0 erros, 0 ignorados**; JAR gerado |
| Playwright completo, verificação ON | **29 passaram**; 1 caso OFF ignorado somente nesse modo |
| Playwright focado, verificação OFF | **3 passaram**, incluindo cadastro real, landing e recuperação indisponível |
| Casos distintos de navegador | **30 validados** nos dois modos (landing e indisponibilidade repetidos no OFF) |
| `npm test` | **30 passaram** |
| `npx --no-install tsc --noEmit` | Passou |
| `npm run lint` | Passou, sem warnings |
| `npm run build` | Passou; landing e dashboard compilados |
| Axe | Sem violações: 54 varreduras na suíte ON, mais 7 da landing no OFF |
| `git diff --check` | Passou |

A suíte completa cobre assinatura, checkout, idempotência, autorização, planos, equipes, documentos, organização/isolamento, autenticação, recuperação, SMTP/Resend locais de teste, política de senha e relatórios. O caso ON confirma que cadastro não emite cookie antes do código. O caso OFF confirma persistência, hash, vínculo de proprietário, zero códigos e zero interações com EmailProvider, além de cookie e logout/revogação.

Foram também validados sete tamanhos (1440/1280/1024/768/430/390/360), limites visuais dos elementos essenciais, navegação por teclado, menu mobile, Escape/foco, reduced-motion e ausência de navegações espontâneas. Não há exceções JavaScript. As 13 mensagens de console de rede da suíte ON são esperadas nos testes negativos: 11 respostas HTTP nos casos negativos e 2 aborts (logout offline e leitura de produto não encaminhada ao banco no deep link isolado). Na passagem OFF não houve erros de console/rede. Evidências sanitizadas: [ON](design/entrada-publica/observacoes-on.json), [OFF](design/entrada-publica/observacoes-off.json), [backend](design/entrada-publica/backend-verify.json).

### Inicialização real em desenvolvimento

Além do E2E com build local de produção, foi iniciado o JAR empacotado com perfil `dev` e Next dev, ambos em loopback e no banco `nexo_test`. **Sem definir `NEXO_EMAIL_VERIFICATION_ENABLED`**, o cadastro entrou diretamente no dashboard, permaneceu autenticado após refresh e saiu para a landing. O provider estava realmente desabilitado; a recuperação informou indisponibilidade. Em oito segundos de repouso a landing recebeu uma única requisição à raiz e nenhuma API; o dashboard não navegou sozinho. Os processos iniciados para essa conferência foram encerrados.

O aviso do Next sobre scroll suave foi corrigido com `data-scroll-behavior="smooth"` em `app/layout.tsx`, conforme o guia instalado do Next 16. O atributo evita scroll animado nas trocas de rota; o movimento suave fica nos anchors da landing e continua respeitando reduced-motion. Fonte Manrope e estrutura do layout preservadas. Evidência: [smoke dev](design/entrada-publica/dev-smoke.json).

Para reproduzir localmente, prepare banco e variáveis como em [DEVELOPMENT.md](../DEVELOPMENT.md), use `SPRING_PROFILES_ACTIVE=dev`, execute `mvn -f backend/pom.xml spring-boot:run` e, no frontend, `npm ci` / `npm run dev`. O cadastro direto não exige outra variável. Para ON, configure `NEXO_EMAIL_VERIFICATION_ENABLED=true` e um transporte válido. Nenhuma configuração de produção foi publicada.

### Capturas revisadas

Todas produzidas pelo Chromium sobre o frontend real, sem fotografias ou mock de página estática. O painel dentro da landing tem dados fictícios rotulados. O dashboard após cadastro usa a conta sintética no PostgreSQL de teste, com saldo real inicial zero.

- [Landing desktop 1440](design/entrada-publica/landing-1440.png)
- [Landing mobile 390](design/entrada-publica/landing-390.png)
- [Hero desktop](design/entrada-publica/hero-1440.png) e [mobile](design/entrada-publica/hero-390.png)
- [Recursos](design/entrada-publica/recursos.png)
- [Planos da landing](design/entrada-publica/planos.png)
- [Login desktop](design/entrada-publica/login-desktop.png) e [mobile](design/entrada-publica/login-360.png)
- [Cadastro](design/entrada-publica/cadastro-desktop.png)
- [Dashboard após cadastro](design/entrada-publica/dashboard-cadastro.png)

A inspeção levou ao ajuste do insight demonstrativo para não cobrir a meta, ao contraste do foco nos blocos escuros e à organização mobile sem cortar o conteúdo principal. Aurora e insight usam somente transform/opacity, SVG leve e CSS; sem canvas, partículas, vídeos, biblioteca de animação ou dependência nova de aplicação. O conteúdo da landing é pré-renderizado; o único componente cliente novo é o menu mobile. O WorkspaceProvider compartilhado não consulta APIs na área pública.

### Arquivos principais

| Área | Arquivos |
| --- | --- |
| Entrada pública | `frontend/app/page.tsx`, `app/landing.css`, `components/LandingMenu.tsx` |
| Rotas e bootstrap | `app/dashboard/page.tsx`, `app/layout.tsx`, `components/WorkspaceProvider.tsx`, `Sidebar.tsx` |
| Autenticação | `components/AuthCredentialsForm.tsx`, `AuthCard.tsx`, `lib/auth.ts`, `app/esqueci-senha/page.tsx` |
| Destinos internos | `PlanosConteudo`, `CheckoutConteudo`, `AssinaturaConteudo`, `EmpresaConteudo`, `PrimeirosPassos`, onboarding e convite |
| Backend | `auth/ConfiguracaoCadastro.java`, `AuthService.java`, `AuthController.java`, `application.properties`, `application-dev.properties` |
| Testes | `ConfiguracaoCadastroTest`, `CadastroDiretoIntegrationTest`, `AuthIntegrationTest`, `AuthHttpIntegrationTest`, coordenador `AssinaturaBrowserTest`, specs `entrada`, `assinatura`, `confianca`, `qualidade` |
| Documentação | `DEVELOPMENT.md`, `.env.example` (somente comentários), `AUTENTICACAO.md`, este relatório e `docs/design/entrada-publica` |

### Checkpoints preservados no GitHub

1. `73437b7e92b93c5d94a3057607b44c3dcfb43914` — Cria experiência pública de entrada e separa dashboard.
2. `b0152ad337b79eb8ddb6575091aa5493576bb547` — Integra cadastro direto configurável e sessão no dashboard.
3. `930b13f3a9d56f6e58ff4129211708f84a070191` — Conecta landing, autenticação e dashboard com navegação acessível.
4. O commit de fechamento deste relatório consolida evidências e o acabamento final. Seu SHA é informado na entrega e pode ser consultado em `git log`.

Os checkpoints foram enviados exclusivamente para `nexo-next-spring`, com SHA remoto confirmado. A `main` não foi alterada; sua referência remota permaneceu `8247ee36393d4a275f68ee2f14ae738176a31466`. Nenhum force push, merge na main ou deploy foi feito.

### Pendências reais

- Entrega externa de recuperação/verificação continua dependendo de Resend/SMTP habilitado e configurado. Não foi validada com credenciais reais nesta etapa; os transportes existentes foram preservados e testados com servidores/fixtures locais.
- A causa histórica dos GETs repetidos não foi reproduzida. Foram validados os fluxos atuais sem loop tanto no build de produção local quanto no Next dev; os tempos de observação não constituem garantia sobre qualquer extensão/configuração externa de navegador.
- Contas pendentes anteriores continuam dependendo de verificação. A dispensa em dev vale para novos cadastros e não transforma contas antigas em contas aptas.
