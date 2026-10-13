# Nexo — conclusão de Free, Pro e Business

Esta etapa mantém Next.js/React/TypeScript, Spring Boot/Java 21 e PostgreSQL na branch `nexo-next-spring`. O acabamento usa os componentes e serviços existentes; não há gateway de pagamento real nem publicação em produção.

## 1. O que já existia e foi preservado

Autenticação com senha forte e BCrypt, confirmação de e-mail, recuperação neutra, códigos expiráveis de uso único, limites de tentativas, cookies HTTP-only, revogação de sessões e isolamento por organização. O transporte Resend, a compatibilidade SMTP e seus diagnósticos mantêm suas configurações e credenciais. Produtos, ingredientes/custos, vendas, despesas, clientes e relatórios comerciais continuam disponíveis no Free.

O catálogo de recursos, as políticas SaaS, assinatura persistida, checkout e histórico já existiam. O checkout continua com idempotência, expiração, controle de versão da assinatura e bloqueio de gestão por quem não é proprietário. Os testes anteriores foram preservados.

## 2. Funcionalidades concluídas

Lançamentos de receita/despesa com edição, exclusão explícita, data, categoria e conta; visão geral com dados persistidos; filtros de período; saldo acumulado diário; comparação com intervalo anterior de mesma duração; exportação CSV; metas; equipe com convites e papéis; seleção segura de organização; documentos persistidos; configuração/consulta do assistente e autorização para enviar resumo/documento; conta, preferências, catálogo e navegação coerentes.

As contas dos lançamentos são identificadores informados pelo usuário, não conexões bancárias. O saldo mostrado é o resultado do período, não um saldo bancário ou saldo de abertura inventado. Vendas/despesas comerciais entram uma vez no resumo financeiro, e lançamentos manuais não replicam essas origens.

## 3. Pro

R$ 39/mês no catálogo; **1 usuário**, conforme decisão expressa do usuário. Inclui Free e libera metas, fluxo por período, comparativos, CSV e assistente financeiro. A conclusão de uma meta ocorre ao atingir seu valor, inclusive na criação. O progresso é informado pela gestão, não inferido de transações de natureza desconhecida.

O CSV respeita filtro e organização, usa UTF-8, separador `;`, aspas/escape e neutralização de fórmulas em campos textuais. Fluxo e comparativos usam receitas e despesas reais, com períodos inclusivos de até 366 dias de diferença entre início e fim.

## 4. Business

R$ 99/mês; até **10 usuários, incluindo o proprietário**. Herda Free/Pro e inclui equipe, convites, papéis, acesso compartilhado, documentos e leitura de documentos com IA. Assinatura e dados pertencem a cada organização. Uma pessoa mantém seu espaço pessoal e pode participar de espaços Business sem mover dados entre eles.

## 5. Equipes e permissões

| Ação | Proprietário | Administrador | Membro |
|---|---|---|---|
| Consultar dados financeiros e relatórios | Sim | Sim, Business | Sim, Business |
| Registrar lançamentos, vendas, despesas e clientes | Sim | Sim | Sim |
| Editar/excluir registros e alterar catálogo/metas | Sim | Sim | Não |
| Renomear espaço e mudar preferências compartilhadas | Sim | Sim | Não |
| Convidar/remover membros | Sim | Sim | Não |
| Gerenciar administradores | Sim | Não | Não |
| Alterar o próprio papel ou remover proprietário | Não | Não | Não |
| Consultar/baixar documentos | Sim, Business | Sim | Sim |
| Enviar/excluir documentos e autorizar análise de conteúdo | Sim | Sim | Não |
| Consultar assinatura | Sim | Sim | Sim |
| Upgrade, downgrade ou cancelamento da assinatura | Sim | Não | Não |

A política dos módulos financeiros fica no interceptor de permissões e as operações de equipe usam `PoliticaOrganizacao`, com papel atual consultado no banco. Os controllers obtêm a organização pela sessão; um ID enviado em outro campo não concede acesso. A seleção de espaço valida associação ativa antes de atualizar a sessão.

Convites reservam uma vaga, expiram em 24 horas e exigem sessão verificada do e-mail convidado. Só o hash SHA-256 do token aleatório fica no banco. O link é emitido uma vez para a gestão; o segredo fica no fragmento da URL e é enviado apenas no POST autenticado. Aceite, revogação e expiração invalidam o token. Convites/aceites/remoção/downgrade usam o lock da assinatura para respeitar capacidade e plano.

Mudança de papel ou remoção revoga apenas sessões no espaço compartilhado. Não exclui a conta, membros, documentos ou dados financeiros. Se uma conta antiga nasceu diretamente na empresa e perde essa associação primária, ela recebe um espaço pessoal vazio; os dados financeiros da empresa permanecem na empresa.

Contas antigas que ainda não possuem espaço próprio podem usar **Criar meu espaço pessoal** em Organização. A criação é idempotente, mantém o papel e a associação da empresa e não concede gestão sobre a empresa.

Após downgrade, membros e administradores preservam suas associações, mas o acesso compartilhado aos módulos exige Business. Podem retornar ao espaço pessoal. Um novo upgrade restaura os recursos sem recriar dados.

## 6. Checkout simulado

A escolha do plano cria uma solicitação pendente, sem alterar a assinatura. O backend calcula preço, tipo e limites a partir do catálogo. O checkout expira em 15 minutos. Aprovação altera a assinatura e grava histórico numa transação; recusa/cancelamento/erro não promovem o plano. Confirmações duplicadas não duplicam alteração/histórico. Uma solicitação antiga não substitui uma assinatura que já mudou.

Pix, cartão e boleto são apenas cenários de demonstração. Não há entrada de dados financeiros sensíveis nem chamada a gateway. O cancelamento atual é imediato para Free, pois não há período pago real. Downgrade preserva dados e exige ciência sobre bloqueio de recursos/limites.

## 7. Habilitação local

No mesmo PowerShell que inicia o backend:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'dev'
$env:PAGAMENTO_SIMULADO_ENABLED = 'true'
mvn -f backend/pom.xml spring-boot:run
```

Preserve suas variáveis de banco e Resend atuais. Em `prod`/`production`, o simulador permanece bloqueado mesmo com a flag habilitada. Sem simulação, a página explica a indisponibilidade da troca; não há ativação por parâmetro, localStorage ou PUT direto de plano.

## 8. Free → Pro

1. Entre com sua conta de proprietário e termine o onboarding, ou use Conta para revisar preferências.
2. Abra Visão geral/Lançamentos e registre uma receita e uma despesa reais de teste.
3. Abra Planos e confira Free atual e Pro com 1 usuário.
4. Clique Fazer upgrade no Pro, confira R$ 39 e o aviso de simulação; escolha um método e aprove a simulação.
5. Abra Minha assinatura e confira Pro e histórico. Dê refresh e entre novamente: o plano permanece.
6. Abra Metas, crie um objetivo, atualize progresso; abra Fluxo e comparativos, filtre datas e exporte CSV. O assistente fica disponível após sua configuração opcional.

## 9. Pro → Business

1. Em Planos, clique Fazer upgrade no Business e aprove R$ 99 no checkout simulado.
2. Abra Equipe, informe o e-mail de uma segunda conta e escolha Membro ou Administrador.
3. Compartilhe o link em privado ou use o convite entregue pelo provider já configurado.
4. A segunda pessoa entra ou cria/verifica a conta com o e-mail convidado e aceita o convite. O login/cadastro preserva o fragmento do convite.
5. No espaço compartilhado, confira o papel e as ações permitidas. Em Organização, alterne de volta ao espaço pessoal e veja dados separados.
6. Envie um TXT/PDF/CSV/imagem em Documentos como gestão e baixe com a segunda conta. Proprietário pode alterar papéis ou encerrar acesso, preservando a conta pessoal.

## 10. Downgrade

Em Planos, escolha Pro ou Free, confira os recursos que deixam de estar disponíveis, marque a confirmação e conclua. Veja assinatura/histórico e dê refresh. Os lançamentos básicos permanecem. Metas/documentos/membros permanecem no banco, com recursos bloqueados conforme plano. Um upgrade posterior os torna acessíveis novamente. Se há mais membros que o limite novo, eles não são apagados; novas admissões ficam bloqueadas.

## 11. Revisão visual

Superfícies claras, acento verde com propósito, bordas discretas, tipografia e valores numéricos consistentes, ícones SVG da mesma família, agrupamento da navegação, indicação do plano atual, estados de formulário e hierarquia do resultado do período. Gradientes decorativos, brilhos e sombras pesadas foram substituídos nas principais telas.

Celular usa menu expansível, resumo compacto e tabelas com colunas secundárias reduzidas/rolagem local; desktop mantém navegação lateral e painéis em colunas. Há foco visível, labels, estados de progresso/sucesso/erro, suporte a teclado e preferência por movimento reduzido. O contexto do espaço é carregado do backend e atualizado após ações, sem reload forçado.

## 12. Páginas revisadas

Login/cadastro/códigos/recuperação, onboarding, visão geral, lançamentos, fluxo, metas, IA, organização, equipe, convite, documentos, planos, checkout, conta e assinatura. Produtos, vendas, despesas, clientes e relatórios comerciais foram percorridos e mantidos, com estilos comuns, proteção contra envio duplicado nos formulários e ações de gestão restritas.

Os relatórios comerciais preservam as fórmulas e rankings existentes para todo o histórico de vendas/despesas. A tela identifica esse escopo e encaminha para os lançamentos ou análise quando o usuário precisa incluir registros pessoais e filtrar datas.

## 13. Arquivos principais

- Backend: `financeiro/FinanceiroService.java` e controller; `organizacao/EquipeService.java`, controller, `MembroRepository.java`, `PoliticaOrganizacao.java`; `config/PermissoesInterceptor.java`; `documento/DocumentoService.java` e controller; `ia/IaService.java` e controller.
- Integração existente: `auth/AuthService.java`, `SessaoUsuario.java`, `EmailCodigoService.java`; `saas/Plano.java`, `AssinaturaRepository.java`, `SaasController.java`; organização, validação de metas, tratamento de erros e CORS.
- Frontend: `WorkspaceProvider.tsx`, `WorkspaceShell.tsx`, `Sidebar.tsx`, `Icone.tsx`, componentes financeiros/equipe/documentos/IA, páginas de conta/metas/onboarding/convite, bibliotecas de API e `app/product.css`.
- Testes: `ProdutoIntegrationTest.java`, `IaServiceTest.java`, ampliação de `EmailCodigoServiceTest.java`, coordenador de navegador e `tests/e2e/assinatura.spec.ts`.

## 14. Migração

`database/11_produto_financas_equipes.sql`, aditiva e reaplicável, depois da 10. Foi aplicada/reaplicada somente no PostgreSQL exclusivo de teste. Aplique no seu banco existente pelo procedimento administrativo antes de iniciar esta versão. Não recrie o banco. Veja `database/README.md`.

## 15. Configurações

- Banco/segurança/Resend: as mesmas variáveis anteriores, sem credenciais novas obrigatórias.
- `NEXO_FRONTEND_URL`: origem usada nos links de convite; padrão local `http://localhost:3000`. Produção exige HTTPS.
- `GEMINI_API_KEY`: opcional, inserida no processo ou gerenciador seguro; `GEMINI_MODEL`: padrão `gemini-flash-latest`. O backend usa o endpoint oficial `generateContent`, header de chave, timeout, sem redirecionamentos ou retries automáticos.
- `SPRING_PROFILES_ACTIVE=dev` + `PAGAMENTO_SIMULADO_ENABLED=true`: demonstração local somente.
- Testes: `NEXO_TEST_DB_URL`, usuário/senha de banco exclusivos e, para navegador, `NEXO_E2E=true`. Chromium pode ser indicado por `NEXO_BROWSER_EXECUTABLE`.

Documentos aceitam PDF, UTF-8 TXT/CSV, PNG e JPEG, até 5 MB por arquivo e 50 MB por organização. Downloads são anexos, e uploads não executam HTML/SVG. A IA de documentos aceita apenas TXT/CSV de até 12 mil caracteres e autorização explícita para envio; PDF/imagem continuam disponíveis para download, sem OCR inventado.

## 16–17. Validação

- `mvn -f backend/pom.xml package`: **218 testes, 0 falhas, 0 erros, 0 ignorados**, incluindo PostgreSQL exclusivo e o coordenador do navegador; JAR gerado. Executado com variáveis Resend carregadas no processo usando valores fictícios, para comprovar isolamento dos fixtures sem enviar mensagens externas.
- **10 jornadas Playwright passaram** contra frontend compilado e Spring/PostgreSQL reais: seis transições e novo login; recusa/cancelamento/erro; permissões e cancelamento; idempotência; três tamanhos de checkout; finanças/CSV/metas/equipe/documentos/downgrade; cadastro/confirmar e-mail/onboarding/recuperação/senha nova; conta antiga criando espaço próprio sem assumir a empresa.
- `npm test`: **25 passaram**, sem falhas ou ignorados. `npm run lint`: sem erros ou avisos. `npx --no-install tsc --noEmit`: passou. `npm run build`: passou para todas as rotas.
- `git diff --check`: passou. O JAR foi iniciado em dev contra `nexo_test`; `/api/health` e `/api/health/database` responderam `status: ok`.
- Revisão visual das capturas de dashboard, fluxo, metas, equipe, documentos, conta e módulos comerciais em **1440×900, 1024×768, 768×1024 e 390×844**, além de planos/checkout/assinatura. O teste também verifica ausência de overflow horizontal, estados carregados, navegação, teclado e ações por papel. Dados das capturas são sintéticos, gravados pelo teste.

As falhas encontradas durante a implementação foram corrigidas: rótulos acessíveis incluíam opções/ajuda, a edição do onboarding não recuperava preferências, contas antigas podiam ficar sem saída para um espaço próprio e uma função de criação de espaço ficou inicialmente no escopo errado. O harness passou a usar a API real diretamente e o frontend compilado, eliminando falhas de encaminhamento de requisições e interferência de Hot Reload/Turbopack. Nenhum teste anterior foi removido.

## 18. Limites restantes

Cobrança real, conciliação bancária e OCR não foram implementados nem anunciados como disponíveis. O provider externo de IA e a entrega real de novos convites dependem das configurações seguras do ambiente de destino; os testes usam HTTP/SMTP locais, conta sintética e o link privado do convite. A integração Resend foi preservada, sem alteração de credenciais.

A fila de e-mail pós-commit permanece limitada e em memória, como no fluxo de recuperação existente. Parada abrupta ou saturação pode impedir entrega; não é criada promessa de entrega durável. Convites podem ser revogados e reenviados respeitando limite; códigos de recuperação mantêm seus limites anteriores.

A aplicação de migração no banco do usuário e qualquer publicação/deploy não foram executados nesta tarefa.
