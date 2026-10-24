# Recuperação assistida e administração local

Decisão do usuário em 24/10/2026: enquanto o envio de email não estiver operacional, usar recuperação assistida, sem link nem digitação de código. O responsável deve confirmar a identidade por um canal conhecido antes de liberar a troca. O e-mail informado e o protocolo não são prova de identidade.

## Fluxo

1. Em `/esqueci-senha`, quando o ambiente permite, a pessoa informa seu e-mail e solicita recuperação assistida.
2. O backend cria um protocolo e uma prova aleatória. Apenas o hash é persistido; o navegador recebe a prova em cookie HttpOnly, SameSite=Strict e caminho restrito. Não há prova no JSON, URL, protocolo ou armazenamento JavaScript.
3. A pessoa procura o responsável e informa o protocolo. A solicitação dura até dez minutos.
4. O responsável entra em `/admin`, verifica a identidade fora do painel e assinala essa confirmação antes de liberar. A API também exige confirmação e sessão administrativa.
5. A pessoa volta ao mesmo navegador, clica em **Verificar liberação**, define a nova senha e volta ao login. Antes da liberação, o backend rejeita a troca.
6. A autorização é consumida uma única vez. As sessões anteriores são revogadas. Um novo pedido invalida o anterior; expiração ou recusa impedem o uso.

Nenhum e-mail, link ou senha temporária é enviado por este fluxo. O responsável não conhece nem escolhe a nova senha da pessoa.

## Limite obrigatório do administrador temporário

O acesso solicitado `admin` / `admin` existe somente para testes locais. O backend exige simultaneamente:

- perfil `dev` ou `test`, sem `prod`/`production`, inclusive em perfis mistos;
- PostgreSQL configurado explicitamente em loopback com nome exato `nexo_test`, sem query ou userinfo;
- requisição com socket local e, quando presente, origem local.

O painel é bloqueado no banco `nexo`, em produção e em conexões remotas. Nenhum sinal vindo apenas do frontend habilita esse acesso. Não exponha este ambiente de testes por proxy, túnel ou publicação. Uma administração de produção exige outra etapa, com autenticação forte, autorização e configuração próprias; trocar só o texto do usuário/senha não a torna pronta para produção.

A sessão administrativa é independente das sessões de usuário: cookie próprio HttpOnly/Strict, hash em memória, validade de quinze minutos, saída e novo login invalidam o acesso anterior. Cinco tentativas incorretas bloqueiam novas tentativas por quinze minutos. O painel atual trata solicitações de recuperação e não oferece acesso aos dados financeiros de empresas.

## Persistência e privacidade

Foram reutilizadas as colunas existentes de `codigos_autenticacao`. Não há migração. A prova de uma solicitação pendente não autoriza redefinição: a validação existente exige o estado aprovado/usado e a prova ainda válida. Não há código numérico disponível para contornar a aprovação. Os limites existentes de requisições de autenticação continuam aplicáveis; novos pedidos respeitam intervalo de 45 segundos e limite de seis por e-mail/hora.

Solicitar com e-mail inexistente não confirma existência de conta. A liberação verifica conta ativa no servidor. Somente o painel autenticado vê e-mails de solicitações pendentes. Logs de decisão registram protocolo/decisão, sem e-mail, token ou senha. O protocolo é uma referência de atendimento, não uma credencial.

O fluxo antigo por email permanece compatível quando houver transporte autorizado e operacional. Brevo não foi ativado, contornado ou usado. Nenhum envio real foi validado por esta entrega.

## Validação

- Tipos, lint e build de produção frontend aprovados.
- Três cenários E2E filtrados passaram: fluxo assistido completo, bloqueio fora do ambiente permitido e indisponibilidade do transporte legado. Acessibilidade do painel pendente e concluído, estado da confirmação, retomada após refresh e 390 px verificados. São fixtures de navegador.
- Seis testes unitários backend verificam bloqueios de ambiente/banco/origem, sessão administrativa, tentativas, pendência, confirmação, consumo, recusa e expiração.
- Três testes de integração com HTTP real e PostgreSQL descartável verificam aprovação e cookie, recusa de sessão comum como administrador, rejeição sem confirmação ou sem prova, senha nova, revogação, expiração, invalidação e consumo concorrente único.
- 23 testes existentes de autenticação e limite de requisições passaram no mesmo banco descartável. Total backend desta etapa: 32, sem falhas ou skips.
- Foi criado um cluster exclusivo desta tarefa, somente em `127.0.0.1:55433/nexo_test`, com migrações existentes02–13. Ele foi encerrado após os testes. O banco real `nexo`, stashes e backups não foram acessados ou modificados.

Revisões finais independentes de usabilidade e segurança continuam necessárias. A confirmação humana de identidade depende do procedimento operacional; a interface não comprova identidade por conta própria.
