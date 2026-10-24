# Apresentação pública — 24/10/2026

A página inicial agora apresenta um vídeo original de 35 segundos e uma demonstração interativa por perfil: Pessoal, Negócio e Empresa. Todos os exemplos são fictícios; não consultam sessões, organizações ou APIs do produto.

## Experiência

- Vídeo WebM VP9 local, sem áudio, com textos na tela, controles nativos, poster, legendas e transcrição em HTML.
- Sem autoplay; `preload="none"` evita baixar o vídeo antes da interação.
- Botões permitem explorar os três perfis, com estado acessível e atualização anunciada.
- Animação curta de troca de conteúdo respeita movimento reduzido. Não há ciclos de animação contínuos.
- Paleta azul/navy/cyan e tipografia existente preservadas.
- Resultado do período não é apresentado como saldo disponível; venda não comprova recebimento. Preços Free/Pro/Business continuam 0/39/99.
- Assistente IA permanece condicionado ao serviço configurado e ao contexto autorizado; nenhuma integração externa foi ativada.

## Mídia

Arquivos em `frontend/public/media/`: `nexo-em-35-segundos.webm`, `nexo-apresentacao.png` e `nexo-apresentacao.vtt`. O gerador original fica em `frontend/scripts/render-apresentacao.mjs`; usa o navegador Edge headless instalado, via dependência de testes. Não acessa o site nem contas, não precisa de chaves e não é executado em produção. A gravação é uma ilustração do produto, não captura de dados reais.

Para regenerar a mídia, executar a partir de frontend `node scripts/render-apresentacao.mjs`. Exige Edge e dependências de desenvolvimento instalados. A reprodução e a transcrição ficam independentes do gerador.

## Validação desta entrega

- TypeScript e lint aprovados.
- 45 testes unitários existentes aprovados.
- Build de produção aprovado pela configuração E2E.
- Dois testes públicos filtrados aprovados: apresentação e entrada pública existente. Nenhum teste de conta ou banco foi incluído.
- Teste novo cobre seleção por teclado, conteúdo por perfil, vídeo que carrega/reproduz/pausa, movimento reduzido, axe e cinco larguras. A entrada existente cobre sete larguras.
- Capturas desktop e 390 px inspecionadas; sem overflow ou violações axe detectadas.

Banco real, backend financeiro, autenticação, planos, stashes e backup preexistente não foram modificados por esta entrega.
