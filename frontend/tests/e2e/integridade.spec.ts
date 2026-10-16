import { test, expect, type Page } from "@playwright/test";
import { observar, registrarObservacoes } from "./observacoes";
const api = process.env.NEXO_E2E_API_URL!;
const orgA = Number(process.env.NEXO_E2E_ORG_A);
const orgB = Number(process.env.NEXO_E2E_ORG_B);
test.beforeEach(({ page }) => observar(page));
test.afterEach(async ({ page }, info) => registrarObservacoes(page, info));
async function entrar(page: Page) {
  if (!api || !orgA || !orgB) throw new Error("Execute pelo coordenador com nexo_test exclusivo.");
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(process.env.NEXO_E2E_INTEGRIDADE_EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill("Assinatura-Teste123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".workspace-context")).toContainText("Integridade A");
}
async function abrirFormulario(page: Page, nome: string) {
  await page.getByRole("button", { name: "+ Nova movimentação", exact: true }).click();
  await page.getByLabel("Descrição", { exact: true }).fill(nome);
  await page.getByLabel("Valor (R$)", { exact: true }).fill("77");
}
async function trocar(page: Page, nome: "A" | "B") {
  await page.goto("/empresa");
  await page.getByRole("button", { name: new RegExp(`Integridade ${nome} sintético.*Abrir espaço`) }).click();
  await expect(page.locator(".workspace-context")).toContainText(`Integridade ${nome}`);
}

test("integridade contexto: duas abas A/B fecham formulário antigo nas duas direções", async ({ page, context }, info) => {
  await entrar(page);
  const outra = await context.newPage();
  for (const destino of ["B", "A"] as const) {
    await abrirFormulario(page, `Não enviar ao espaço ${destino}`);
    await trocar(outra, destino);
    await expect(page.locator(".workspace-context")).toContainText(`Integridade ${destino}`);
    await expect(page.getByRole("button", { name: "Salvar lançamento", exact: true })).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "O espaço mudou" })).toBeVisible();
  }
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("contexto-duas-abas.png"), fullPage: true });
  const resumo = await page.request.get(`${api}/api/financeiro/resumo`, { headers: { "X-Nexo-Organizacao": String(orgA) } });
  expect((await resumo.json()).movimentacoes).toHaveLength(0);
  await outra.close();
});

test("integridade contexto: resposta antiga, CSV e consentimento IA não atravessam a troca", async ({ page, context }, info) => {
  await entrar(page);
  await page.route("**/api/ia/status", route => route.fulfill({ json: { configurada: true } }));
  await page.goto("/ia");
  await page.getByLabel("Sua pergunta", { exact: true }).fill("Analise meus gastos");
  await page.getByRole("checkbox", { name: /Autorizar dados deste contexto/ }).check();
  let liberar!: () => void;
  const pausa = new Promise<void>(resolve => { liberar = resolve; });
  let recebeu!: () => void;
  const chegou = new Promise<void>(resolve => { recebeu = resolve; });
  await page.route("**/api/ia/perguntar", async route => {
    expect(route.request().headers()["x-nexo-organizacao"]).toBe(String(orgA));
    recebeu(); await pausa;
    try { await route.fulfill({ json: { resposta: "Resposta antiga do espaço A: R$ 77", modelo: "sintetico" } }); } catch { /* Envio abortado pela troca. */ }
  });
  await page.getByRole("button", { name: "Perguntar ao assistente", exact: true }).click();
  await chegou;
  const outra = await context.newPage();
  await trocar(outra, "B");
  await expect(page.locator(".workspace-context")).toContainText("Integridade B");
  liberar();
  await expect(page.getByRole("checkbox", { name: /Autorizar dados deste contexto/ })).not.toBeChecked();
  await expect(page.getByText("Resposta antiga do espaço A: R$ 77", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Sua pergunta", { exact: true })).toHaveValue("");
  const stale = await page.request.get(`${api}/api/financeiro/exportar`, { headers: { "X-Nexo-Organizacao": String(orgA) } });
  expect(stale.status()).toBe(409);
  const ia = await page.request.post(`${api}/api/ia/perguntar`, { headers: { "X-Nexo-Organizacao": String(orgA) }, data: { pergunta: "Gastos", incluirResumo: true } });
  expect(ia.status()).toBe(409);
  await page.screenshot({ path: info.outputPath("contexto-ia-renovado.png"), fullPage: true });
  await trocar(outra, "A");
  await expect(page.locator(".workspace-context")).toContainText("Integridade A");
  await page.goto("/pessoal");
  let liberarCsv!: () => void;
  const pausaCsv = new Promise<void>(resolve => { liberarCsv = resolve; });
  let receberCsv!: () => void;
  const chegouCsv = new Promise<void>(resolve => { receberCsv = resolve; });
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.route("**/api/financeiro/exportar?**", async route => {
    expect(route.request().headers()["x-nexo-organizacao"]).toBe(String(orgA));
    const resposta = await route.fetch();
    receberCsv(); await pausaCsv;
    try { await route.fulfill({ response: resposta }); } catch { /* Contexto trocado cancela o download pendente. */ }
  });
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  await chegouCsv;
  await trocar(outra, "B");
  await expect(page.locator(".workspace-context")).toContainText("Integridade B");
  liberarCsv();
  await expect(page.getByRole("button", { name: "Exportar CSV", exact: true })).toBeEnabled();
  await page.waitForTimeout(150);
  expect(downloads).toBe(0);
  await trocar(outra, "A");
  await outra.close();
});

test("integridade custo: ingrediente parcial valida, ficha não cria despesa e zero difere de ausência", async ({ page }, info) => {
  await entrar(page);
  let criacoes = 0;
  page.on("request", r => { if (r.method() === "POST" && new URL(r.url()).pathname === "/api/produtos") criacoes++; });
  await page.goto("/produtos/novo");
  await page.getByLabel("Nome do produto *", { exact: true }).fill("Bolo de integridade");
  await page.getByLabel("Preço de venda *", { exact: true }).fill("50");
  await page.getByLabel("Ingrediente", { exact: true }).fill("Farinha");
  await page.getByLabel("Preço de referência", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Salvar produto", exact: true }).click();
  await expect(page.getByLabel("Qtd. referência", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Qtd. usada", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert").filter({ hasText: "Nenhuma linha preenchida será descartada" })).toBeVisible();
  expect(criacoes).toBe(0);
  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.locator(".ingredient-row").evaluate(row => {
      const caixa = row.getBoundingClientRect();
      return [...row.querySelectorAll("input, select, button, .field-error")].every(e => {
        const c = e.getBoundingClientRect();
        return c.left >= caixa.left && c.right <= caixa.right && c.right <= innerWidth;
      });
    })).toBe(true);
    if (width === 390) await page.locator(".ingredient-row").screenshot({ path: info.outputPath("ingrediente-parcial-mobile.png"), animations: "disabled" });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath("ingrediente-parcial.png"), fullPage: true, animations: "disabled" });
  await page.getByLabel("Qtd. referência", { exact: true }).fill("1");
  await page.getByLabel("Qtd. usada", { exact: true }).fill("100");
  const gravacao = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/produtos");
  await page.getByRole("button", { name: "Salvar produto", exact: true }).click();
  const resposta = await gravacao;
  expect(resposta.request().headers()["x-nexo-organizacao"]).toBe(String(orgA));
  const produto = await resposta.json();
  expect(produto.custoEstimado).toBe(2);
  expect(criacoes).toBe(1);
  const despesas = await page.request.get(`${api}/api/despesas`, { headers: { "X-Nexo-Organizacao": String(orgA) } });
  expect(await despesas.json()).toHaveLength(0);
  await page.goto(`/produtos/${produto.id}/editar`);
  await expect(page.getByLabel("Qtd. usada", { exact: true })).toHaveValue("100");
  await page.getByLabel("Qtd. usada", { exact: true }).fill("");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(page.getByLabel("Qtd. usada", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Qtd. usada", { exact: true }).fill("100");
  await page.getByLabel("Preço de referência", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/produtos/${produto.id}$`));
  const zero = await (await page.request.get(`${api}/api/produtos/${produto.id}`, { headers: { "X-Nexo-Organizacao": String(orgA) } })).json();
  expect(zero.custoEstimado).toBe(0); expect(zero.lucroEstimado).toBe(50);
  await page.goto("/produtos/novo");
  await page.getByLabel("Nome do produto *", { exact: true }).fill("Sem custo conhecido");
  await page.getByLabel("Preço de venda *", { exact: true }).fill("15");
  const semFicha = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/produtos");
  await page.getByRole("button", { name: "Salvar produto", exact: true }).click();
  const desconhecido = await (await semFicha).json();
  expect(desconhecido.custoEstimado).toBeNull(); expect(desconhecido.lucroEstimado).toBeNull();
  await page.goto(`/produtos/${desconhecido.id}`);
  await expect(page.getByText("Custo não informado", { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: info.outputPath("custo-desconhecido-mobile.png"), fullPage: true });
});

test("integridade venda: resposta perdida, payload conflitante, retry e cancelamento persistente", async ({ page }, info) => {
  await entrar(page);
  const produto = await (await page.request.post(`${api}/api/produtos`, { headers: { "X-Nexo-Organizacao": String(orgA) }, data: { nome: "Venda repetível", precoVenda: 50, ingredientes: [{ nome: "Referência", precoCompra: 20, quantidadeCompra: 1, unidadeCompra: "kg", quantidadeUsada: 100, unidadeUso: "g" }] } })).json();
  const chaves: string[] = [];
  let primeira = true;
  let vendaId = 0;
  await page.route("**/api/vendas", async route => {
    if (route.request().method() !== "POST") return route.continue();
    chaves.push(route.request().headers()["idempotency-key"]);
    expect(route.request().headers()["x-nexo-organizacao"]).toBe(String(orgA));
    const resposta = await route.fetch();
    if (primeira) {
      primeira = false;
      expect(resposta.status()).toBe(201);
      vendaId = (await resposta.json()).id;
      return route.abort("failed"); // Servidor já confirmou; a resposta não chega à tela.
    }
    return route.fulfill({ response: resposta });
  });
  await page.goto("/vendas/nova");
  await page.getByLabel("Produto", { exact: true }).selectOption(String(produto.id));
  await page.getByLabel("Quantidade", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Registrar venda", exact: true }).click();
  await expect(page.getByText(/Não foi possível conectar ao servidor/)).toBeVisible();
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue("2");
  await page.getByLabel("Quantidade", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Registrar venda", exact: true }).click();
  await expect(page.getByText(/Este envio já foi usado para outra venda/)).toBeVisible();
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue("3");
  await page.getByLabel("Quantidade", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Registrar venda", exact: true }).dblclick();
  await expect(page).toHaveURL(/\/vendas$/);
  expect(chaves.length).toBeGreaterThanOrEqual(3);
  expect(new Set(chaves).size).toBe(1);
  const lista = await (await page.request.get(`${api}/api/vendas`, { headers: { "X-Nexo-Organizacao": String(orgA) } })).json();
  expect(lista).toHaveLength(1); expect(lista[0].id).toBe(vendaId); expect(lista[0].totalVenda).toBe(100);
  await page.goto(`/vendas/${vendaId}`);
  await page.getByRole("button", { name: "Cancelar venda", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Cancelar venda", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Cancelar venda", exact: true }).click();
  await page.getByLabel("Motivo do cancelamento", { exact: true }).fill("😀😀");
  await page.getByRole("button", { name: "Confirmar cancelamento", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("pelo menos 3 caracteres");
  const { default: AxeCancelamento } = await import("@axe-core/playwright");
  expect((await new AxeCancelamento({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel("Motivo do cancelamento", { exact: true }).fill("Quantidade registrada incorretamente");
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: info.outputPath("cancelamento-confirmacao-mobile.png"), fullPage: false });
  await page.getByRole("button", { name: "Confirmar cancelamento", exact: true }).dblclick();
  await expect(page.getByLabel("Venda cancelada", { exact: true })).toContainText("Quantidade registrada incorretamente");
  await page.reload();
  await expect(page.getByLabel("Venda cancelada", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("venda-cancelada-mobile.png"), fullPage: true });
  const atual = await (await page.request.get(`${api}/api/vendas/${vendaId}`, { headers: { "X-Nexo-Organizacao": String(orgA) } })).json();
  expect(atual.status).toBe("cancelada"); expect(atual.canceladoPor).toBeGreaterThan(0); expect(atual.canceladoEm).toBeTruthy(); expect(atual.itens).toHaveLength(1);
  const resumo = await (await page.request.get(`${api}/api/financeiro/resumo`, { headers: { "X-Nexo-Organizacao": String(orgA) } })).json();
  expect(resumo.movimentacoes.filter((m: { origem: string }) => m.origem === "venda")).toHaveLength(0);
  const relatorio = await (await page.request.get(`${api}/api/relatorios/resumo`, { headers: { "X-Nexo-Organizacao": String(orgA) } })).json();
  expect(relatorio.faturamento).toBe(0); expect(relatorio.produtosMaisVendidos).toHaveLength(0);
  await page.goto("/vendas");
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(page.locator(".summary-card").filter({ hasText: "Faturamento" })).toContainText(/R\$\s*0,00/);
});

test("integridade operação: espaço e privacidade em cadastros, detalhes e edições no mobile", async ({ page }, info) => {
  test.setTimeout(180_000);
  await entrar(page);
  const headers = { "X-Nexo-Organizacao": String(orgA) };
  const produto = await (await page.request.post(`${api}/api/produtos`, { headers, data: { nome: "Produto de contexto", precoVenda: 15, ingredientes: [] } })).json();
  const cliente = await (await page.request.post(`${api}/api/clientes`, { headers, data: { nome: "Cliente sintético de contexto" } })).json();
  const despesa = await (await page.request.post(`${api}/api/despesas`, { headers, data: { descricao: "Despesa explícita de contexto", valor: 4, categoria: "Outros", dataDespesa: "2026-10-10", formaPagamento: "pix" } })).json();
  const venda = await (await page.request.post(`${api}/api/vendas`, { headers: { ...headers, "Idempotency-Key": crypto.randomUUID() }, data: { formaPagamento: "pix", itens: [{ produtoId: produto.id, quantidade: 1 }] } })).json();
  expect(produto.id).toBeGreaterThan(0); expect(cliente.id).toBeGreaterThan(0); expect(despesa.id).toBeGreaterThan(0); expect(venda.id).toBeGreaterThan(0);
  const rotas = ["/vendas", "/vendas/nova", `/vendas/${venda.id}`, "/produtos", "/produtos/novo", `/produtos/${produto.id}`, `/produtos/${produto.id}/editar`, "/clientes", "/clientes/novo", `/clientes/${cliente.id}`, `/clientes/${cliente.id}/editar`, "/despesas", "/despesas/nova", `/despesas/${despesa.id}`, `/despesas/${despesa.id}/editar`];
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const width of [1440, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const rota of rotas) {
      await page.goto(rota);
      await expect(page.locator(".workspace-context")).toContainText("Integridade A");
      await expect(page.getByRole("button", { name: "Ocultar valores", exact: true })).toBeVisible();
      await expect(page.locator("main h1")).not.toBeEmpty();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if ((width === 1440 || width === 390) && rota === "/vendas/nova") {
        await expect(page.getByLabel("Produto", { exact: true })).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await page.screenshot({ path: info.outputPath(`nova-venda-contexto-${width}.png`), fullPage: true, animations: "disabled" });
      }
      if (width === 390 && rota === "/produtos/novo") await page.screenshot({ path: info.outputPath("novo-produto-contexto-mobile.png"), fullPage: true, animations: "disabled" });
    }
  }
});

test("integridade privacidade: pergunta e resposta documental protegidas sem alterar arquivo ou revogar envio", async ({ page }, info) => {
  await entrar(page);
  await page.route("**/api/ia/status", route => route.fulfill({ json: { configurada: true } }));
  let liberar!: () => void;
  const pausa = new Promise<void>(resolve => { liberar = resolve; });
  let receber!: () => void;
  const chegou = new Promise<void>(resolve => { receber = resolve; });
  let pedido: { pergunta: string; autorizado: boolean; documentoId: number } | undefined;
  await page.route("**/api/ia/documento", async route => {
    expect(route.request().headers()["x-nexo-organizacao"]).toBe(String(orgA));
    pedido = route.request().postDataJSON(); receber(); await pausa;
    return route.fulfill({ json: { resposta: "Receitas de R$ 8.500,00 e despesas de R$ 125,00. Resposta sintética para validar a exibição.", modelo: "sintetico" } });
  });
  const conteudo = Buffer.from("Receita R$ 8.500,00\nDespesa R$ 125,00\n");
  await page.goto("/documentos");
  await page.getByLabel("Arquivo", { exact: true }).setInputFiles({ name: "integridade.txt", mimeType: "text/plain", buffer: conteudo });
  await page.getByRole("button", { name: "Salvar documento", exact: true }).click();
  await page.getByRole("button", { name: "Analisar com IA", exact: true }).click();
  await page.getByLabel("O que você quer entender?", { exact: true }).fill("Explique a despesa de R$ 125,00");
  await page.getByRole("checkbox", { name: /Tenho autorização para enviar/ }).check();
  await page.getByRole("button", { name: "Analisar documento", exact: true }).click();
  await chegou;
  await page.getByRole("button", { name: "Ocultar valores", exact: true }).click();
  liberar();
  const analise = page.getByRole("region", { name: "Análise de documento", exact: true });
  await expect(analise.getByText("Resposta protegida.", { exact: false })).toBeVisible();
  await expect(analise).toContainText("Pergunta protegida pelo modo de privacidade");
  await expect(analise).not.toContainText(/8\.500|125,00/);
  await expect(page.getByLabel("O que você quer entender?", { exact: true })).toHaveCount(0);
  await expect(analise).toContainText("Não altera o arquivo original nem revoga conteúdo já enviado");
  expect(pedido?.pergunta).toBe("Explique a despesa de R$ 125,00"); expect(pedido?.autorizado).toBe(true);
  const original = await page.request.get(`${api}/api/documentos/${pedido!.documentoId}/arquivo`, { headers: { "X-Nexo-Organizacao": String(orgA) } });
  expect((await original.body()).equals(conteudo)).toBe(true);
  await page.setViewportSize({ width: 390, height: 900 });
  await analise.screenshot({ path: info.outputPath("documento-privacidade-mobile.png"), animations: "disabled" });
  await analise.getByRole("button", { name: "Revelar valores para editar", exact: true }).click();
  await expect(page.getByLabel("O que você quer entender?", { exact: true })).toHaveValue("Explique a despesa de R$ 125,00");
  await expect(analise).toContainText("Receitas de R$ 8.500,00");
  await page.getByRole("button", { name: "Ocultar valores", exact: true }).click();
  await expect(analise).not.toContainText(/8\.500|125,00/);
});
