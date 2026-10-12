import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Executa a política TypeScript real com as ferramentas já presentes no projeto.
const fonte = readFileSync(new URL("../lib/politica-senha.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(fonte, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { requisitosSenha, validarSenha } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const casos = [
  ["senha vazia", "", "Informe sua senha."],
  ["menos de 16 caracteres", "Abcdefg1!", "A senha deve ter pelo menos 16 caracteres."],
  ["sem maiúscula", "abcdefghijklmn1!", "Inclua pelo menos uma letra maiúscula na senha."],
  ["sem minúscula", "ABCDEFGHIJKLMN1!", "Inclua pelo menos uma letra minúscula na senha."],
  ["sem número", "Abcdefghijklmno!", "Inclua pelo menos um número na senha."],
  ["sem especial", "Abcdefghijklmn12", "Inclua pelo menos um caractere especial na senha."],
  ["espaço não é especial", "Abcdefghijklm1  ", "Inclua pelo menos um caractere especial na senha."],
  ["73 bytes", "Aa1!" + "a".repeat(69), "A senha ultrapassa o limite de 72 bytes. Use uma senha menor."],
  ["Unicode acima de 72 bytes", "Aa1!" + "😀".repeat(18), "A senha ultrapassa o limite de 72 bytes. Use uma senha menor."],
  ["Unicode conta como um caractere", "Aa1!" + "😀".repeat(11), "A senha deve ter pelo menos 16 caracteres."],
];

for (const [nome, senha, esperado] of casos) {
  test(nome, () => assert.equal(validarSenha(senha, senha), esperado));
}

test("aceita senha completa, acentos, emojis e exatamente 72 bytes", () => {
  for (const senha of ["Senha-Forte-Teste123!", "Aa1!" + "a".repeat(68), "Á" + "é".repeat(13) + "1!", "Aa1!" + "😀".repeat(12)]) {
    assert.equal(validarSenha(senha, senha), null);
    assert.ok(requisitosSenha(senha).every((regra) => regra.atendido));
  }
});

test("confirmação obrigatória e igual à senha", () => {
  assert.equal(validarSenha("Senha-Forte-Teste123!", ""), "Confirme sua senha.");
  assert.equal(validarSenha("Senha-Forte-Teste123!", "Outra-Senha-Teste456!"), "As senhas não coincidem.");
});

test("o checklist acompanha requisitos atendidos e pendentes durante a digitação", () => {
  const inicio = requisitosSenha("a");
  assert.ok(inicio.find((r) => r.id === "minuscula").atendido);
  assert.equal(inicio.find((r) => r.id === "maiuscula").atendido, false);
  const parcial = requisitosSenha("Aa1!");
  assert.equal(parcial.filter((r) => r.atendido).length, 5);
  assert.equal(parcial.find((r) => r.id === "tamanho").atendido, false);
  assert.ok(requisitosSenha("Aa1!" + "a".repeat(12)).every((r) => r.atendido));
});
