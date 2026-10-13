import { test, expect, Page } from "@playwright/test";

const emails = process.env.NEXO_E2E_EMAILS?.split(",") ?? [];
const api = process.env.NEXO_E2E_API_URL;
test.beforeEach(async () => {
  if (!api || emails.length < 8)
    throw new Error(
      "Execute pelo teste AssinaturaBrowserTest, com PostgreSQL exclusivo de teste.",
    );
  // NEXT_PUBLIC_API_URL aponta diretamente ao Spring isolado: CORS e cookies são reais.
});
async function login(page: Page, indice: number) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(emails[indice]);
  await page.getByLabel("Senha", { exact: true }).fill("Assinatura-Teste123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/empresa$/);
}
async function atual(page: Page, plano: string) {
  await page.goto("/planos");
  await expect(
    page
      .getByRole("article", { name: `Plano ${plano}`, exact: true })
      .getByRole("button", { name: "Plano atual", exact: true }),
  ).toBeDisabled();
}
async function mudar(page: Page, plano: string, downgrade = false) {
  await page
    .getByRole("article", { name: `Plano ${plano}`, exact: true })
    .getByRole("link", {
      name: downgrade ? "Fazer downgrade" : "Fazer upgrade",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Total simulado:", { exact: false }),
  ).toBeVisible();
  if (downgrade) {
    await expect(
      page.getByText("Seus dados existentes serão mantidos.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("checkbox", { name: "Entendi a mudança e quero continuar" })
      .check();
  }
  if (plano !== "Free")
    await page.getByRole("radio", { name: "Pix", exact: true }).check();
  await page
    .getByRole("button", {
      name: downgrade ? "Confirmar downgrade" : "Confirmar pagamento simulado",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: `Plano atualizado para ${plano}.`,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao sistema" }).click();
  await expect(
    page.getByRole("heading", { name: "Minha assinatura", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: plano, exact: true }),
  ).toBeVisible();
}
async function semOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("seis transições, persistência após reload e novo login", async ({
  page,
}) => {
  await login(page, 0);
  for (const [origem, destino, downgrade] of [
    ["Free", "Pro", false],
    ["Pro", "Business", false],
    ["Business", "Pro", true],
    ["Pro", "Free", true],
    ["Free", "Business", false],
    ["Business", "Free", true],
  ] as const) {
    await atual(page, origem);
    await mudar(page, destino, downgrade);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: destino, exact: true }),
    ).toBeVisible();
  }
  await atual(page, "Free");
  await mudar(page, "Pro");
  await page.evaluate(async (origem) => {
    await fetch(`${origem}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  }, api!);
  await login(page, 0);
  await atual(page, "Pro");
});

test("recusa, cancelamento, erro e reenvio seguro", async ({ page }) => {
  await login(page, 1);
  await atual(page, "Free");
  await page.goto("/checkout?plano=pro");
  await page.getByRole("radio", { name: "Cartão", exact: true }).check();
  expect(await page.locator("input[type=password]").count()).toBe(0);
  await page.getByLabel("Resultado da simulação").selectOption("recusado");
  await page
    .getByRole("button", { name: "Confirmar pagamento simulado" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Pagamento simulado recusado. Seu plano não foi alterado.",
    }),
  ).toBeVisible();
  await atual(page, "Free");
  await page.goto("/checkout?plano=business");
  await page.getByRole("button", { name: "Cancelar e voltar" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Checkout cancelado. Seu plano não foi alterado.",
    }),
  ).toBeVisible();
  await atual(page, "Free");
  await page.goto("/checkout?plano=pro");
  await page.getByLabel("Resultado da simulação").selectOption("erro");
  await page
    .getByRole("button", { name: "Confirmar pagamento simulado" })
    .click();
  await expect(page.locator('main [role="alert"]')).toContainText(
    "Tente novamente",
  );
  await page.getByLabel("Resultado da simulação").selectOption("aprovado");
  await page.getByRole("radio", { name: "Boleto", exact: true }).check();
  await page
    .getByRole("button", { name: "Confirmar pagamento simulado" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Plano atualizado para Pro." }),
  ).toBeVisible();
});

test("limites por plano, cancelamento da assinatura e links essenciais", async ({
  page,
}) => {
  await login(page, 2);
  await page.goto("/metas");
  await expect(
    page.getByRole("link", { name: "Ver planos", exact: true }),
  ).toBeVisible();
  await atual(page, "Free");
  await mudar(page, "Pro");
  await page.goto("/metas");
  await expect(
    page.getByRole("heading", { name: "Metas e comparativos", exact: true }),
  ).toBeVisible();
  await atual(page, "Pro");
  await mudar(page, "Business");
  await page.goto("/equipe");
  await expect(
    page.locator(".member-info").getByText("Pessoa Teste", { exact: true }),
  ).toBeVisible();
  await page.goto("/conta/assinatura");
  await page.getByRole("link", { name: "Solicitar cancelamento" }).click();
  await page
    .getByRole("checkbox", { name: "Entendi a mudança e quero continuar" })
    .check();
  await page
    .getByRole("button", { name: "Confirmar cancelamento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Assinatura cancelada. Seu plano agora é Free.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao sistema" }).click();
  await expect(
    page.getByText("Plano atual · Cancelada", { exact: true }),
  ).toBeVisible();
  for (const rota of [
    "/produtos",
    "/clientes",
    "/vendas",
    "/despesas",
    "/relatorios",
    "/conta",
    "/ia",
    "/fluxo-caixa",
    "/pessoal",
    "/empresa",
  ]) {
    const resposta = await page.goto(rota);
    expect(resposta?.status(), rota).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByText("Application error", { exact: false }),
    ).toHaveCount(0);
  }
});

test("destino inválido e clique duplicado não criam promoção indevida", async ({
  page,
}) => {
  await login(page, 3);
  await page.goto("/checkout?plano=premium");
  await expect(page.locator('main [role="alert"]')).toContainText(
    "Escolha um plano válido",
  );
  await atual(page, "Free");
  await page.goto("/checkout?plano=pro");
  const confirmar = page.getByRole("button", {
    name: "Confirmar pagamento simulado",
  });
  await expect(confirmar).toBeVisible();
  let envios = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/confirmar")) envios++;
  });
  await confirmar.evaluate((botao: HTMLButtonElement) => {
    botao.click();
    botao.click();
  });
  await expect(
    page.getByRole("heading", { name: "Plano atualizado para Pro." }),
  ).toBeVisible();
  expect(envios).toBe(1);
  await page.getByRole("link", { name: "Voltar ao sistema" }).click();
  await expect(page.locator(".subscription-history li")).toHaveCount(1);
});

for (const [indice, largura, altura, nome] of [
  [4, 390, 844, "celular"],
  [5, 768, 1024, "tablet"],
  [6, 1440, 900, "desktop"],
] as const) {
  test(`planos, checkout e assinatura utilizáveis em ${nome}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: largura, height: altura });
    await login(page, indice);
    await atual(page, "Free");
    await semOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("planos.png"),
      fullPage: true,
    });
    await page
      .getByRole("article", { name: "Plano Pro", exact: true })
      .getByRole("link", { name: "Fazer upgrade" })
      .click();
    await expect(
      page.getByRole("radio", { name: "Pix", exact: true }),
    ).toBeVisible();
    await semOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("checkout.png"),
      fullPage: true,
    });
    await page.getByRole("radio", { name: "Cartão", exact: true }).focus();
    await expect(
      page.getByRole("radio", { name: "Cartão", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("radio", { name: "Cartão", exact: true }),
    ).toBeChecked();
    await page
      .getByRole("button", { name: "Confirmar pagamento simulado" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Plano atualizado para Pro." }),
    ).toBeVisible();
    await semOverflow(page);
    await page.getByRole("link", { name: "Voltar ao sistema" }).click();
    await expect(
      page.getByRole("heading", { name: "Pro", exact: true }),
    ).toBeVisible();
    await semOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("assinatura.png"),
      fullPage: true,
    });
  });
}

test("finanças, Pro, Business, convite, documentos e downgrade preservam dados", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await login(page, 7);
  await page.goto("/empresa");
  await page.getByLabel("Novo nome").fill("Ateliê de demonstração");
  await page.getByRole("button", { name: "Salvar nome", exact: true }).click();
  await expect(page.getByText("Nome do espaço atualizado.")).toBeVisible();
  await page.goto("/pessoal");
  for (const [tipo, descricao, valor] of [
    ["receita", "Projeto entregue", "2500"],
    ["despesa", "Material de trabalho", "350"],
  ]) {
    await page
      .getByRole("button", { name: "+ Novo lançamento", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Novo lançamento", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Tipo", { exact: true }).selectOption(tipo);
    await page.getByLabel("Descrição", { exact: true }).fill(descricao);
    await page.getByLabel("Valor (R$)", { exact: true }).fill(valor);
    await page
      .getByRole("button", { name: "Salvar lançamento", exact: true })
      .click();
    await expect(
      page.getByText(descricao, { exact: false }).first(),
    ).toBeVisible();
  }
  await page.reload();
  await expect(page.locator(".finance-table tbody tr")).toHaveCount(2);
  await page.goto("/");
  await expect(page.locator(".balance-card")).toContainText("2.150,00");
  await page.screenshot({
    path: testInfo.outputPath("dashboard-free.png"),
    fullPage: true,
  });
  await atual(page, "Free");
  await mudar(page, "Pro");
  await page.goto("/metas");
  await page.getByRole("button", { name: "+ Nova meta", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Reserva do ateliê");
  await page.getByLabel("Valor da meta", { exact: true }).fill("10000");
  await page.getByRole("button", { name: "Criar meta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reserva do ateliê" }),
  ).toBeVisible();
  await page.getByLabel("Atualizar progresso").fill("2500");
  await page
    .getByRole("button", { name: "Salvar progresso", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "25",
  );
  await page.goto("/fluxo-caixa");
  await expect(
    page.getByRole("img", { name: "Evolução diária do saldo acumulado" }),
  ).toBeVisible();
  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar CSV", exact: true }).click(),
  ]);
  expect(csv.suggestedFilename()).toMatch(/nexo-movimentacoes/);
  await page.screenshot({
    path: testInfo.outputPath("fluxo-pro.png"),
    fullPage: true,
  });
  await page.goto("/ia");
  await expect(
    page.getByText("A configuração ainda precisa ser concluída", {
      exact: false,
    }),
  ).toBeVisible();
  await atual(page, "Pro");
  await mudar(page, "Business");
  await page.goto("/documentos");
  await page
    .getByLabel("Arquivo", { exact: true })
    .setInputFiles({
      name: "resumo.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Receitas: 2500. Despesas: 350."),
    });
  await page.getByLabel("Descrição (opcional)").fill("Resumo para a equipe");
  await page
    .getByRole("button", { name: "Salvar documento", exact: true })
    .click();
  await expect(page.getByText("resumo.txt", { exact: true })).toBeVisible();
  const [arquivo] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar", exact: true }).click(),
  ]);
  expect(arquivo.suggestedFilename()).toBe("resumo.txt");
  await page.goto("/equipe");
  await page.getByLabel("E-mail da pessoa").fill(emails[8]);
  await page
    .getByRole("button", { name: "Criar convite", exact: true })
    .click();
  const link = await page
    .getByRole("textbox", { name: "Link do convite" })
    .inputValue();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("equipe-business.png"),
    fullPage: true,
  });
  await page.evaluate(async (origem) => {
    await fetch(`${origem}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  }, api!);
  await login(page, 8);
  await page.goto("/pessoal");
  await expect(
    page.getByText("Um bom começo é registrar o primeiro movimento"),
  ).toBeVisible();
  await page.goto(link);
  await expect(
    page.getByRole("button", { name: "Aceitar convite", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Aceitar convite", exact: true })
    .click();
  await expect(page).toHaveURL(/\/empresa$/);
  await expect(page.locator(".workspace-bar")).toContainText(
    "Ateliê de demonstração",
  );
  await page.goto("/pessoal");
  await expect(page.locator(".finance-table tbody tr")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await page.goto("/equipe");
  await expect(
    page.getByRole("button", { name: "Criar convite", exact: true }),
  ).toHaveCount(0);
  await page.goto("/conta/assinatura");
  await expect(
    page.getByRole("link", { name: "Solicitar cancelamento", exact: true }),
  ).toHaveCount(0);
  await page.goto("/documentos");
  await expect(
    page.getByRole("button", { name: "Salvar documento", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("resumo.txt", { exact: true })).toBeVisible();
  await page.evaluate(async (origem) => {
    await fetch(`${origem}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  }, api!);
  await login(page, 7);
  await atual(page, "Business");
  await mudar(page, "Free", true);
  await page.goto("/documentos");
  await expect(
    page.getByRole("heading", {
      name: "Mantenha os arquivos perto da operação",
    }),
  ).toBeVisible();
  await page.goto("/pessoal");
  await expect(page.locator(".finance-table tbody tr")).toHaveCount(2);
  await page.evaluate(async (origem) => {
    await fetch(`${origem}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  }, api!);
  await login(page, 8);
  await page.getByRole("button", { name: /^Ateliê de demonstração/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Acesso compartilhado suspenso",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Abrir meus espaços", exact: true })
    .click();
  await page.getByRole("button", { name: /^Organização sintética/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Um bom começo é registrar o primeiro movimento",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(async (origem) => {
    await fetch(`${origem}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  }, api!);
  await login(page, 7);
  await atual(page, "Free");
  await mudar(page, "Business");
  await page.goto("/documentos");
  await expect(page.getByText("resumo.txt", { exact: true })).toBeVisible();
  await page.goto("/equipe");
  await expect(
    page
      .locator(".member-row")
      .filter({
        has: page.getByRole("button", { name: "Remover", exact: true }),
      }),
  ).toHaveCount(1);
  for (const [largura, altura, nome] of [
    [1440, 900, "desktop"],
    [1280, 800, "desktop-1280"],
    [1024, 768, "notebook"],
    [768, 1024, "tablet"],
    [430, 932, "mobile-430"],
    [390, 844, "mobile"],
    [360, 800, "mobile-360"],
  ] as const) {
    await page.setViewportSize({ width: largura, height: altura });
    for (const rota of [
      "/",
      "/pessoal",
      "/fluxo-caixa",
      "/metas",
      "/equipe",
      "/documentos",
      "/conta",
      "/produtos",
      "/clientes",
      "/vendas",
      "/despesas",
      "/relatorios",
      "/empresa",
      "/ia",
    ]) {
      await page.goto(rota);
      await expect(page.locator("main")).toBeVisible();
      await expect(
        page.locator(largura <= 900 ? ".mobile-nav-bar" : ".sidebar"),
      ).toBeVisible();
      await expect(page.getByText(/^Carregando/)).toHaveCount(0);
      await expect(
        page.getByText("Carregando seu espaço…", { exact: true }),
      ).toHaveCount(0);
      await semOverflow(page);
      await page.waitForTimeout(350);
      await page.screenshot({
        path: testInfo.outputPath(
          `${nome}-${rota.replaceAll("/", "") || "dashboard"}.png`,
        ),
        fullPage: true,
      });
    }
  }
});

test("cadastro, confirmação, onboarding pessoal e recuperação mantêm o acesso", async ({
  page,
}) => {
  const { readFileSync } = await import("node:fs");
  const email = `cadastro-${crypto.randomUUID()}@example.com`;
  async function codigoRecebido(assunto: string) {
    let codigo = "";
    await expect
      .poll(
        () => {
          try {
            const mensagens = JSON.parse(
              readFileSync(process.env.NEXO_E2E_EMAIL_INBOX!, "utf8"),
            ) as Record<string, string>;
            codigo =
              mensagens[`${email}|${assunto} — Nexo`]?.match(
                /\b\d{6}\b/,
              )?.[0] ?? "";
            return codigo.length === 6;
          } catch {
            return false;
          }
        },
        {
          message:
            "O provider local do teste precisa receber a mensagem sintética.",
        },
      )
      .toBe(true);
    return codigo;
  }
  await page.goto("/cadastro");
  await page
    .getByLabel("Seu nome", { exact: true })
    .fill("Cadastro de demonstração");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("Cadastro-Forte123!@#");
  await page
    .getByLabel("Confirme a senha", { exact: true })
    .fill("Cadastro-Forte123!@#");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page).toHaveURL(/\/verificar-codigo\?/);
  await page
    .getByLabel("Código de 6 dígitos", { exact: true })
    .fill(await codigoRecebido("Confirme seu e-mail"));
  await page
    .getByRole("button", { name: "Confirmar código", exact: true })
    .click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page
    .getByRole("button", { name: /^Quero cuidar das minhas finanças pessoais/ })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: /Controlar gastos/ }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Entrar no Nexo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pessoal$/);
  await page.goto("/conta");
  await expect(
    page.getByText("Controlar gastos", { exact: true }),
  ).toBeVisible();
  await page.goto("/onboarding");
  await expect(
    page.getByRole("button", {
      name: /^Quero cuidar das minhas finanças pessoais/,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Controlar gastos/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(async (origem) => {
    await fetch(`${origem}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  }, api!);
  await page.goto("/esqueci-senha");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Enviar código de recuperação", exact: true })
    .click();
  await expect(page).toHaveURL(/\/recuperar-senha\?/);
  await page
    .getByLabel("Código de 6 dígitos", { exact: true })
    .fill(await codigoRecebido("Recupere sua senha"));
  await page
    .getByRole("button", { name: "Confirmar código", exact: true })
    .click();
  await expect(page).toHaveURL(/\/redefinir-senha$/);
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("NovaSenha-Forte123!@#");
  await page
    .getByLabel("Confirme a senha", { exact: true })
    .fill("NovaSenha-Forte123!@#");
  await page
    .getByRole("button", { name: "Atualizar senha", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Senha atualizada", exact: true }),
  ).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("NovaSenha-Forte123!@#");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/pessoal$/);
});

test("membro legado cria espaço próprio sem assumir a empresa", async ({
  page,
}) => {
  await login(page, 12);
  await page
    .getByRole("button", { name: "Criar meu espaço pessoal", exact: true })
    .click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page
    .getByRole("button", { name: /^Quero cuidar das minhas finanças pessoais/ })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Entrar no Nexo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pessoal$/);
  await expect(page.locator(".workspace-bar")).toContainText("Meu espaço");
  await page.goto("/empresa");
  await page.getByRole("button", { name: /^Organização sintética/ }).click();
  await page.goto("/conta/assinatura");
  await expect(
    page.getByRole("link", { name: "Solicitar cancelamento", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Business", exact: true }),
  ).toBeVisible();
});

test("polish em sete larguras, drawer, teclado, gráfico e movimento reduzido", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await login(page, 7);
  const larguras = [1440, 1280, 1024, 768, 430, 390, 360];
  for (const largura of larguras) {
    await page.setViewportSize({ width: largura, height: 900 });
    for (const rota of ["/planos", "/checkout?plano=pro", "/onboarding"]) {
      await page.goto(rota);
      if (rota.startsWith("/checkout"))
        await expect(
          page.getByRole("radio", { name: "Pix", exact: true }),
        ).toBeVisible();
      if (rota === "/planos")
        await expect(
          page
            .getByRole("article", { name: "Plano Business", exact: true })
            .getByRole("button", { name: "Plano atual" }),
        ).toBeDisabled();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
      await semOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(
          `${largura}-${rota.split("?")[0].slice(1)}.png`,
        ),
        fullPage: true,
      });
    }
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Visão geral", exact: true }),
    ).toBeVisible();
    if (largura <= 900) {
      const abrir = page.getByRole("button", {
        name: "Abrir menu",
        exact: true,
      });
      await abrir.click();
      const menu = page.getByRole("dialog", { name: "Navegação do Nexo" });
      await expect(menu).toBeVisible();
      await page.waitForTimeout(350);
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        expect(
          await menu.evaluate((e) => e.contains(document.activeElement)),
        ).toBe(true);
      }
      await page.screenshot({
        path: testInfo.outputPath(`${largura}-menu.png`),
      });
      await page.keyboard.press("Escape");
      await expect(menu).not.toBeVisible();
      await expect(abrir).toBeFocused();
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    }
  }
  await page.goto("/fluxo-caixa");
  const dia = page.getByRole("slider", { name: "Dia no gráfico" });
  await expect(dia).toBeVisible();
  const anterior = await dia.inputValue();
  await dia.focus();
  await page.keyboard.press("ArrowLeft");
  expect(await dia.inputValue()).not.toBe(anterior);
  await page.getByText("Ver valores por dia", { exact: true }).click();
  await expect(page.locator(".chart-data table")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/metas");
  await expect(page.locator(".pro-goal-card")).toBeVisible();
  expect(
    await page
      .locator(".content")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".premium-progress > span")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Quero usar em uma empresa maior/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("telas de acesso em sete larguras e estados visuais da IA sem serviço externo", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  for (const largura of [1440, 1280, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width: largura, height: 900 });
    for (const rota of [
      "/login",
      "/cadastro",
      "/esqueci-senha",
      "/verificar-codigo",
      "/recuperar-senha",
      "/redefinir-senha",
    ]) {
      await page.goto(rota);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
      await semOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`${largura}-${rota.slice(1)}.png`),
        fullPage: true,
      });
    }
  }
  await login(page, 7);
  // Fixtures somente para apresentação de disponibilidade, loading e resposta; nenhuma chave externa.
  await page.route("**/api/ia/status", (route) =>
    route.fulfill({ json: { configurada: true } }),
  );
  let responder: (() => void) | undefined;
  await page.route("**/api/ia/perguntar", async (route) => {
    await new Promise<void>((resolve) => {
      responder = resolve;
    });
    await route.fulfill({
      json: {
        resposta:
          "Orientação sintética de teste.\nRevise seus custos e acompanhe o saldo.",
      },
    });
  });
  await page.goto("/ia");
  await expect(
    page.getByRole("heading", { name: "Qual decisão você quer entender?" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Como calcular a margem de um produto?",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Sua pergunta", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Perguntar ao assistente" }).click();
  await expect(
    page.getByText("Preparando uma orientação…", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("ia-carregando.png"),
    fullPage: true,
  });
  await expect.poll(() => Boolean(responder)).toBe(true);
  responder!();
  await expect(
    page.getByRole("heading", { name: "Uma orientação para você" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("ia-resposta.png"),
    fullPage: true,
  });
  await page.unrouteAll({ behavior: "wait" });
  await page.goto("/documentos");
  await expect(
    page.getByRole("heading", { name: "Adicionar documento" }),
  ).toBeVisible();
  const arquivo = await page.evaluateHandle(() => {
    const lista = new DataTransfer();
    lista.items.add(
      new File(["Documento sintético de teste"], "arrastado.txt", {
        type: "text/plain",
      }),
    );
    return lista;
  });
  await page
    .locator(".upload-zone")
    .dispatchEvent("drop", { dataTransfer: arquivo });
  await expect(page.locator(".upload-selection")).toContainText(
    "arrastado.txt",
  );
  expect(
    await page
      .getByLabel("Arquivo", { exact: true })
      .evaluate((e) => (e as HTMLInputElement).files?.[0]?.name),
  ).toBe("arrastado.txt");
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await expect(
    page.locator(".document-row").filter({ hasText: "arrastado.txt" }),
  ).toBeVisible();
});

test("acessibilidade WCAG nas telas principais em desktop e celular", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const largura of [1440, 390]) {
    await page.setViewportSize({ width: largura, height: 900 });
    for (const rota of [
      "/login",
      "/cadastro",
      "/esqueci-senha",
      "/verificar-codigo",
      "/recuperar-senha",
      "/redefinir-senha",
    ]) {
      await page.goto(rota);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect
        .soft(
          resultado.violations.map((v) => ({
            id: v.id,
            alvos: v.nodes.map((n) => n.target),
          })),
          `${largura}px ${rota}`,
        )
        .toEqual([]);
    }
    await login(page, 7);
    for (const rota of [
      "/",
      "/pessoal",
      "/fluxo-caixa",
      "/metas",
      "/equipe",
      "/documentos",
      "/conta",
      "/empresa",
      "/ia",
      "/relatorios",
      "/produtos",
      "/clientes",
      "/vendas",
      "/despesas",
      "/planos",
      "/checkout?plano=pro",
      "/onboarding",
    ]) {
      await page.goto(rota);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/^Carregando/)).toHaveCount(0);
      const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect
        .soft(
          resultado.violations.map((v) => ({
            id: v.id,
            alvos: v.nodes.map((n) => n.target),
          })),
          `${largura}px ${rota}`,
        )
        .toEqual([]);
    }
  }
});
