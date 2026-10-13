import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    actionTimeout: 20_000,
    launchOptions: process.env.NEXO_BROWSER_EXECUTABLE ? { executablePath: process.env.NEXO_BROWSER_EXECUTABLE, args: ["--no-sandbox"] } : {},
  },
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1",
    url: "http://localhost:3000/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
