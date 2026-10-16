import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

process.env.GAME_TEST_PASSWORD ||= randomBytes(24).toString("base64url");
process.env.GAME_TEST_DATA_DIR ||= mkdtempSync(
  join(tmpdir(), "tamquoc-tests-"),
);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  projects: [
    { name: "game", testMatch: /(?:game|combo)\.spec\.js$/ },
    {
      name: "admin",
      testMatch: /admin\.spec\.js$/,
      dependencies: ["game"],
      fullyParallel: false,
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:5174",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5174",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    env: {
      API_PORT: "3002",
      GAME_DATA_DIR: process.env.GAME_TEST_DATA_DIR,
      ADMIN_USERNAME: "testadmin",
      ADMIN_PASSWORD: process.env.GAME_TEST_PASSWORD,
    },
  },
});
