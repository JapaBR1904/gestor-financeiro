import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const fonte = readFileSync(new URL("../lib/planos.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(fonte, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { acaoPlano, planoPermite, planoValido, nomeStatus, precoPlano } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

for (const plano of ["free", "pro", "business"]) {
  test(`${plano} identifica o próprio plano como atual`, () => assert.equal(acaoPlano(plano, plano), "Plano atual"));
}
for (const [origem, destino, esperado] of [["free", "pro", "Fazer upgrade"], ["free", "business", "Fazer upgrade"], ["pro", "business", "Fazer upgrade"], ["business", "pro", "Fazer downgrade"], ["business", "free", "Fazer downgrade"], ["pro", "free", "Fazer downgrade"]]) {
  test(`${origem} → ${destino} identifica ação adequada`, () => assert.equal(acaoPlano(origem, destino), esperado));
}
test("permissões da interface seguem a hierarquia existente", () => {
  assert.equal(planoPermite("free", "pro"), false);
  assert.equal(planoPermite("pro", "pro"), true);
  assert.equal(planoPermite("pro", "business"), false);
  assert.equal(planoPermite("business", "pro"), true);
  assert.equal(planoPermite("business", "business"), true);
});
test("destinos de checkout aceitam apenas planos do catálogo", () => {
  for (const plano of ["free", "pro", "business"]) assert.equal(planoValido(plano), true);
  for (const plano of [null, "", "premium", "Pro", "../business"]) assert.equal(planoValido(plano), false);
});
test("status e preços são apresentados em português", () => {
  assert.equal(nomeStatus("ativa"), "Ativa");
  assert.equal(nomeStatus("cancelada"), "Cancelada");
  assert.equal(nomeStatus("vencida"), "Vencida");
  assert.equal(nomeStatus("pagamento_falhou"), "Pagamento falhou");
  assert.equal(nomeStatus("desconhecido"), "Indisponível");
  assert.match(precoPlano(39), /R\$\s39,00/);
});
