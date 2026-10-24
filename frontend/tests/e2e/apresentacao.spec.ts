import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("apresentação: perfis por teclado, vídeo local e mobile sem acessar contas", async ({ page }, info) => {
  test.setTimeout(120_000);
  let api = 0;
  await page.route("**/api/**", (route) => { api++; return route.abort(); });
  await page.addInitScript(() => sessionStorage.setItem("nexo:brand-intro-seen", "1"));
  await page.goto("/");
  const seletor = page.getByRole("group", { name: "Escolha um perfil de demonstração" });
  await expect(seletor.getByRole("button", { name: "Para você", exact: true })).toHaveAttribute("aria-pressed", "true");
  const negocio = seletor.getByRole("button", { name: "Seu negócio", exact: true });
  await negocio.focus(); await page.keyboard.press("Enter");
  await expect(negocio).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Da primeira venda à visão do todo." })).toBeVisible();
  await expect(page.getByText("Não comprova recebimento", { exact: true })).toBeVisible();
  await seletor.getByRole("button", { name: "Sua equipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mais pessoas. O mesmo contexto." })).toBeVisible();
  await expect(page.getByText("3 de 10", { exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seletor.getByRole("button", { name: "Para você", exact: true }).click();
  expect(await page.locator(".nexo-preview-copy").evaluate(e => getComputedStyle(e).animationName)).toBe("none");
  for (const width of [1440, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (width === 1440 || width === 390) await page.locator(".nexo-showcase").screenshot({ path: info.outputPath(`apresentacao-${width}.png`), animations: "disabled" });
  }
  const video = page.locator(".nexo-film video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).not.toHaveAttribute("autoplay");
  // Somente mídia pública ilustrativa; nenhuma sessão ou API do produto é usada.
  await video.evaluate((element: HTMLVideoElement) => { element.preload = "auto"; element.load(); });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
  await video.evaluate((element: HTMLVideoElement) => element.play());
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0);
  await video.evaluate((element: HTMLVideoElement) => element.pause());
  await page.getByText("Ler a apresentação completa", { exact: true }).click();
  await expect(page.getByText(/faturamento não é lucro/)).toBeVisible();
  expect(api).toBe(0);
});
