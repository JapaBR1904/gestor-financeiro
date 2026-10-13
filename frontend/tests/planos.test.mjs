import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const fonte = readFileSync(
  new URL("../lib/planos.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(fonte, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
});
const {
  acaoPlano,
  planoPermite,
  planoValido,
  nomeStatus,
  precoPlano,
  disponibilidadeAssinatura,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

for (const plano of ["free", "pro", "business"]) {
  test(`${plano} identifica o próprio plano como atual`, () =>
    assert.equal(acaoPlano(plano, plano), "Plano atual"));
}
for (const [origem, destino, esperado] of [
  ["free", "pro", "Fazer upgrade"],
  ["free", "business", "Fazer upgrade"],
  ["pro", "business", "Fazer upgrade"],
  ["business", "pro", "Fazer downgrade"],
  ["business", "free", "Fazer downgrade"],
  ["pro", "free", "Fazer downgrade"],
]) {
  test(`${origem} → ${destino} identifica ação adequada`, () =>
    assert.equal(acaoPlano(origem, destino), esperado));
}
test("permissões da interface seguem a hierarquia existente", () => {
  assert.equal(planoPermite("free", "pro"), false);
  assert.equal(planoPermite("pro", "pro"), true);
  assert.equal(planoPermite("pro", "business"), false);
  assert.equal(planoPermite("business", "pro"), true);
  assert.equal(planoPermite("business", "business"), true);
});
test("destinos de checkout aceitam apenas planos do catálogo", () => {
  for (const plano of ["free", "pro", "business"])
    assert.equal(planoValido(plano), true);
  for (const plano of [null, "", "premium", "Pro", "../business"])
    assert.equal(planoValido(plano), false);
});
test("status e preços são apresentados em português", () => {
  assert.equal(nomeStatus("ativa"), "Ativa");
  assert.equal(nomeStatus("cancelada"), "Cancelada");
  assert.equal(nomeStatus("vencida"), "Vencida");
  assert.equal(nomeStatus("pagamento_falhou"), "Pagamento falhou");
  assert.equal(nomeStatus("desconhecido"), "Indisponível");
  assert.match(precoPlano(39), /R\$\s39,00/);
});

for (const [papel, podeGerenciar] of [
  ["admin", false],
  ["membro", false],
]) {
  test(`${papel} recebe motivo de permissão mesmo sem simulador`, () => {
    const estado = disponibilidadeAssinatura({
      podeGerenciar,
      simulacaoHabilitada: false,
      ambienteDesenvolvimento: true,
    });
    assert.equal(estado.habilitada, false);
    assert.equal(estado.titulo, "Gerenciado pelo proprietário");
    assert.doesNotMatch(estado.mensagem, /SPRING|PAGAMENTO/);
  });
}
test("proprietário em dev recebe orientação para ativar simulação", () => {
  const estado = disponibilidadeAssinatura({
    podeGerenciar: true,
    simulacaoHabilitada: false,
    ambienteDesenvolvimento: true,
  });
  assert.equal(estado.habilitada, false);
  assert.match(estado.mensagem, /SPRING_PROFILES_ACTIVE=dev/);
  assert.match(estado.mensagem, /PAGAMENTO_SIMULADO_ENABLED=false/);
});
test("ambiente fora de dev não expõe configuração interna", () => {
  const estado = disponibilidadeAssinatura({
    podeGerenciar: true,
    simulacaoHabilitada: false,
    ambienteDesenvolvimento: false,
  });
  assert.equal(estado.titulo, "Checkout indisponível");
  assert.doesNotMatch(estado.mensagem, /SPRING|PAGAMENTO|dev|prod/);
});
test("proprietário com simulador habilitado pode gerenciar sem cobrança real", () => {
  const estado = disponibilidadeAssinatura({
    podeGerenciar: true,
    simulacaoHabilitada: true,
    ambienteDesenvolvimento: true,
  });
  assert.equal(estado.habilitada, true);
  assert.match(estado.mensagem, /Nenhuma cobrança/);
});
