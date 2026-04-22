import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const testEnv = {
  DATABASE_URL: process.env.DATABASE_URL!,
  PORT: process.env.PORT!,
  CLIENT_URL: process.env.CLIENT_URL!,
  TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run --filter server dev:test",
      port: 3001,
      reuseExistingServer: !process.env.CI,
      env: testEnv,
    },
    {
      command: "bun run --filter client dev",
      port: 5174,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_PORT: process.env.VITE_PORT!,
        VITE_API_PORT: process.env.VITE_API_PORT!,
      },
    },
  ],
});
