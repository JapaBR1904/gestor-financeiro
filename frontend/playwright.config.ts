import { defineConfig } from "@playwright/test";

const porta = Number(process.env.NEXO_E2E_PORT ?? 3000);
if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) throw new Error("Porta de teste inválida.");
const origem = `http://localhost:${porta}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: origem,
    browserName: "chromium",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    actionTimeout: 20_000,
    launchOptions: process.env.NEXO_BROWSER_EXECUTABLE ? { executablePath: process.env.NEXO_BROWSER_EXECUTABLE, args: ["--no-sandbox"] } : {},
  },
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${porta}`,
    url: `${origem}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
