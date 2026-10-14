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

Testes contam navegações de documento em repouso na landing e no dashboard e verificam zero chamadas API na landing. A causa histórica dos GETs repetidos não foi reproduzida; não confundir prefetch/Fast Refresh em dev com reload em produção. A validação de navegador usa build local de produção.

## Validação

Resultados finais, evidências e SHAs serão preenchidos após a passagem completa; checkpoints só são enviados depois de validação. Testes usam exclusivamente `nexo_test` existente, jamais o banco `nexo`.
