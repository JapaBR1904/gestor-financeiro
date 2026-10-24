# Correção de dependências — Next 16.4.3

O build da apresentação foi interrompido por `SecurityFatalError` na versão Next 16.4.0. O registro npm e o aviso oficial de 14/10/2026 confirmaram a versão instalada nas faixas afetadas por três alertas: GHSA-673q-mjm6-r5xr (cache/RSC), GHSA-2464-fhr4-w9xw (SVG/sharp, sob Linux glibc) e GHSA-p3m5-59mp-jv5r (Server Actions).

Fonte: https://nextjs.org/blog/nextjs-security-update-october-14-2026

## Escopo e classificação

Instalação afetada confirmada; exploração do Nexo não demonstrada. Busca em app/components/lib não encontrou `use cache`, `use server` ou `next/image`; implantação Linux glibc não foi estabelecida. Essas condições limitam a afirmação de exposição real, mas não justificam manter a dependência afetada.

Alterados somente `frontend/package.json` e `frontend/package-lock.json`: Next e eslint-config-next exatos 16.4.3, fechamento dos pacotes Next/SWC correspondente; React e React DOM 19.3.0 preservados. Sharp resolve para 0.35.5. Não foram desativadas as verificações de segurança nem usados comandos automáticos sugeridos pelo texto do erro.

Investigação independente identificou o limite de pacote como ponto comum da correção. Revisão independente do patch confirmou as versões corretivas e detectou uma regressão do npm: remoção de duas entradas opcionais WASM do lockfile ainda referenciadas. Foram restauradas as entradas originais @emnapi/core 1.10.0 e @emnapi/runtime 1.11.3 para preservar outros ambientes.

## Verificações

- Tipos, lint e 45 testes unitários aprovados após atualizar a dependência.
- O mesmo build que falhava passou, sem suprimir a verificação; dois cenários E2E públicos passaram.
- Instalação limpa `npm ci --ignore-scripts --include=optional` em pasta isolada, copiando apenas manifestos/lockfile, aprovada: 351 pacotes instalados, zero alertas npm.
- A compatibilidade funcional foi exercitada pelas rotas públicas, navegação, acessibilidade e reprodução do vídeo. Não foram executados payloads de RCE, carga de DoS ou testes contra produção.
- Variantes WASM não foram executadas nesta máquina Windows; a revisão verificou suas referências no lockfile. Não se afirma validação runtime de todas as plataformas.

O scan inicial do Codex Security sobre SHA 0ffdbb2 tem cobertura estática parcial e foi selado antes desta descoberta. Seus zero achados validados não incluem nem anulam os alertas posteriores de dependências. A avaliação adversarial final permanece pendente.
